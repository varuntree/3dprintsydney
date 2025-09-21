import { notFound } from "next/navigation";
import { QuoteEditor } from "@/components/quotes/quote-editor";
import { listClients } from "@/server/services/clients";
import { listProductTemplates } from "@/server/services/product-templates";
import { getSettings } from "@/server/services/settings";
import { getQuoteDetail } from "@/server/services/quotes";
import { quoteInputSchema } from "@/lib/schemas/quotes";
import { QuoteActions } from "@/components/quotes/quote-actions";
import type { z } from "zod";

type QuoteFormValues = z.infer<typeof quoteInputSchema>;

interface QuotePageProps {
  params: Promise<{ id: string }>;
}

export default async function QuoteDetailPage({ params }: QuotePageProps) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id)) {
    notFound();
  }

  try {
    const [detail, clients, templates, settings] = await Promise.all([
      getQuoteDetail(id),
      listClients(),
      listProductTemplates(),
      getSettings(),
    ]);

    if (!settings) {
      notFound();
    }

    const initialValues: QuoteFormValues = {
      clientId: detail.client.id,
      issueDate: detail.issueDate.toISOString().slice(0, 10),
      expiryDate: detail.expiryDate
        ? detail.expiryDate.toISOString().slice(0, 10)
        : undefined,
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
        />
        <QuoteActions quoteId={detail.id} currentStatus={detail.status} />
      </div>
    );
  } catch {
    notFound();
  }
}
