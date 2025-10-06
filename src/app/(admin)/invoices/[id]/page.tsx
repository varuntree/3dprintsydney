import { notFound } from "next/navigation";
import {
  InvoiceEditor,
  type InvoiceFormValues,
} from "@/components/invoices/invoice-editor";
import { InvoiceView, type InvoiceViewModel } from "@/components/invoices/invoice-view";
import {
  InvoicePayments,
  type InvoicePaymentRecord,
} from "@/components/invoices/invoice-payments";
import {
  InvoiceAttachments,
  type InvoiceAttachmentRecord,
} from "@/components/invoices/invoice-attachments";
import { listClients } from "@/server/services/clients";
import { getSettings } from "@/server/services/settings";
import { getInvoiceDetail, type InvoiceDetail } from "@/server/services/invoices";
import { listProductTemplates } from "@/server/services/product-templates";
import { listMaterials } from "@/server/services/materials";
import { InvoiceActivity } from "@/components/invoices/invoice-activity";
import { Conversation } from "@/components/messages/conversation";

interface InvoicePageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InvoiceDetailPage({ params, searchParams }: InvoicePageProps) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id)) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const modeParam = resolvedSearchParams?.mode ?? resolvedSearchParams?.view;
  const mode = Array.isArray(modeParam) ? modeParam[0] : modeParam;
  const isEdit = mode === "edit";

  try {
    const [detail, settings] = await Promise.all([getInvoiceDetail(id), getSettings()]);
    if (!settings) {
      notFound();
    }

    if (isEdit) {
      const [clients, templates, materials] = await Promise.all([
        listClients(),
        listProductTemplates(),
        listMaterials(),
      ]);

      const initialValues: InvoiceFormValues = {
        clientId: detail.client.id,
        issueDate: detail.issueDate.toISOString().slice(0, 10),
        dueDate: detail.dueDate ? detail.dueDate.toISOString().slice(0, 10) : undefined,
        taxRate: detail.taxRate,
        discountType: detail.discountType,
        discountValue: detail.discountValue,
        shippingCost: detail.shippingCost,
        shippingLabel: detail.shippingLabel,
        notes: detail.notes,
        terms: detail.terms,
        lines: detail.lines.map((line) => ({
          productTemplateId: line.productTemplateId ?? null,
          name: line.name,
          description: line.description ?? "",
          quantity: line.quantity,
          unit: line.unit ?? "",
          unitPrice: line.unitPrice,
          discountType: line.discountType,
          discountValue: line.discountValue,
          calculatorBreakdown: line.calculatorBreakdown ?? undefined,
        })),
      };

      return (
        <div className="space-y-6">
          <InvoiceEditor
            mode="edit"
            invoiceId={detail.id}
            initialValues={initialValues}
            clients={clients.map((client) => ({
              ...client,
              createdAt: client.createdAt.toISOString(),
            }))}
            settings={settings}
            templates={templates}
            materials={materials.map((material) => ({
              id: material.id,
              name: material.name,
              costPerGram: material.costPerGram,
              color: material.color ?? null,
            }))}
          />
          <SupplementaryPanels detail={detail} />
        </div>
      );
    }

    const payments: InvoicePaymentRecord[] = detail.payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes,
      paidAt: payment.paidAt.toISOString(),
    }));

    const attachments: InvoiceAttachmentRecord[] = detail.attachments.map(
      (attachment) => ({
        id: attachment.id,
        filename: attachment.filename,
        filetype: attachment.filetype,
        size: attachment.size,
        uploadedAt: attachment.uploadedAt.toISOString(),
      }),
    );

    const viewModel: InvoiceViewModel = {
      id: detail.id,
      number: detail.number,
      status: detail.status,
      issueDate: detail.issueDate.toISOString(),
      dueDate: detail.dueDate ? detail.dueDate.toISOString() : null,
      paidAt: detail.paidAt ? detail.paidAt.toISOString() : null,
      clientName: detail.client.name,
      paymentTerms: detail.paymentTerms
        ? { label: detail.paymentTerms.label, days: detail.paymentTerms.days }
        : null,
      subtotal: detail.subtotal,
      shippingCost: detail.shippingCost,
      taxTotal: detail.taxTotal,
      total: detail.total,
      balanceDue: detail.balanceDue,
      notes: detail.notes,
      terms: detail.terms,
      currency: settings.defaultCurrency ?? "AUD",
      stripeCheckoutUrl: detail.stripeCheckoutUrl ?? null,
      bankDetails: settings.bankDetails,
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

    return (
      <div className="space-y-8">
        <InvoiceView invoice={viewModel} />
        <InvoicePayments invoiceId={detail.id} payments={payments} />
        <InvoiceAttachments invoiceId={detail.id} attachments={attachments} />

        {/* Activity Log */}
        <InvoiceActivity invoiceId={detail.id} />

        {/* Messages - Full Width */}
        <div className="rounded-3xl border border-border bg-surface-overlay shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border">
            <h2 className="text-base font-medium">Messages</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Communicate with the client about this invoice
            </p>
          </div>
          <div className="h-[600px]">
            <Conversation invoiceId={detail.id} currentUserRole="ADMIN" />
          </div>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}

function SupplementaryPanels({ detail }: { detail: InvoiceDetail }) {
  const payments: InvoicePaymentRecord[] = detail.payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    method: payment.method,
    reference: payment.reference,
    notes: payment.notes,
    paidAt: payment.paidAt.toISOString(),
  }));

  const attachments: InvoiceAttachmentRecord[] = detail.attachments.map(
    (attachment) => ({
      id: attachment.id,
      filename: attachment.filename,
      filetype: attachment.filetype,
      size: attachment.size,
      uploadedAt: attachment.uploadedAt.toISOString(),
    }),
  );

  return (
    <div className="space-y-6">
      <InvoicePayments invoiceId={detail.id} payments={payments} />
      <InvoiceAttachments invoiceId={detail.id} attachments={attachments} />
    </div>
  );
}
