import { Prisma, PricingType } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { logger } from "@/lib/logger";
import {
  productTemplateInputSchema,
  productCalculatorSchema,
  type ProductTemplateInput,
} from "@/lib/schemas/catalog";

type TemplateWithMaterial = Prisma.ProductTemplateGetPayload<{
  include: { material: true };
}>;

export type ProductTemplateDTO = {
  id: number;
  name: string;
  description: string;
  unit: string;
  pricingType: PricingType;
  basePrice: number | null;
  calculatorConfig: ProductTemplateInput["calculatorConfig"] | null;
  materialId: number | null;
  materialName: string | null;
  materialCostPerGram: number | null;
  createdAt: Date;
  updatedAt: Date;
};

function serialize(template: TemplateWithMaterial): ProductTemplateDTO {
  return {
    id: template.id,
    name: template.name,
    description: template.description ?? "",
    unit: template.unit ?? "unit",
    pricingType: template.pricingType,
    basePrice: template.basePrice ? Number(template.basePrice) : null,
    calculatorConfig: (template.calculatorConfig ?? null) as
      | ProductTemplateInput["calculatorConfig"]
      | null,
    materialId: template.materialId,
    materialName: template.material?.name ?? null,
    materialCostPerGram: template.material?.costPerGram
      ? Number(template.material.costPerGram)
      : null,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

export async function listProductTemplates(options?: {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: "updatedAt" | "name";
  order?: "asc" | "desc";
}): Promise<ProductTemplateDTO[]> {
  const where = options?.q
    ? {
        OR: [
          { name: { contains: options.q } },
          { description: { contains: options.q } },
        ],
      }
    : undefined;
  const orderBy = options?.sort
    ? { [options.sort]: options.order ?? "desc" }
    : { updatedAt: "desc" as const };
  const templates = await prisma.productTemplate.findMany({
    where,
    orderBy,
    include: { material: true },
    take: options?.limit,
    skip: options?.offset,
  });
  return templates.map((template) => serialize(template));
}

function validateBusinessRules(payload: ProductTemplateInput) {
  if (
    payload.pricingType === "FIXED" &&
    (payload.basePrice === undefined || payload.basePrice === null)
  ) {
    throw new Error("Base price required for fixed templates");
  }
  if (payload.pricingType === "CALCULATED" && !payload.calculatorConfig) {
    throw new Error("Calculator config required for calculated templates");
  }
}

export async function createProductTemplate(payload: unknown) {
  const parsed = productTemplateInputSchema.parse(payload);
  validateBusinessRules(parsed);

  const calculatorConfig = parsed.calculatorConfig
    ? (productCalculatorSchema.parse(
        parsed.calculatorConfig,
      ) as unknown as Prisma.InputJsonValue)
    : Prisma.JsonNull;

  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.productTemplate.create({
      data: {
        name: parsed.name,
        description: parsed.description || null,
        unit: parsed.unit,
        pricingType: parsed.pricingType,
        basePrice:
          parsed.basePrice !== undefined ? String(parsed.basePrice) : null,
        calculatorConfig,
        materialId: parsed.materialId ?? null,
      },
      include: { material: true },
    });

    await tx.activityLog.create({
      data: {
        action: "PRODUCT_TEMPLATE_CREATED",
        message: `Template ${created.name} created`,
        metadata: { templateId: created.id },
      },
    });

    return created;
  });

  logger.info({ scope: "templates.create", data: { id: template.id } });

  return serialize(template);
}

export async function updateProductTemplate(id: number, payload: unknown) {
  const parsed = productTemplateInputSchema.parse(payload);
  validateBusinessRules(parsed);

  const calculatorConfig = parsed.calculatorConfig
    ? (productCalculatorSchema.parse(
        parsed.calculatorConfig,
      ) as unknown as Prisma.InputJsonValue)
    : Prisma.JsonNull;

  const template = await prisma.$transaction(async (tx) => {
    const updated = await tx.productTemplate.update({
      where: { id },
      data: {
        name: parsed.name,
        description: parsed.description || null,
        unit: parsed.unit,
        pricingType: parsed.pricingType,
        basePrice:
          parsed.basePrice !== undefined ? String(parsed.basePrice) : null,
        calculatorConfig,
        materialId: parsed.materialId ?? null,
      },
      include: { material: true },
    });

    await tx.activityLog.create({
      data: {
        action: "PRODUCT_TEMPLATE_UPDATED",
        message: `Template ${updated.name} updated`,
        metadata: { templateId: updated.id },
      },
    });

    return updated;
  });

  logger.info({ scope: "templates.update", data: { id } });

  return serialize(template);
}

export async function deleteProductTemplate(id: number) {
  // Guard: prevent delete if referenced by quotes or invoices
  const [quoteCount, invoiceCount] = await Promise.all([
    prisma.quoteItem.count({ where: { productTemplateId: id } }),
    prisma.invoiceItem.count({ where: { productTemplateId: id } }),
  ]);
  if (quoteCount > 0 || invoiceCount > 0) {
    const err = new Error("Cannot delete template: it is referenced by quotes or invoices");
    (err as unknown as { status?: number }).status = 422;
    throw err;
  }
  const template = await prisma.$transaction(async (tx) => {
    const removed = await tx.productTemplate.delete({
      where: { id },
      include: { material: true },
    });

    await tx.activityLog.create({
      data: {
        action: "PRODUCT_TEMPLATE_DELETED",
        message: `Template ${removed.name} deleted`,
        metadata: { templateId: removed.id },
      },
    });

    return removed;
  });

  logger.info({ scope: "templates.delete", data: { id } });

  return serialize(template);
}
