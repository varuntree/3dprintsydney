import { getServiceSupabase } from "@/server/supabase/service-client";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { PostgrestError } from "@supabase/supabase-js";

const COLUMN_NAME = "orientation_data";
type OrientationTable = "tmp_files" | "order_files";

const cache = new Map<OrientationTable, boolean>();
const detectionPromises = new Map<OrientationTable, Promise<boolean>>();

export async function supportsOrientationDataColumn(table: OrientationTable): Promise<boolean> {
  if (cache.has(table)) {
    return cache.get(table)!;
  }
  if (!detectionPromises.has(table)) {
    detectionPromises.set(table, detectOrientationDataColumn(table));
  }
  const exists = await detectionPromises.get(table)!;
  cache.set(table, exists);
  detectionPromises.delete(table);
  return exists;
}

async function detectOrientationDataColumn(table: OrientationTable): Promise<boolean> {
  const supabase = getServiceSupabase();
  const { error } = await supabase.from(table).select(COLUMN_NAME).limit(1);

  if (error) {
    if (isMissingColumnError(error, table)) {
      logger.warn({
        scope: "schema.orientation",
        message: "Orientation data column missing; falling back to legacy schema",
        data: { table, column: COLUMN_NAME },
        error: error.message,
      });
      return false;
    }
    throw new AppError(`Failed to inspect ${table} schema: ${error.message}`, "DATABASE_ERROR", 500);
  }

  return true;
}

function isMissingColumnError(error: PostgrestError, table: OrientationTable): boolean {
  if (error.code !== "42703") {
    return false;
  }
  const message = (error.message ?? "").toLowerCase();
  return message.includes(`${table}.${COLUMN_NAME}`) || message.includes(COLUMN_NAME);
}
