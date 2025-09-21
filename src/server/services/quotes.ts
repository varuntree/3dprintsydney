import {
  DiscountType,
  QuoteStatus,
  Prisma,
  InvoiceStatus,
  JobCreationPolicy,
} from "@prisma/client";
import { prisma } from "@/server/db/client";
import { logger } from "@/lib/logger";
import {
  calculateLineTotal,
  calculateDocumentTotals,
} from "@/lib/calculations";
import {
  quoteInputSchema,
  quoteStatusSchema,
  type QuoteInput,
} from "@/lib/schemas/quotes";
import { nextDocumentNumber } from "@/server/services/numbering";
import { ensureJobForInvoice, getJobCreationPolicy } from "@/server/services/jobs";

const decimalToNumber = (value: unknown) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof (value as { toNumber?: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
};

function toDecimal(value: number | undefined | null) {
  if (value === undefined || value === null) return null;
  return String(Number.isFinite(value) ? value : 0);
}

function mapDiscount(type: QuoteInput["discountType"]): DiscountType {
  if (type === "PERCENT") return DiscountType.PERCENT;
  if (type === "FIXED") return DiscountType.FIXED;
  return DiscountType.NONE;
}

function mapLineDiscount(
  type: QuoteInput["lines"][number]["discountType"],
): DiscountType {
  if (type === "PERCENT") return DiscountType.PERCENT;
  if (type === "FIXED") return DiscountType.FIXED;
  return DiscountType.NONE;
}

export async function listQuotes(options?: {
  q?: string;
  statuses?: ("DRAFT" | "PENDING" | "ACCEPTED" | "DECLINED" | "CONVERTED")[];
  limit?: number;
  offset?: number;
  sort?: "issueDate" | "createdAt" | "number";
  order?: "asc" | "desc";
}) {
  const where: Prisma.QuoteWhereInput = {};
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
  const quotes = await prisma.quote.findMany({
    where,
    orderBy,
    include: {
      client: { select: { name: true } },
    },
    take: options?.limit,
    skip: options?.offset,
  });

  return quotes.map((quote) => ({
    id: quote.id,
    number: quote.number,
    clientName: quote.client.name,
    status: quote.status,
    total: Number(quote.total),
    issueDate: quote.issueDate,
    expiryDate: quote.expiryDate,
  }));
}

export async function getQuote(id: number) {
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      client: true,
      items: {
        orderBy: { orderIndex: "asc" },
        include: { productTemplate: true },
      },
    },
  });

  if (!quote) {
    throw new Error("Quote not found");
  }

  return quote;
}

export async function getQuoteDetail(id: number) {
  const quote = await getQuote(id);

  return {
    id: quote.id,
    number: quote.number,
    client: {
      id: quote.clientId,
      name: quote.client.name,
    },
    status: quote.status,
    issueDate: quote.issueDate,
    expiryDate: quote.expiryDate,
    taxRate: decimalToNumber(quote.taxRate),
    discountType: quote.discountType,
    discountValue: decimalToNumber(quote.discountValue),
    shippingCost: decimalToNumber(quote.shippingCost),
    shippingLabel: quote.shippingLabel ?? "",
    notes: quote.notes ?? "",
    terms: quote.terms ?? "",
    subtotal: decimalToNumber(quote.subtotal),
    total: decimalToNumber(quote.total),
    taxTotal: decimalToNumber(quote.taxTotal),
    lines: quote.items.map((item) => ({
      id: item.id,
      productTemplateId: item.productTemplateId ?? undefined,
      name: item.name,
      description: item.description ?? "",
      quantity: decimalToNumber(item.quantity),
      unit: item.unit ?? "",
      unitPrice: decimalToNumber(item.unitPrice),
      discountType: item.discountType,
      discountValue: decimalToNumber(item.discountValue),
      orderIndex: item.orderIndex,
      calculatorBreakdown: item.calculatorBreakdown as Record<
        string,
        unknown
      > | null,
      total: decimalToNumber(item.total),
    })),
  };
}

export type QuoteDetail = Awaited<ReturnType<typeof getQuoteDetail>>;

function computeTotals(payload: QuoteInput) {
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

export async function createQuote(payload: unknown) {
  const parsed = quoteInputSchema.parse(payload);
  const totals = computeTotals(parsed);

  const quote = await prisma.$transaction(async (tx) => {
    const number = await nextDocumentNumber("quote", tx);
    const created = await tx.quote.create({
      data: {
        number,
        clientId: parsed.clientId,
        status: QuoteStatus.DRAFT,
        issueDate: parsed.issueDate ? new Date(parsed.issueDate) : new Date(),
        expiryDate: parsed.expiryDate ? new Date(parsed.expiryDate) : null,
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
        quoteId: created.id,
        action: "QUOTE_CREATED",
        message: `Quote ${created.number} created`,
      },
    });

    return created;
  });

  logger.info({ scope: "quotes.create", data: { id: quote.id } });

  return quote;
}

export async function updateQuote(id: number, payload: unknown) {
  const parsed = quoteInputSchema.parse(payload);
  const totals = computeTotals(parsed);

  const quote = await prisma.$transaction(async (tx) => {
    const updated = await tx.quote.update({
      where: { id },
      data: {
        clientId: parsed.clientId,
        issueDate: parsed.issueDate ? new Date(parsed.issueDate) : undefined,
        expiryDate: parsed.expiryDate ? new Date(parsed.expiryDate) : null,
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
        items: true,
      },
    });

    await tx.activityLog.create({
      data: {
        clientId: updated.clientId,
        quoteId: updated.id,
        action: "QUOTE_UPDATED",
        message: `Quote ${updated.number} updated`,
      },
    });

    return updated;
  });

  logger.info({ scope: "quotes.update", data: { id } });

  return quote;
}

export async function updateQuoteStatus(id: number, payload: unknown) {
  const parsed = quoteStatusSchema.parse(payload);
  const quote = await prisma.quote.update({
    where: { id },
    data: { status: parsed.status as QuoteStatus },
  });

  await prisma.activityLog.create({
    data: {
      clientId: quote.clientId,
      quoteId: quote.id,
      action: "QUOTE_STATUS",
      message: `Quote ${quote.number} marked ${parsed.status.toLowerCase()}`,
    },
  });

  return quote;
}

export async function deleteQuote(id: number) {
  const quote = await prisma.$transaction(async (tx) => {
    const removed = await tx.quote.delete({ where: { id } });

    await tx.activityLog.create({
      data: {
        clientId: removed.clientId,
        quoteId: removed.id,
        action: "QUOTE_DELETED",
        message: `Quote ${removed.number} deleted`,
      },
    });

    return removed;
  });

  logger.info({ scope: "quotes.delete", data: { id } });

  return quote;
}

export async function convertQuoteToInvoice(id: number) {
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      client: true,
      items: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!quote) {
    throw new Error("Quote not found");
  }

  const totals = {
    subtotal: decimalToNumber(quote.subtotal),
    total: decimalToNumber(quote.total),
    taxTotal: decimalToNumber(quote.taxTotal),
    shippingCost: decimalToNumber(quote.shippingCost),
  };

  const invoice = await prisma.$transaction(async (tx) => {
    const number = await nextDocumentNumber("invoice", tx);

    const created = await tx.invoice.create({
      data: {
        number,
        clientId: quote.clientId,
        sourceQuoteId: quote.id,
        status: InvoiceStatus.PENDING,
        issueDate: new Date(),
        dueDate: null,
        taxRate: quote.taxRate ?? "0",
        discountType: quote.discountType,
        discountValue: quote.discountValue ?? "0",
        shippingCost: quote.shippingCost ?? "0",
        shippingLabel: quote.shippingLabel,
        notes: quote.notes,
        terms: quote.terms,
        subtotal: String(totals.subtotal),
        total: String(totals.total),
        taxTotal: String(totals.taxTotal),
        balanceDue: String(totals.total),
        items: {
          create: quote.items.map((item, index) => ({
            productTemplateId: item.productTemplateId ?? undefined,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            discountType: item.discountType,
            discountValue: item.discountValue ?? "0",
            total: item.total,
            orderIndex: item.orderIndex ?? index,
            calculatorBreakdown: item.calculatorBreakdown ?? Prisma.JsonNull,
          })),
        },
      },
    });

    await tx.quote.update({
      where: { id: quote.id },
      data: {
        status: QuoteStatus.CONVERTED,
        convertedInvoiceId: created.id,
      },
    });

    await tx.activityLog.create({
      data: {
        clientId: quote.clientId,
        quoteId: quote.id,
        invoiceId: created.id,
        action: "QUOTE_CONVERTED",
        message: `Quote ${quote.number} converted to invoice ${created.number}`,
      },
    });

    return created;
  });

  logger.info({
    scope: "quotes.convert",
    data: { quoteId: id, invoiceId: invoice.id },
  });

  const policy = await getJobCreationPolicy();
  if (policy === JobCreationPolicy.ON_INVOICE) {
    await ensureJobForInvoice(invoice.id);
  }

  return invoice;
}

export async function sendQuote(id: number) {
  const quote = await prisma.quote.update({ where: { id }, data: { sentAt: new Date(), status: QuoteStatus.PENDING } });
  await prisma.activityLog.create({
    data: {
      clientId: quote.clientId,
      quoteId: quote.id,
      action: "QUOTE_SENT",
      message: `Quote ${quote.number} sent`,
    },
  });
  logger.info({ scope: "quotes.send", data: { id } });
  return quote;
}

export async function acceptQuote(id: number, note?: string) {
  const quote = await prisma.quote.update({
    where: { id },
    data: { status: QuoteStatus.ACCEPTED, acceptedAt: new Date(), decisionNote: note ?? null },
  });
  await prisma.activityLog.create({
    data: {
      clientId: quote.clientId,
      quoteId: quote.id,
      action: "QUOTE_ACCEPTED",
      message: `Quote ${quote.number} accepted`,
      metadata: note ? { note } : undefined,
    },
  });
  logger.info({ scope: "quotes.accept", data: { id } });
  return quote;
}

export async function declineQuote(id: number, note?: string) {
  const quote = await prisma.quote.update({
    where: { id },
    data: { status: QuoteStatus.DECLINED, declinedAt: new Date(), decisionNote: note ?? null },
  });
  await prisma.activityLog.create({
    data: {
      clientId: quote.clientId,
      quoteId: quote.id,
      action: "QUOTE_DECLINED",
      message: `Quote ${quote.number} declined`,
      metadata: note ? { note } : undefined,
    },
  });
  logger.info({ scope: "quotes.decline", data: { id } });
  return quote;
}

export async function duplicateQuote(id: number) {
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { items: { orderBy: { orderIndex: "asc" } } },
  });

  if (!quote) {
    throw new Error("Quote not found");
  }

  const totals = {
    subtotal: decimalToNumber(quote.subtotal),
    total: decimalToNumber(quote.total),
    taxTotal: decimalToNumber(quote.taxTotal),
  };

  const duplicate = await prisma.$transaction(async (tx) => {
    const number = await nextDocumentNumber("quote", tx);

    const created = await tx.quote.create({
      data: {
        number,
        clientId: quote.clientId,
        status: QuoteStatus.DRAFT,
        issueDate: new Date(),
        expiryDate: quote.expiryDate,
        taxRate: quote.taxRate,
        discountType: quote.discountType,
        discountValue: quote.discountValue,
        shippingCost: quote.shippingCost,
        shippingLabel: quote.shippingLabel,
        notes: quote.notes,
        terms: quote.terms,
        subtotal: String(totals.subtotal),
        total: String(totals.total),
        taxTotal: String(totals.taxTotal),
        items: {
          create: quote.items.map((item, index) => ({
            productTemplateId: item.productTemplateId ?? undefined,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            discountType: item.discountType,
            discountValue: item.discountValue ?? "0",
            total: item.total,
            orderIndex: item.orderIndex ?? index,
            calculatorBreakdown: item.calculatorBreakdown ?? Prisma.JsonNull,
          })),
        },
      },
    });

    await tx.activityLog.create({
      data: {
        clientId: created.clientId,
        quoteId: created.id,
        action: "QUOTE_DUPLICATED",
        message: `Quote ${created.number} duplicated from ${quote.number}`,
      },
    });

    return created;
  });

  logger.info({
    scope: "quotes.duplicate",
    data: { sourceId: id, newId: duplicate.id },
  });

  return duplicate;
}
