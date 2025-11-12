import { notFound } from "next/navigation";
import { QuoteEditor } from "@/components/quotes/quote-editor";
import { QuoteView, type QuoteViewModel } from "@/components/quotes/quote-view";
import { listClients } from "@/server/services/clients";
import { listProductTemplates } from "@/server/services/product-templates";
import { listMaterials } from "@/server/services/materials";
import { getSettings } from "@/server/services/settings";
import { getQuoteDetail } from "@/server/services/quotes";
import { quoteInputSchema } from "@/lib/schemas/quotes";
import type { z } from "zod";

type QuoteFormValues = z.infer<typeof quoteInputSchema>;

interface QuotePageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function QuoteDetailPage({ params, searchParams }: QuotePageProps) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const modeParam = resolvedSearchParams?.mode ?? resolvedSearchParams?.view ?? undefined;
  const mode = Array.isArray(modeParam) ? modeParam[0] : modeParam;
  const isEdit = mode === "edit";

  try {
    const [detail, settings] = await Promise.all([getQuoteDetail(id), getSettings()]);

    if (!settings) {
      notFound();
    }

    if (isEdit) {
      const [clients, templates, materials] = await Promise.all([
        listClients(),
        listProductTemplates(),
        listMaterials(),
      ]);

      const initialValues: QuoteFormValues = {
        clientId: detail.client.id,
        issueDate: detail.issueDate.toISOString().slice(0, 10),
        expiryDate: detail.expiryDate ? detail.expiryDate.toISOString().slice(0, 10) : undefined,
        taxRate: detail.taxRate,
        discountType: detail.discountType,
        discountValue: detail.discountValue,
        shippingCost: detail.shippingCost,
        shippingLabel: detail.shippingLabel,
        notes: detail.notes,
        terms: detail.terms,
        lines: detail.lines.map((line, index) => ({
          productTemplateId: line.productTemplateId ?? null,
          name: line.name,
          description: line.description ?? "",
          quantity: line.quantity,
          unit: line.unit ?? "unit",
          unitPrice: line.unitPrice,
          discountType: line.discountType,
          discountValue: line.discountValue ?? 0,
          orderIndex: line.orderIndex ?? index,
          calculatorBreakdown: line.calculatorBreakdown ?? undefined,
        })),
      };

      return (
        <div className="space-y-6">
          <QuoteEditor
            mode="edit"
            quoteId={detail.id}
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

    const viewModel: QuoteViewModel = {
      id: detail.id,
      number: detail.number,
      status: detail.status,
      client: detail.client,
      businessName: settings.businessName,
      businessEmail: settings.businessEmail,
      businessPhone: settings.businessPhone,
      businessAddress: settings.businessAddress,
      abn: detail.client.abn ?? settings.abn ?? null,
      currency: settings.defaultCurrency ?? "AUD",
      paymentTerms: detail.paymentTerms
        ? { label: detail.paymentTerms.label, days: detail.paymentTerms.days }
        : null,
      issueDate: detail.issueDate.toISOString(),
      expiryDate: detail.expiryDate ? detail.expiryDate.toISOString() : null,
      subtotal: detail.subtotal,
      discountType: detail.discountType,
      discountValue: detail.discountValue,
      shippingCost: detail.shippingCost,
      taxTotal: detail.taxTotal,
      total: detail.total,
      notes: detail.notes,
      terms: detail.terms,
      lines: detail.lines.map((line, index) => ({
        id: line.id ?? null,
        name: line.name,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit ?? "",
        unitPrice: line.unitPrice,
        discountType: line.discountType,
        discountValue: line.discountValue,
        total: line.total,
        orderIndex: line.orderIndex ?? index,
      })),
    };

    return <QuoteView quote={viewModel} />;
  } catch {
    notFound();
  }
}
