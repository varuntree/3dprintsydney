import { prisma } from "@/server/db/client";
import { logger } from "@/lib/logger";
import { materialInputSchema } from "@/lib/schemas/catalog";

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

function serialize(
  material: Awaited<ReturnType<typeof prisma.material.findFirst>>,
): MaterialDTO {
  if (!material) {
    throw new Error("Material not found");
  }
  return {
    id: material.id,
    name: material.name,
    color: material.color ?? "",
    category: material.category ?? "",
    costPerGram: Number(material.costPerGram),
    notes: material.notes ?? "",
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  };
}

export async function listMaterials(options?: {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: "name" | "updatedAt";
  order?: "asc" | "desc";
}): Promise<MaterialDTO[]> {
  const where = options?.q
    ? {
        OR: [
          { name: { contains: options.q } },
          { color: { contains: options.q } },
          { category: { contains: options.q } },
        ],
      }
    : undefined;
  const orderBy = options?.sort
    ? { [options.sort]: options.order ?? "asc" }
    : { name: "asc" as const };
  const materials = await prisma.material.findMany({
    where,
    orderBy,
    take: options?.limit,
    skip: options?.offset,
  });
  return materials.map((material) => serialize(material));
}

export async function createMaterial(payload: unknown) {
  const parsed = materialInputSchema.parse(payload);
  const material = await prisma.$transaction(async (tx) => {
    const created = await tx.material.create({
      data: {
        name: parsed.name,
        color: parsed.color || null,
        category: parsed.category || null,
        costPerGram: String(parsed.costPerGram),
        notes: parsed.notes || null,
      },
    });

    await tx.activityLog.create({
      data: {
        action: "MATERIAL_CREATED",
        message: `Material ${created.name} created`,
        metadata: { materialId: created.id },
      },
    });

    return created;
  });

  logger.info({ scope: "materials.create", data: { id: material.id } });

  return serialize(material);
}

export async function updateMaterial(id: number, payload: unknown) {
  const parsed = materialInputSchema.parse(payload);
  const material = await prisma.$transaction(async (tx) => {
    const updated = await tx.material.update({
      where: { id },
      data: {
        name: parsed.name,
        color: parsed.color || null,
        category: parsed.category || null,
        costPerGram: String(parsed.costPerGram),
        notes: parsed.notes || null,
      },
    });

    await tx.activityLog.create({
      data: {
        action: "MATERIAL_UPDATED",
        message: `Material ${updated.name} updated`,
        metadata: { materialId: updated.id },
      },
    });

    return updated;
  });

  logger.info({ scope: "materials.update", data: { id } });

  return serialize(material);
}

export async function deleteMaterial(id: number) {
  // Guard: prevent delete if referenced by any product templates
  const inUse = await prisma.productTemplate.count({ where: { materialId: id } });
  if (inUse > 0) {
    const err = new Error("Cannot delete material: it is referenced by product templates");
    (err as unknown as { status?: number }).status = 422;
    throw err;
  }
  const material = await prisma.$transaction(async (tx) => {
    const removed = await tx.material.delete({ where: { id } });
    await tx.activityLog.create({
      data: {
        action: "MATERIAL_DELETED",
        message: `Material ${removed.name} deleted`,
        metadata: { materialId: removed.id },
      },
    });
    return removed;
  });

  logger.info({ scope: "materials.delete", data: { id } });

  return serialize(material);
}
