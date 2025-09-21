import { PrinterStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { logger } from "@/lib/logger";
import { printerInputSchema } from "@/lib/schemas/catalog";

export type PrinterDTO = {
  id: number;
  name: string;
  model: string;
  buildVolume: string;
  status: PrinterStatus;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
};

function serialize(
  printer: Awaited<ReturnType<typeof prisma.printer.findFirst>>,
): PrinterDTO {
  if (!printer) {
    throw new Error("Printer not found");
  }
  return {
    id: printer.id,
    name: printer.name,
    model: printer.model ?? "",
    buildVolume: printer.buildVolume ?? "",
    status: printer.status,
    notes: printer.notes ?? "",
    createdAt: printer.createdAt,
    updatedAt: printer.updatedAt,
  };
}

export async function listPrinters(options?: {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: "name" | "updatedAt";
  order?: "asc" | "desc";
}): Promise<PrinterDTO[]> {
  const where = options?.q
    ? {
        OR: [
          { name: { contains: options.q } },
          { model: { contains: options.q } },
        ],
      }
    : undefined;
  const orderBy = options?.sort
    ? { [options.sort]: options.order ?? "asc" }
    : { name: "asc" as const };
  const printers = await prisma.printer.findMany({
    where,
    orderBy,
    take: options?.limit,
    skip: options?.offset,
  });
  return printers.map((printer) => serialize(printer));
}

export async function createPrinter(payload: unknown) {
  const parsed = printerInputSchema.parse(payload);
  const printer = await prisma.$transaction(async (tx) => {
    const created = await tx.printer.create({
      data: {
        name: parsed.name,
        model: parsed.model || null,
        buildVolume: parsed.buildVolume || null,
        status: parsed.status,
        notes: parsed.notes || null,
      },
    });

    await tx.activityLog.create({
      data: {
        action: "PRINTER_CREATED",
        message: `Printer ${created.name} created`,
        metadata: { printerId: created.id },
      },
    });

    return created;
  });

  logger.info({ scope: "printers.create", data: { id: printer.id } });

  return serialize(printer);
}

export async function updatePrinter(id: number, payload: unknown) {
  const parsed = printerInputSchema.parse(payload);
  const printer = await prisma.$transaction(async (tx) => {
    const updated = await tx.printer.update({
      where: { id },
      data: {
        name: parsed.name,
        model: parsed.model || null,
        buildVolume: parsed.buildVolume || null,
        status: parsed.status,
        notes: parsed.notes || null,
      },
    });

    await tx.activityLog.create({
      data: {
        action: "PRINTER_UPDATED",
        message: `Printer ${updated.name} updated`,
        metadata: { printerId: updated.id },
      },
    });

    return updated;
  });

  logger.info({ scope: "printers.update", data: { id } });

  return serialize(printer);
}

export async function deletePrinter(id: number) {
  const printer = await prisma.$transaction(async (tx) => {
    const removed = await tx.printer.delete({ where: { id } });
    await tx.activityLog.create({
      data: {
        action: "PRINTER_DELETED",
        message: `Printer ${removed.name} deleted`,
        metadata: { printerId: removed.id },
      },
    });
    return removed;
  });

  logger.info({ scope: "printers.delete", data: { id } });

  return serialize(printer);
}
