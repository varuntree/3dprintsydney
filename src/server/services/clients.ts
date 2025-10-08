import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { logger } from "@/lib/logger";
import { clientInputSchema, clientNoteSchema } from "@/lib/schemas/clients";
import { resolvePaymentTermsOptions } from "@/server/services/settings";

export type ClientSummaryDTO = {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  paymentTerms: string | null;
  notifyOnJobStatus: boolean;
  outstandingBalance: number;
  totalInvoices: number;
  totalQuotes: number;
  createdAt: Date;
};

async function normalizePaymentTermsCode(
  tx: Prisma.TransactionClient,
  term: string | null | undefined,
) {
  const trimmed = term?.trim();
  if (!trimmed) {
    return null;
  }

  const { paymentTerms } = await resolvePaymentTermsOptions(tx);
  const isValid = paymentTerms.some((option) => option.code === trimmed);
  if (!isValid) {
    throw new Error("Invalid payment terms selection");
  }

  return trimmed;
}

export async function listClients(options?: {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: "name" | "createdAt";
  order?: "asc" | "desc";
}): Promise<ClientSummaryDTO[]> {
  const where = options?.q
    ? { OR: [{ name: { contains: options.q, mode: "insensitive" } }, { company: { contains: options.q, mode: "insensitive" } }] }
    : undefined;
  const orderBy = options?.sort
    ? { [options.sort]: options.order ?? "asc" }
    : { name: "asc" as const };
  const clients = await prisma.client.findMany({
    where,
    orderBy,
    include: {
      invoices: { select: { balanceDue: true, status: true } },
      _count: { select: { invoices: true, quotes: true } },
    },
    take: options?.limit,
    skip: options?.offset,
  });

  return clients.map((client) => {
    const outstanding = client.invoices.reduce((sum, invoice) => {
      if (invoice.status === "PAID") return sum;
      return sum + Number(invoice.balanceDue ?? 0);
    }, 0);

    return {
      id: client.id,
      name: client.name,
      company: client.company ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      paymentTerms: client.paymentTerms ?? null,
      notifyOnJobStatus: client.notifyOnJobStatus,
      outstandingBalance: outstanding,
      totalInvoices: client._count.invoices,
      totalQuotes: client._count.quotes,
      createdAt: client.createdAt,
    };
  });
}

export async function createClient(payload: unknown) {
  const parsed = clientInputSchema.parse(payload);
  const client = await prisma.$transaction(async (tx) => {
    const paymentTermsCode = await normalizePaymentTermsCode(
      tx,
      parsed.paymentTerms ?? null,
    );

    const created = await tx.client.create({
      data: {
        name: parsed.name,
        company: parsed.company || null,
        abn: parsed.abn || null,
        email: parsed.email || null,
        phone: parsed.phone || null,
        address: parsed.address ? { raw: parsed.address } : Prisma.JsonNull,
        paymentTerms: paymentTermsCode,
        notifyOnJobStatus: parsed.notifyOnJobStatus ?? false,
        notes: parsed.notes || null,
        tags: parsed.tags ?? [],
      },
    });

    await tx.activityLog.create({
      data: {
        clientId: created.id,
        action: "CLIENT_CREATED",
        message: `Client ${created.name} created`,
      },
    });

    return created;
  });

  logger.info({ scope: "clients.create", data: { id: client.id } });

  return client;
}

export async function updateClient(id: number, payload: unknown) {
  const parsed = clientInputSchema.parse(payload);
  const client = await prisma.$transaction(async (tx) => {
    const paymentTermsCode = await normalizePaymentTermsCode(
      tx,
      parsed.paymentTerms ?? null,
    );

    const updated = await tx.client.update({
      where: { id },
      data: {
        name: parsed.name,
        company: parsed.company || null,
        abn: parsed.abn || null,
        email: parsed.email || null,
        phone: parsed.phone || null,
        address: parsed.address ? { raw: parsed.address } : Prisma.JsonNull,
        paymentTerms: paymentTermsCode,
        notifyOnJobStatus: parsed.notifyOnJobStatus ?? false,
        notes: parsed.notes || null,
        tags: parsed.tags ?? [],
      },
    });

    await tx.activityLog.create({
      data: {
        clientId: updated.id,
        action: "CLIENT_UPDATED",
        message: `Client ${updated.name} updated`,
      },
    });

    return updated;
  });

  logger.info({ scope: "clients.update", data: { id } });

  return client;
}

export async function deleteClient(id: number) {
  const client = await prisma.$transaction(async (tx) => {
    const removed = await tx.client.delete({ where: { id } });
    await tx.activityLog.create({
      data: {
        clientId: removed.id,
        action: "CLIENT_DELETED",
        message: `Client ${removed.name} deleted`,
      },
    });
    return removed;
  });

  logger.info({ scope: "clients.delete", data: { id } });

  return client;
}

export async function getClientNotificationPreference(clientId: number) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { notifyOnJobStatus: true },
  });

  if (!client) {
    const error: Error & { status?: number } = new Error("Client not found");
    error.status = 404;
    throw error;
  }

  return client.notifyOnJobStatus;
}

export async function updateClientNotificationPreference(
  clientId: number,
  notifyOnJobStatus: boolean,
) {
  const updated = await prisma.client.update({
    where: { id: clientId },
    data: { notifyOnJobStatus },
    select: { id: true, name: true, notifyOnJobStatus: true },
  });

  await prisma.activityLog.create({
    data: {
      clientId: updated.id,
      action: "CLIENT_PREF_UPDATED",
      message: `Client ${updated.name} notification preference updated`,
      metadata: { notifyOnJobStatus },
    },
  });

  logger.info({
    scope: "clients.preference",
    data: { clientId, notifyOnJobStatus },
  });

  return updated.notifyOnJobStatus;
}

export type ClientDetailDTO = {
  client: {
    id: number;
    name: string;
    company: string;
    email: string;
    phone: string;
    address: string;
    paymentTerms: string;
    notifyOnJobStatus: boolean;
    abn: string | null;
    notes: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
  };
  invoices: {
    id: number;
    number: string;
    status: string;
    total: number;
    balanceDue: number;
    issueDate: Date;
  }[];
  quotes: {
    id: number;
    number: string;
    status: string;
    total: number;
    issueDate: Date;
  }[];
  jobs: {
    id: number;
    title: string;
    status: string;
    priority: string;
    createdAt: Date;
  }[];
  activity: {
    id: number;
    action: string;
    message: string;
    createdAt: Date;
    context?: string;
  }[];
  totals: {
    outstanding: number;
    paid: number;
    queuedJobs: number;
  };
  clientUser?: {
    id: number;
    email: string;
    createdAt: Date;
    messageCount: number;
  } | null;
};

export async function getClientDetail(id: number): Promise<ClientDetailDTO> {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      invoices: {
        orderBy: { issueDate: "desc" },
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          balanceDue: true,
          issueDate: true,
        },
      },
      quotes: {
        orderBy: { issueDate: "desc" },
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          issueDate: true,
        },
      },
      jobs: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
        },
      },
    },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  const activity = await prisma.activityLog.findMany({
    where: {
      OR: [
        { clientId: id },
        { invoice: { clientId: id } },
        { quote: { clientId: id } },
        { job: { clientId: id } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      invoice: { select: { number: true } },
      quote: { select: { number: true } },
      job: { select: { title: true } },
    },
    take: 50,
  });

  const activityItems = activity.map((entry) => {
    let context = "";
    if (entry.invoice) context = `Invoice ${entry.invoice.number}`;
    if (entry.quote) context = `Quote ${entry.quote.number}`;
    if (entry.job) context = `Job ${entry.job.title}`;

    return {
      id: entry.id,
      action: entry.action,
      message: entry.message,
      createdAt: entry.createdAt,
      context: context || undefined,
    };
  });

  const outstanding = client.invoices.reduce((sum, invoice) => {
    if (invoice.status === "PAID") return sum;
    return sum + Number(invoice.balanceDue ?? 0);
  }, 0);

  const paid = client.invoices.reduce((sum, invoice) => {
    if (invoice.status !== "PAID") return sum;
    return sum + Number(invoice.total ?? 0);
  }, 0);

  const openJobStatuses = new Set([
    "QUEUED",
    "PRE_PROCESSING",
    "IN_QUEUE",
    "PRINTING",
    "PAUSED",
    "PRINTING_COMPLETE",
    "POST_PROCESSING",
    "PACKAGING",
    "OUT_FOR_DELIVERY",
  ]);

  const queuedJobs = client.jobs.filter((job) => openJobStatuses.has(job.status)).length;

  // Resolve the primary client portal user (first created)
  const clientUser = await prisma.user.findFirst({
    where: { clientId: id },
    orderBy: { createdAt: "asc" },
  });

  let clientUserPayload: ClientDetailDTO["clientUser"] = null;
  if (clientUser) {
    const messageCount = await prisma.userMessage.count({ where: { userId: clientUser.id } });
    clientUserPayload = {
      id: clientUser.id,
      email: clientUser.email,
      createdAt: clientUser.createdAt,
      messageCount,
    };
  }

  return {
    client: {
      id: client.id,
      name: client.name,
      company: client.company ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      address: (client.address as { raw?: string } | null)?.raw ?? "",
      paymentTerms: client.paymentTerms ?? "",
      notifyOnJobStatus: client.notifyOnJobStatus,
      abn: client.abn ?? null,
      notes: client.notes ?? "",
      tags: (client.tags as string[] | null) ?? [],
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    },
    invoices: client.invoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      total: Number(invoice.total ?? 0),
      balanceDue: Number(invoice.balanceDue ?? 0),
      issueDate: invoice.issueDate,
    })),
    quotes: client.quotes.map((quote) => ({
      id: quote.id,
      number: quote.number,
      status: quote.status,
      total: Number(quote.total ?? 0),
      issueDate: quote.issueDate,
    })),
    jobs: client.jobs.map((job) => ({
      id: job.id,
      title: job.title,
      status: job.status,
      priority: job.priority,
      createdAt: job.createdAt,
    })),
    activity: activityItems,
    totals: {
      outstanding,
      paid,
      queuedJobs,
    },
    clientUser: clientUserPayload,
  };
}

export async function addClientNote(id: number, payload: unknown) {
  const parsed = clientNoteSchema.parse(payload);
  const note = await prisma.activityLog.create({
    data: {
      clientId: id,
      action: "CLIENT_NOTE",
      message: parsed.body,
    },
  });

  logger.info({ scope: "clients.note", data: { id } });

  return note;
}
