import {
  InvoiceStatus,
  JobCreationPolicy,
  PaymentMethod,
  Prisma,
  DiscountType,
  QuoteStatus,
} from "@prisma/client";
import { prisma } from "@/server/db/client";
import { logger } from "@/lib/logger";
import {
  calculateLineTotal,
  calculateDocumentTotals,
} from "@/lib/calculations";
import {
  invoiceInputSchema,
  paymentInputSchema,
  type InvoiceInput,
} from "@/lib/schemas/invoices";
import { nextDocumentNumber } from "@/server/services/numbering";
import { ensureJobForInvoice, getJobCreationPolicy } from "@/server/services/jobs";
import {
  ensureStorage,
  saveInvoiceFile,
  deleteInvoiceFile,
  readInvoiceFile,
  fileInfo,
} from "@/server/files/storage";

function toDecimal(value: number | undefined | null) {
  if (value === undefined || value === null) return null;
  return String(Number.isFinite(value) ? value : 0);
}

function mapDiscount(type: InvoiceInput["discountType"]) {
  if (type === "PERCENT") return DiscountType.PERCENT;
  if (type === "FIXED") return DiscountType.FIXED;
  return DiscountType.NONE;
}

function mapLineDiscount(type: InvoiceInput["lines"][number]["discountType"]) {
  if (type === "PERCENT") return DiscountType.PERCENT;
  if (type === "FIXED") return DiscountType.FIXED;
  return DiscountType.NONE;
}

function computeTotals(payload: InvoiceInput) {
  const lineTotals = payload.lines.map((line) => ({
    total: calculateLineTotal({
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountType: line.discountType,
      discountValue: line.discountValue ?? 0,
    }),
  }));

  const docTotals = calculateDocumentTotals({
    lines: lineTotals,
    discountType: payload.discountType,
    discountValue: payload.discountValue ?? 0,
    shippingCost: payload.shippingCost ?? 0,
    taxRate: payload.taxRate ?? 0,
  });

  return {
    lineTotals,
    subtotal: docTotals.subtotal,
    total: docTotals.total,
    taxTotal: docTotals.tax,
    shippingCost: payload.shippingCost ?? 0,
  };
}

export async function listInvoices(options?: {
  q?: string;
  statuses?: ("PENDING" | "PAID" | "OVERDUE")[];
  limit?: number;
  offset?: number;
  sort?: "issueDate" | "dueDate" | "createdAt" | "number";
  order?: "asc" | "desc";
}) {
  const where: Prisma.InvoiceWhereInput = {};
  if (options?.q) {
    where.OR = [
      { number: { contains: options.q } },
      { client: { name: { contains: options.q } } },
    ];
  }
  if (options?.statuses && options.statuses.length) {
    where.status = { in: options.statuses };
  }
  const orderBy = options?.sort
    ? { [options.sort]: options.order ?? "desc" }
    : { issueDate: "desc" as const };
  const invoices = await prisma.invoice.findMany({
    where,
    orderBy,
    include: { client: { select: { name: true } } },
    take: options?.limit,
    skip: options?.offset,
  });

  return invoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    clientName: invoice.client.name,
    status: invoice.status,
    total: Number(invoice.total),
    balanceDue: Number(invoice.balanceDue),
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
  }));
}

export async function getInvoice(id: number) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      items: {
        orderBy: { orderIndex: "asc" },
        include: { productTemplate: true },
      },
      payments: {
        orderBy: { paidAt: "desc" },
      },
      attachments: true,
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  return invoice;
}

function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof (value as { toNumber?: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

export async function getInvoiceDetail(id: number) {
  const invoice = await getInvoice(id);

  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    client: {
      id: invoice.clientId,
      name: invoice.client.name,
    },
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    taxRate: invoice.taxRate ? decimalToNumber(invoice.taxRate) : 0,
    discountType: invoice.discountType,
    discountValue: decimalToNumber(invoice.discountValue),
    shippingCost: decimalToNumber(invoice.shippingCost),
    shippingLabel: invoice.shippingLabel ?? "",
    notes: invoice.notes ?? "",
    terms: invoice.terms ?? "",
    subtotal: decimalToNumber(invoice.subtotal),
    total: decimalToNumber(invoice.total),
    balanceDue: decimalToNumber(invoice.balanceDue),
    taxTotal: decimalToNumber(invoice.taxTotal),
    paidAt: invoice.paidAt,
    lines: invoice.items.map((item) => ({
      id: item.id,
      productTemplateId: item.productTemplateId ?? null,
      name: item.name,
      description: item.description ?? "",
      quantity: decimalToNumber(item.quantity),
      unit: item.unit ?? "",
      unitPrice: decimalToNumber(item.unitPrice),
      discountType: item.discountType,
      discountValue: decimalToNumber(item.discountValue),
      orderIndex: item.orderIndex,
      total: decimalToNumber(item.total),
      calculatorBreakdown: item.calculatorBreakdown as Record<
        string,
        unknown
      > | null,
    })),
    payments: invoice.payments.map((payment) => ({
      id: payment.id,
      amount: decimalToNumber(payment.amount),
      method: payment.method,
      reference: payment.reference ?? "",
      processor: payment.processor ?? "",
      processorId: payment.processorId ?? "",
      notes: payment.notes ?? "",
      paidAt: payment.paidAt,
    })),
    attachments: invoice.attachments.map((attachment) => ({
      id: attachment.id,
      filename: attachment.filename,
      filetype: attachment.filetype,
      size: attachment.size,
      uploadedAt: attachment.uploadedAt,
    })),
  };
}

export type InvoiceDetail = Awaited<ReturnType<typeof getInvoiceDetail>>;

export async function createInvoice(payload: unknown) {
  const parsed = invoiceInputSchema.parse(payload);
  const totals = computeTotals(parsed);

  const invoice = await prisma.$transaction(async (tx) => {
    const number = await nextDocumentNumber("invoice", tx);

    const created = await tx.invoice.create({
      data: {
        number,
        clientId: parsed.clientId,
        status: InvoiceStatus.PENDING,
        issueDate: parsed.issueDate ? new Date(parsed.issueDate) : new Date(),
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        taxRate: toDecimal(parsed.taxRate) ?? "0",
        discountType: mapDiscount(parsed.discountType),
        discountValue: toDecimal(parsed.discountValue) ?? "0",
        shippingCost: toDecimal(parsed.shippingCost) ?? "0",
        shippingLabel: parsed.shippingLabel || null,
        notes: parsed.notes || null,
        terms: parsed.terms || null,
        subtotal: String(totals.subtotal),
        total: String(totals.total),
        taxTotal: String(totals.taxTotal),
        balanceDue: String(totals.total),
        items: {
          create: parsed.lines.map((line, index) => ({
            productTemplateId: line.productTemplateId ?? undefined,
            name: line.name,
            description: line.description || null,
            quantity: String(line.quantity),
            unit: line.unit || null,
            unitPrice: String(line.unitPrice),
            discountType: mapLineDiscount(line.discountType),
            discountValue: toDecimal(line.discountValue) ?? "0",
            total: String(totals.lineTotals[index].total),
            orderIndex: line.orderIndex ?? index,
            calculatorBreakdown: line.calculatorBreakdown
              ? (line.calculatorBreakdown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          })),
        },
      },
      include: {
        client: true,
        items: true,
      },
    });

    await tx.activityLog.create({
      data: {
        clientId: created.clientId,
        invoiceId: created.id,
        action: "INVOICE_CREATED",
        message: `Invoice ${created.number} created`,
      },
    });

    return created;
  });

  logger.info({ scope: "invoices.create", data: { id: invoice.id } });

  const policy = await getJobCreationPolicy();
  if (policy === JobCreationPolicy.ON_INVOICE) {
    await ensureJobForInvoice(invoice.id);
  }

  return invoice;
}

export async function updateInvoice(id: number, payload: unknown) {
  const parsed = invoiceInputSchema.parse(payload);
  const totals = computeTotals(parsed);

  const invoice = await prisma.$transaction(async (tx) => {
    const updated = await tx.invoice.update({
      where: { id },
      data: {
        clientId: parsed.clientId,
        issueDate: parsed.issueDate ? new Date(parsed.issueDate) : undefined,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        taxRate: toDecimal(parsed.taxRate) ?? "0",
        discountType: mapDiscount(parsed.discountType),
        discountValue: toDecimal(parsed.discountValue) ?? "0",
        shippingCost: toDecimal(parsed.shippingCost) ?? "0",
        shippingLabel: parsed.shippingLabel || null,
        notes: parsed.notes || null,
        terms: parsed.terms || null,
        subtotal: String(totals.subtotal),
        total: String(totals.total),
        taxTotal: String(totals.taxTotal),
        balanceDue: String(totals.total),
        items: {
          deleteMany: {},
          create: parsed.lines.map((line, index) => ({
            productTemplateId: line.productTemplateId ?? undefined,
            name: line.name,
            description: line.description || null,
            quantity: String(line.quantity),
            unit: line.unit || null,
            unitPrice: String(line.unitPrice),
            discountType: mapLineDiscount(line.discountType),
            discountValue: toDecimal(line.discountValue) ?? "0",
            total: String(totals.lineTotals[index].total),
            orderIndex: line.orderIndex ?? index,
            calculatorBreakdown: line.calculatorBreakdown
              ? (line.calculatorBreakdown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          })),
        },
      },
      include: {
        client: true,
        payments: true,
        // Include current paidAt so we can preserve historical paid date on edits
        _count: { select: { payments: true } },
      },
    });

    const paidAmount = updated.payments.reduce(
      (sum, payment) => sum + decimalToNumber(payment.amount),
      0,
    );

    const rawBalance = decimalToNumber(updated.total) - paidAmount;
    const balance = Math.max(rawBalance, 0);
    const isZero = Math.abs(rawBalance) < 0.005; // tolerance for rounding

    const existingPaidAt = (
      await tx.invoice.findUnique({ where: { id }, select: { paidAt: true } })
    )?.paidAt ?? null;

    await tx.invoice.update({
      where: { id },
      data: {
        balanceDue: String(isZero ? 0 : balance),
        status:
          isZero
            ? InvoiceStatus.PAID
            : updated.status === InvoiceStatus.PAID
              ? InvoiceStatus.PENDING
              : updated.status,
        paidAt: isZero ? (existingPaidAt ?? new Date()) : null,
      },
    });

    await tx.activityLog.create({
      data: {
        clientId: updated.clientId,
        invoiceId: updated.id,
        action: "INVOICE_UPDATED",
        message: `Invoice ${updated.number} updated`,
      },
    });

    return updated;
  });

  logger.info({ scope: "invoices.update", data: { id } });

  return invoice;
}

export async function deleteInvoice(id: number) {
  const invoice = await prisma.$transaction(async (tx) => {
    const removed = await tx.invoice.delete({ where: { id } });

    await tx.activityLog.create({
      data: {
        clientId: removed.clientId,
        invoiceId: removed.id,
        action: "INVOICE_DELETED",
        message: `Invoice ${removed.number} deleted`,
      },
    });

    return removed;
  });

  logger.info({ scope: "invoices.delete", data: { id } });

  return invoice;
}

export async function addManualPayment(invoiceId: number, payload: unknown) {
  const parsed = paymentInputSchema.parse(payload);

  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, clientId: true, number: true, total: true },
    });
    if (!invoice) throw new Error("Invoice not found");

    const created = await tx.payment.create({
      data: {
        invoiceId,
        amount: String(parsed.amount),
        method: parsed.method as PaymentMethod,
        reference: parsed.reference || null,
        processor: parsed.processor || null,
        processorId: parsed.processorId || null,
        notes: parsed.notes || null,
        paidAt: parsed.paidAt ? new Date(parsed.paidAt) : new Date(),
      },
    });

    const payments = await tx.payment.findMany({ where: { invoiceId } });
    const paidAmount = payments.reduce(
      (sum, item) => sum + decimalToNumber(item.amount),
      0,
    );
    const total = decimalToNumber(invoice.total);
    const balance = Math.max(total - paidAmount, 0);
    const isPaid = balance <= 0;

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        balanceDue: String(balance),
        status: isPaid ? InvoiceStatus.PAID : InvoiceStatus.PENDING,
        paidAt: isPaid ? new Date() : null,
      },
    });

    await tx.activityLog.create({
      data: {
        clientId: invoice.clientId,
        invoiceId,
        action: "INVOICE_PAYMENT_ADDED",
        message: `Payment recorded for invoice ${invoice.number}`,
        metadata: { paymentId: created.id },
      },
    });

    return { payment: created, invoice, balance };
  });

  logger.info({
    scope: "invoices.payment.add",
    data: { invoiceId, paymentId: result.payment.id },
  });

  if (result.balance <= 0) {
    const policy = await getJobCreationPolicy();
    if (policy === JobCreationPolicy.ON_PAYMENT) {
      await ensureJobForInvoice(result.invoice.id);
    }
  }

  return result.payment;
}

export async function deletePayment(paymentId: number) {
  const payment = await prisma.$transaction(async (tx) => {
    const removed = await tx.payment.delete({ where: { id: paymentId } });
    const invoice = await tx.invoice.findUnique({
      where: { id: removed.invoiceId },
    });
    if (!invoice) throw new Error("Invoice not found");

    const payments = await tx.payment.findMany({
      where: { invoiceId: removed.invoiceId },
    });
    const paidAmount = payments.reduce(
      (sum, item) => sum + decimalToNumber(item.amount),
      0,
    );
    const total = decimalToNumber(invoice.total);
    const balance = Math.max(total - paidAmount, 0);

    await tx.invoice.update({
      where: { id: removed.invoiceId },
      data: {
        balanceDue: String(balance),
        status: balance <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PENDING,
        paidAt: balance <= 0 ? (invoice.paidAt ?? new Date()) : null,
      },
    });

    await tx.activityLog.create({
      data: {
        clientId: invoice.clientId,
        invoiceId: invoice.id,
        action: "INVOICE_PAYMENT_DELETED",
        message: `Payment removed from invoice ${invoice.number}`,
        metadata: { paymentId: removed.id },
      },
    });

    return removed;
  });

  logger.info({ scope: "invoices.payment.delete", data: { paymentId } });

  return payment;
}

export async function addInvoiceAttachment(
  invoiceId: number,
  file: {
    name: string;
    type: string;
    buffer: Buffer;
  },
) {
  await ensureStorage();

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Invoice not found");

  function sanitizeName(name: string) {
    return name.replaceAll("\\", "/").split("/").pop()!.replace(/[^\w.\-]+/g, "_");
  }

  const safeName = sanitizeName(file.name || "upload.bin");
  const storedPath = await saveInvoiceFile(invoiceId, safeName, file.buffer);
  const stats = await fileInfo(storedPath);

  const attachment = await prisma.attachment.create({
    data: {
      invoiceId,
      filename: safeName,
      filepath: storedPath,
      filetype: file.type,
      size: Number(stats.size),
    },
  });

  await prisma.activityLog.create({
    data: {
      clientId: invoice.clientId,
      invoiceId,
      action: "INVOICE_ATTACHMENT_ADDED",
      message: `Attachment added to invoice ${invoice.number}`,
      metadata: { attachmentId: attachment.id },
    },
  });

  logger.info({
    scope: "invoices.attachments.add",
    data: { invoiceId, attachmentId: attachment.id },
  });

  return attachment;
}

export async function removeInvoiceAttachment(attachmentId: number) {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });
  if (!attachment) throw new Error("Attachment not found");

  await prisma.$transaction(async (tx) => {
    await tx.attachment.delete({ where: { id: attachmentId } });
    await deleteInvoiceFile(attachment.invoiceId, attachment.filename);
    await tx.activityLog.create({
      data: {
        invoiceId: attachment.invoiceId,
        action: "INVOICE_ATTACHMENT_DELETED",
        message: `Attachment removed`,
        metadata: { attachmentId },
      },
    });
  });

  logger.info({ scope: "invoices.attachments.remove", data: { attachmentId } });

  return attachment;
}

export async function readInvoiceAttachment(attachmentId: number) {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });
  if (!attachment) throw new Error("Attachment not found");
  const stream = await readInvoiceFile(
    attachment.invoiceId,
    attachment.filename,
  );
  return { stream, attachment };
}

export async function markInvoicePaid(
  invoiceId: number,
  options?: {
    method?: PaymentMethod;
    amount?: number;
    reference?: string;
    processor?: string;
    processorId?: string;
    note?: string;
    paidAt?: Date;
  },
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      number: true,
      clientId: true,
      balanceDue: true,
      total: true,
    },
  });
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (options?.processorId) {
    const existing = await prisma.payment.findFirst({
      where: { processorId: options.processorId },
    });
    if (existing) {
      logger.info({
        scope: "invoices.markPaid",
        data: {
          invoiceId,
          note: "payment already recorded",
          processorId: options.processorId,
        },
      });
      return existing;
    }
  }

  const outstanding = decimalToNumber(invoice.balanceDue);
  const amount = options?.amount ?? outstanding;

  if (amount <= 0) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.PAID,
        balanceDue: "0",
        paidAt: options?.paidAt ?? new Date(),
      },
    });

    await prisma.activityLog.create({
      data: {
        clientId: invoice.clientId,
        invoiceId,
        action: "INVOICE_MARKED_PAID",
        message: `Invoice ${invoice.number} marked as paid`,
        metadata: {
          method: options?.method ?? PaymentMethod.OTHER,
          amount: 0,
        },
      },
    });

    logger.info({
      scope: "invoices.markPaid",
      data: { invoiceId, amount: 0 },
    });

    return null;
  }

  const payment = await addManualPayment(invoiceId, {
    amount,
    method: options?.method ?? PaymentMethod.OTHER,
    reference: options?.reference ?? "",
    processor: options?.processor ?? "",
    processorId: options?.processorId ?? "",
    notes: options?.note ?? "",
    paidAt: (options?.paidAt ?? new Date()).toISOString(),
  });

  await prisma.activityLog.create({
    data: {
      clientId: invoice.clientId,
      invoiceId,
      action: "INVOICE_MARKED_PAID",
      message: `Invoice ${invoice.number} marked as paid`,
      metadata: {
        method: payment.method,
        amount,
      },
    },
  });

  logger.info({
    scope: "invoices.markPaid",
    data: { invoiceId, amount, processorId: options?.processorId ?? null },
  });

  return payment;
}

export async function markInvoiceUnpaid(invoiceId: number) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      number: true,
      clientId: true,
      total: true,
      payments: {
        select: {
          id: true,
          amount: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const removedCount = invoice.payments.length;
  const removedAmount = invoice.payments.reduce(
    (sum, item) => sum + decimalToNumber(item.amount),
    0,
  );

  await prisma.$transaction(async (tx) => {
    if (removedCount > 0) {
      await tx.payment.deleteMany({ where: { invoiceId } });
    }

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.PENDING,
        balanceDue: invoice.total,
        paidAt: null,
      },
    });

    await tx.activityLog.create({
      data: {
        clientId: invoice.clientId,
        invoiceId,
        action: "INVOICE_MARKED_UNPAID",
        message: `Invoice ${invoice.number} marked as unpaid`,
        metadata: {
          removedPayments: removedCount,
          amount: removedAmount,
        },
      },
    });
  });

  logger.info({
    scope: "invoices.markUnpaid",
    data: { invoiceId, removedPayments: removedCount, amount: removedAmount },
  });
}

export async function revertInvoiceToQuote(invoiceId: number) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      payments: true,
      items: true,
      attachments: { select: { id: true } },
      sourceQuote: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (invoice.status === InvoiceStatus.PAID) {
    throw new Error("Paid invoices cannot be reverted");
  }

  if (invoice.payments.length > 0) {
    throw new Error("Remove payments before reverting the invoice");
  }

  const attachmentIds = invoice.attachments.map((attachment) => attachment.id);
  for (const attachmentId of attachmentIds) {
    await removeInvoiceAttachment(attachmentId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.job.deleteMany({ where: { invoiceId } });

    let quoteId: number;

    if (invoice.sourceQuoteId) {
      const quote = await tx.quote.update({
        where: { id: invoice.sourceQuoteId },
        data: {
          status: QuoteStatus.PENDING,
          issueDate: invoice.issueDate,
          expiryDate: invoice.dueDate,
          taxRate: invoice.taxRate,
          discountType: invoice.discountType,
          discountValue: invoice.discountValue,
          shippingCost: invoice.shippingCost,
          shippingLabel: invoice.shippingLabel,
          subtotal: invoice.subtotal,
          taxTotal: invoice.taxTotal,
          total: invoice.total,
          notes: invoice.notes,
          terms: invoice.terms,
          convertedInvoiceId: null,
          items: {
            deleteMany: {},
            create: invoice.items.map((item, index) => ({
              productTemplateId: item.productTemplateId ?? undefined,
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              discountType: item.discountType,
              discountValue: item.discountValue,
              total: item.total,
              orderIndex: item.orderIndex ?? index,
              calculatorBreakdown:
                item.calculatorBreakdown ?? Prisma.JsonNull,
            })),
          },
        },
      });
      quoteId = quote.id;
    } else {
      const quoteNumber = await nextDocumentNumber("quote", tx);
      const quote = await tx.quote.create({
        data: {
          number: quoteNumber,
          clientId: invoice.clientId,
          status: QuoteStatus.PENDING,
          issueDate: invoice.issueDate,
          expiryDate: invoice.dueDate,
          taxRate: invoice.taxRate,
          discountType: invoice.discountType,
          discountValue: invoice.discountValue,
          shippingCost: invoice.shippingCost,
          shippingLabel: invoice.shippingLabel,
          subtotal: invoice.subtotal,
          taxTotal: invoice.taxTotal,
          total: invoice.total,
          notes: invoice.notes,
          terms: invoice.terms,
          items: {
            create: invoice.items.map((item, index) => ({
              productTemplateId: item.productTemplateId ?? undefined,
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              discountType: item.discountType,
              discountValue: item.discountValue,
              total: item.total,
              orderIndex: item.orderIndex ?? index,
              calculatorBreakdown:
                item.calculatorBreakdown ?? Prisma.JsonNull,
            })),
          },
        },
      });
      quoteId = quote.id;
    }

    await tx.invoice.delete({ where: { id: invoiceId } });

    await tx.activityLog.create({
      data: {
        clientId: invoice.clientId,
        quoteId,
        action: "INVOICE_REVERTED_TO_QUOTE",
        message: `Invoice ${invoice.number} reverted to quote`,
        metadata: {
          invoiceId,
        },
      },
    });
  });

  logger.info({
    scope: "invoices.revertToQuote",
    data: { invoiceId },
  });
}

export async function voidInvoice(id: number, reason?: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === InvoiceStatus.PAID) {
    throw new Error("Cannot void a paid invoice");
  }
  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      voidedAt: new Date(),
      voidReason: reason ?? null,
      status: InvoiceStatus.PAID,
      balanceDue: "0",
      paidAt: new Date(),
    },
  });
  await prisma.activityLog.create({
    data: {
      clientId: updated.clientId,
      invoiceId: updated.id,
      action: "INVOICE_VOIDED",
      message: `Invoice ${updated.number} voided`,
      metadata: reason ? { reason } : undefined,
    },
  });
  return updated;
}

export async function writeOffInvoice(id: number, reason?: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === InvoiceStatus.PAID) {
    return invoice;
  }
  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      writtenOffAt: new Date(),
      writeOffReason: reason ?? null,
      status: InvoiceStatus.PAID,
      balanceDue: "0",
      paidAt: new Date(),
    },
  });
  await prisma.activityLog.create({
    data: {
      clientId: updated.clientId,
      invoiceId: updated.id,
      action: "INVOICE_WRITTEN_OFF",
      message: `Invoice ${updated.number} written off`,
      metadata: reason ? { reason } : undefined,
    },
  });
  return updated;
}
