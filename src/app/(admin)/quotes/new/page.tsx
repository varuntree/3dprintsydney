import { notFound } from "next/navigation";
import { QuoteEditor } from "@/components/quotes/quote-editor";
import { listClients } from "@/server/services/clients";
import { listProductTemplates } from "@/server/services/product-templates";
import { listMaterials } from "@/server/services/materials";
import { getSettings } from "@/server/services/settings";
import { quoteInputSchema } from "@/lib/schemas/quotes";
import type { z } from "zod";

type QuoteFormValues = z.infer<typeof quoteInputSchema>;

export default async function NewQuotePage() {
  const [clients, templates, settings, materials] = await Promise.all([
    listClients(),
    listProductTemplates(),
    getSettings(),
    listMaterials(),
  ]);

  if (!settings) {
    notFound();
  }

  const initialValues: QuoteFormValues = {
    clientId: clients[0]?.id ?? 0,
    issueDate: new Date().toISOString().slice(0, 10),
    expiryDate: undefined,
    discountType: "NONE",
    discountValue: 0,
    shippingCost: 0,
    shippingLabel: settings.shippingOptions?.[0]?.label ?? "",
    notes: "",
    terms: "",
    lines: [
      {
        name: "Line item",
        description: "",
        quantity: 1,
        unit: "unit",
        unitPrice: 0,
        discountType: "NONE",
        discountValue: 0,
        productTemplateId: undefined,
      },
    ],
    taxRate: settings.taxRate ?? 0,
  };

  return (
    <div className="space-y-6">
      <QuoteEditor
        mode="create"
        initialValues={initialValues}
        clients={clients.map((client) => ({
          ...client,
          createdAt: client.createdAt.toISOString(),
        }))}
        templates={templates}
        settings={settings}
        materials={materials.map((material) => ({
          id: material.id,
          name: material.name,
          costPerGram: material.costPerGram,
          color: material.color ?? null,
        }))}
      />
    </div>
  );
}
