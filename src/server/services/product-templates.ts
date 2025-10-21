import { logger } from "@/lib/logger";
import {
  productTemplateInputSchema,
  productCalculatorSchema,
  type ProductTemplateInput,
} from "@/lib/schemas/catalog";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { PricingType } from "@/lib/constants/enums";
import { AppError, NotFoundError, BadRequestError, ValidationError } from "@/lib/errors";

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

type MaterialRelationRow = { id: number; name: string | null; cost_per_gram: unknown | null };

type TemplateRow = {
  id: number;
  name: string;
  description: string | null;
  unit: string | null;
  pricing_type: string;
  base_price: unknown | null;
  calculator_config: unknown | null;
  material_id: number | null;
  created_at: string;
  updated_at: string;
  material?: MaterialRelationRow | null;
};

function validateBusinessRules(payload: ProductTemplateInput) {
  if (
    payload.pricingType === "FIXED" &&
    (payload.basePrice === undefined || payload.basePrice === null)
  ) {
    throw new BadRequestError("Base price required for fixed templates");
  }
  if (payload.pricingType === "CALCULATED" && !payload.calculatorConfig) {
    throw new BadRequestError("Calculator config required for calculated templates");
  }
}

function parseCalculatorConfig(
  config: ProductTemplateInput["calculatorConfig"],
): Record<string, unknown> | null {
  if (!config) return null;
  return productCalculatorSchema.parse(config) as Record<string, unknown>;
}

function mapTemplate(row: TemplateRow | null): ProductTemplateDTO {
  if (!row) {
    throw new NotFoundError("Product template", "unknown");
  }
  const material = row.material ?? null;
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    unit: row.unit ?? "unit",
    pricingType: (row.pricing_type ?? PricingType.FIXED) as PricingType,
    basePrice: row.base_price !== null ? Number(row.base_price ?? 0) : null,
    calculatorConfig: (row.calculator_config ?? null) as ProductTemplateInput["calculatorConfig"],
    materialId: row.material_id,
    materialName: material?.name ?? null,
    materialCostPerGram: material?.cost_per_gram
      ? Number(material.cost_per_gram)
      : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function insertActivity(action: string, message: string, templateId: number) {
  const supabase = getServiceSupabase();
  const { error } = await supabase.from("activity_logs").insert({
    action,
    message,
    metadata: { templateId },
  });
  if (error) {
    logger.warn({
      scope: "templates.activity",
      message: "Failed to record product template activity",
      error,
      data: { templateId, action },
    });
  }
}

export async function listProductTemplates(options?: {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: "updatedAt" | "name";
  order?: "asc" | "desc";
}): Promise<ProductTemplateDTO[]> {
  const supabase = getServiceSupabase();
  let query = supabase
    .from("product_templates")
    .select("*, material:materials(id, name, cost_per_gram)")
    .order(options?.sort === "name" ? "name" : "updated_at", {
      ascending: (options?.order ?? (options?.sort === "name" ? "asc" : "desc")) === "asc",
      nullsFirst: false,
    });

  if (options?.q) {
    const term = options.q.trim();
    if (term.length > 0) {
      query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
    }
  }

  if (typeof options?.limit === "number") {
    const limit = Math.max(1, options.limit);
    const offset = Math.max(0, options.offset ?? 0);
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(`Failed to list product templates: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  return (data as TemplateRow[]).map((row) => mapTemplate(row));
}

export async function createProductTemplate(payload: unknown) {
  const parsed = productTemplateInputSchema.parse(payload);
  validateBusinessRules(parsed);

  const calculatorConfig = parseCalculatorConfig(parsed.calculatorConfig);

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("product_templates")
    .insert({
      name: parsed.name,
      description: parsed.description || null,
      unit: parsed.unit,
      pricing_type: parsed.pricingType,
      base_price:
        parsed.basePrice !== undefined && parsed.basePrice !== null
          ? String(parsed.basePrice)
          : null,
      calculator_config: calculatorConfig,
      material_id: parsed.materialId ?? null,
    })
    .select("*, material:materials(id, name, cost_per_gram)")
    .single();

  if (error || !data) {
    throw new AppError(`Failed to create product template: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  await insertActivity(
    "PRODUCT_TEMPLATE_CREATED",
    `Template ${data.name} created`,
    data.id,
  );

  logger.info({ scope: "templates.create", data: { id: data.id } });
  return mapTemplate(data as TemplateRow);
}

export async function updateProductTemplate(id: number, payload: unknown) {
  const parsed = productTemplateInputSchema.parse(payload);
  validateBusinessRules(parsed);

  const calculatorConfig = parseCalculatorConfig(parsed.calculatorConfig);

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("product_templates")
    .update({
      name: parsed.name,
      description: parsed.description || null,
      unit: parsed.unit,
      pricing_type: parsed.pricingType,
      base_price:
        parsed.basePrice !== undefined && parsed.basePrice !== null
          ? String(parsed.basePrice)
          : null,
      calculator_config: calculatorConfig,
      material_id: parsed.materialId ?? null,
    })
    .eq("id", id)
    .select("*, material:materials(id, name, cost_per_gram)")
    .single();

  if (error || !data) {
    throw new AppError(`Failed to update product template: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  await insertActivity(
    "PRODUCT_TEMPLATE_UPDATED",
    `Template ${data.name} updated`,
    data.id,
  );

  logger.info({ scope: "templates.update", data: { id } });
  return mapTemplate(data as TemplateRow);
}

export async function deleteProductTemplate(id: number) {
  const supabase = getServiceSupabase();

  const [quoteCountRes, invoiceCountRes] = await Promise.all([
    supabase
      .from("quote_items")
      .select("id", { count: "exact", head: true })
      .eq("product_template_id", id),
    supabase
      .from("invoice_items")
      .select("id", { count: "exact", head: true })
      .eq("product_template_id", id),
  ]);

  if (quoteCountRes.error) {
    throw new AppError(`Failed to verify quote usage: ${quoteCountRes.error.message}`, 'DATABASE_ERROR', 500);
  }
  if (invoiceCountRes.error) {
    throw new AppError(`Failed to verify invoice usage: ${invoiceCountRes.error.message}`, 'DATABASE_ERROR', 500);
  }

  const inUse = (quoteCountRes.count ?? 0) + (invoiceCountRes.count ?? 0);
  if (inUse > 0) {
    throw new ValidationError("Cannot delete template: it is referenced by quotes or invoices");
  }

  const { data, error } = await supabase
    .from("product_templates")
    .delete()
    .eq("id", id)
    .select("*, material:materials(id, name, cost_per_gram)")
    .single();

  if (error || !data) {
    throw new AppError(`Failed to delete product template: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  await insertActivity(
    "PRODUCT_TEMPLATE_DELETED",
    `Template ${data.name} deleted`,
    data.id,
  );

  logger.info({ scope: "templates.delete", data: { id } });
  return mapTemplate(data as TemplateRow);
}
