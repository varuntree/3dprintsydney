import { logger } from "@/lib/logger";
import type { MaterialInput } from "@/lib/schemas/catalog";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { AppError, NotFoundError, ValidationError } from "@/lib/errors";

export type MaterialDTO = {
  id: number;
  name: string;
  color: string;
  category: string;
  costPerGram: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
};

type MaterialRow = {
  id: number;
  name: string;
  color: string | null;
  category: string | null;
  cost_per_gram: string | number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function mapMaterial(row: MaterialRow | null): MaterialDTO {
  if (!row) {
    throw new NotFoundError("Material", "unknown");
  }
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? "",
    category: row.category ?? "",
    costPerGram: Number(row.cost_per_gram ?? 0),
    notes: row.notes ?? "",
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * List all materials with optional filtering, sorting, and pagination
 * @param options - Query options for search, sorting, and pagination
 * @returns Array of material DTOs
 * @throws AppError if database query fails
 */
export async function listMaterials(options?: {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: "name" | "updatedAt";
  order?: "asc" | "desc";
}): Promise<MaterialDTO[]> {
  const supabase = getServiceSupabase();
  let query = supabase
    .from("materials")
    .select("*")
    .order(
      options?.sort === "updatedAt" ? "updated_at" : "name",
      {
        ascending: (options?.order ?? "asc") === "asc",
        nullsFirst: false,
      },
    );

  if (options?.q) {
    const term = options.q.trim();
    if (term.length > 0) {
      query = query.or(
        `name.ilike.%${term}%,color.ilike.%${term}%,category.ilike.%${term}%`,
      );
    }
  }

  if (typeof options?.limit === "number") {
    const limit = Math.max(1, options.limit);
    const offset = Math.max(0, options.offset ?? 0);
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(`Failed to list materials: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  return (data as MaterialRow[]).map(mapMaterial);
}

async function insertActivity(action: string, message: string, materialId: number) {
  const supabase = getServiceSupabase();
  const { error } = await supabase.from("activity_logs").insert({
    action,
    message,
    metadata: { materialId },
  });
  if (error) {
    logger.warn({
      scope: "materials.activity",
      message: "Failed to record material activity",
      error,
      data: { materialId, action },
    });
  }
}

/**
 * Create a new material
 * @param input - Material creation input (already validated)
 * @returns Created material DTO
 * @throws AppError if database operation fails
 */
export async function createMaterial(input: MaterialInput) {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("materials")
    .insert({
      name: input.name,
      color: input.color || null,
      category: input.category || null,
      cost_per_gram: String(input.costPerGram),
      notes: input.notes || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError(`Failed to create material: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  await insertActivity(
    "MATERIAL_CREATED",
    `Material ${data.name} created`,
    data.id,
  );

  logger.info({ scope: "materials.create", data: { id: data.id } });
  return mapMaterial(data as MaterialRow);
}

/**
 * Update an existing material
 * @param id - Material ID
 * @param input - Material update input (already validated)
 * @returns Updated material DTO
 * @throws AppError if database operation fails
 */
export async function updateMaterial(id: number, input: MaterialInput) {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("materials")
    .update({
      name: input.name,
      color: input.color || null,
      category: input.category || null,
      cost_per_gram: String(input.costPerGram),
      notes: input.notes || null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError(`Failed to update material: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  await insertActivity(
    "MATERIAL_UPDATED",
    `Material ${data.name} updated`,
    data.id,
  );

  logger.info({ scope: "materials.update", data: { id } });
  return mapMaterial(data as MaterialRow);
}

/**
 * Delete a material after verifying it's not referenced by product templates
 * @param id - Material ID to delete
 * @returns Deleted material DTO
 * @throws ValidationError if material is referenced by product templates
 * @throws AppError if database operation fails
 */
export async function deleteMaterial(id: number) {
  const supabase = getServiceSupabase();
  const { count, error: countError } = await supabase
    .from("product_templates")
    .select("id", { count: "exact", head: true })
    .eq("material_id", id);

  if (countError) {
    throw new AppError(`Failed to verify material usage: ${countError.message}`, 'DATABASE_ERROR', 500);
  }

  if ((count ?? 0) > 0) {
    throw new ValidationError(
      "Cannot delete material: it is referenced by product templates",
    );
  }

  const { data, error } = await supabase
    .from("materials")
    .delete()
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError(`Failed to delete material: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  await insertActivity(
    "MATERIAL_DELETED",
    `Material ${data.name} deleted`,
    data.id,
  );

  logger.info({ scope: "materials.delete", data: { id } });
  return mapMaterial(data as MaterialRow);
}
