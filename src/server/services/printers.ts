import { logger } from "@/lib/logger";
import { printerInputSchema } from "@/lib/schemas/catalog";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { PrinterStatus } from "@/lib/constants/enums";

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

type PrinterRow = {
  id: number;
  name: string;
  model: string | null;
  build_volume: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function mapPrinter(row: PrinterRow | null): PrinterDTO {
  if (!row) {
    throw new Error("Printer not found");
  }
  return {
    id: row.id,
    name: row.name,
    model: row.model ?? "",
    buildVolume: row.build_volume ?? "",
    status: (row.status ?? PrinterStatus.ACTIVE) as PrinterStatus,
    notes: row.notes ?? "",
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function insertActivity(action: string, message: string, printerId: number) {
  const supabase = getServiceSupabase();
  const { error } = await supabase.from("activity_logs").insert({
    action,
    message,
    metadata: { printerId },
  });
  if (error) {
    logger.warn({
      scope: "printers.activity",
      message: "Failed to record printer activity",
      error,
      data: { printerId, action },
    });
  }
}

export async function listPrinters(options?: {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: "name" | "updatedAt";
  order?: "asc" | "desc";
}): Promise<PrinterDTO[]> {
  const supabase = getServiceSupabase();
  let query = supabase
    .from("printers")
    .select("*")
    .order(options?.sort === "updatedAt" ? "updated_at" : "name", {
      ascending: (options?.order ?? "asc") === "asc",
      nullsFirst: false,
    });

  if (options?.q) {
    const term = options.q.trim();
    if (term.length > 0) {
      query = query.or(`name.ilike.%${term}%,model.ilike.%${term}%`);
    }
  }

  if (typeof options?.limit === "number") {
    const limit = Math.max(1, options.limit);
    const offset = Math.max(0, options.offset ?? 0);
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list printers: ${error.message}`);
  }
  return (data as PrinterRow[]).map(mapPrinter);
}

export async function createPrinter(payload: unknown) {
  const parsed = printerInputSchema.parse(payload);
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("printers")
    .insert({
      name: parsed.name,
      model: parsed.model || null,
      build_volume: parsed.buildVolume || null,
      status: parsed.status,
      notes: parsed.notes || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create printer: ${error?.message ?? "Unknown error"}`);
  }

  await insertActivity(
    "PRINTER_CREATED",
    `Printer ${data.name} created`,
    data.id,
  );

  logger.info({ scope: "printers.create", data: { id: data.id } });
  return mapPrinter(data as PrinterRow);
}

export async function updatePrinter(id: number, payload: unknown) {
  const parsed = printerInputSchema.parse(payload);
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("printers")
    .update({
      name: parsed.name,
      model: parsed.model || null,
      build_volume: parsed.buildVolume || null,
      status: parsed.status,
      notes: parsed.notes || null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to update printer: ${error?.message ?? "Unknown error"}`);
  }

  await insertActivity(
    "PRINTER_UPDATED",
    `Printer ${data.name} updated`,
    data.id,
  );

  logger.info({ scope: "printers.update", data: { id } });
  return mapPrinter(data as PrinterRow);
}

export async function deletePrinter(id: number) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("printers")
    .delete()
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to delete printer: ${error?.message ?? "Unknown error"}`);
  }

  await insertActivity(
    "PRINTER_DELETED",
    `Printer ${data.name} deleted`,
    data.id,
  );

  logger.info({ scope: "printers.delete", data: { id } });
  return mapPrinter(data as PrinterRow);
}
