import { notFound } from "next/navigation";
import {
  InvoiceEditor,
  type InvoiceFormValues,
} from "@/components/invoices/invoice-editor";
import { InvoiceActions } from "@/components/invoices/invoice-actions";
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
import { getInvoiceDetail } from "@/server/services/invoices";
import { listProductTemplates } from "@/server/services/product-templates";

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoicePageProps) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id)) {
    notFound();
  }

  try {
    const [detail, clients, settings, templates] = await Promise.all([
      getInvoiceDetail(id),
      listClients(),
      getSettings(),
      listProductTemplates(),
    ]);

    if (!settings) {
      notFound();
    }

    const initialValues: InvoiceFormValues = {
      clientId: detail.client.id,
      issueDate: detail.issueDate.toISOString().slice(0, 10),
      dueDate: detail.dueDate
        ? detail.dueDate.toISOString().slice(0, 10)
        : undefined,
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

    const stripeReady = Boolean(
      settings.stripeSecretKey && settings.stripePublishableKey,
    );

    return (
      <div className="space-y-6">
        <InvoiceActions
          invoiceId={detail.id}
          invoiceNumber={detail.number}
          status={detail.status}
          balanceDue={detail.balanceDue}
          total={detail.total}
          currency={settings.defaultCurrency ?? "AUD"}
          dueDate={detail.dueDate ? detail.dueDate.toISOString() : null}
          paidAt={detail.paidAt ? detail.paidAt.toISOString() : null}
          stripeReady={stripeReady}
        />
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
        />
        <InvoicePayments invoiceId={detail.id} payments={payments} />
        <InvoiceAttachments invoiceId={detail.id} attachments={attachments} />
      </div>
    );
  } catch {
    notFound();
  }
}
