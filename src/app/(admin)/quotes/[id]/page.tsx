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
import type { QuotePdfSnapshot } from "@/lib/pdf/snapshots";

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
      paymentTerms: detail.paymentTerms
        ? { label: detail.paymentTerms.label, days: detail.paymentTerms.days }
        : null,
      issueDate: detail.issueDate.toISOString(),
      expiryDate: detail.expiryDate ? detail.expiryDate.toISOString() : null,
      subtotal: detail.subtotal,
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

    const pdfSnapshot: QuotePdfSnapshot = {
      currency: settings.defaultCurrency ?? "AUD",
      business: {
        name: settings.businessName ?? null,
        address: settings.businessAddress ?? null,
        email: settings.businessEmail ?? null,
        phone: settings.businessPhone ?? null,
        abn: settings.abn ?? null,
        bankDetails: settings.bankDetails ?? null,
        logoUrl: "/logo.png",
      },
      quote: {
        number: detail.number,
        status: detail.status,
        issueDate: detail.issueDate.toISOString(),
        expiryDate: detail.expiryDate ? detail.expiryDate.toISOString() : null,
        paymentTerms: detail.paymentTerms
          ? { label: detail.paymentTerms.label, days: detail.paymentTerms.days }
          : null,
        subtotal: detail.subtotal,
        total: detail.total,
        taxTotal: detail.taxTotal,
        taxRate: detail.taxRate ?? null,
        discountType: detail.discountType,
        discountValue: detail.discountValue,
        shippingCost: detail.shippingCost,
        shippingLabel: detail.shippingLabel ?? null,
        notes: detail.notes,
        terms: detail.terms,
        client: {
          name: detail.client.name,
          company: detail.client.company ?? null,
          email: detail.client.email ?? null,
          phone: detail.client.phone ?? null,
          address: detail.client.address ?? null,
        },
        lines: detail.lines.map((line) => ({
          name: line.name,
          description: line.description ?? null,
          quantity: line.quantity,
          unit: line.unit ?? "",
          unitPrice: line.unitPrice,
          discountType: line.discountType,
          discountValue: line.discountValue,
          total: line.total,
          calculatorBreakdown: line.calculatorBreakdown ?? null,
        })),
      },
    };

    return <QuoteView quote={viewModel} pdfSnapshot={pdfSnapshot} />;
  } catch {
    notFound();
  }
}
