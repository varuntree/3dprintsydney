import {
  InvoiceEditor,
  type InvoiceFormValues,
} from "@/components/invoices/invoice-editor";
import { listClients } from "@/server/services/clients";
import { getSettings } from "@/server/services/settings";
import { listProductTemplates } from "@/server/services/product-templates";

export default async function NewInvoicePage() {
  const [clients, settings, templates] = await Promise.all([
    listClients(),
    getSettings(),
    listProductTemplates(),
  ]);

  if (!settings) {
    throw new Error("Settings not configured");
  }

  const initialValues: InvoiceFormValues = {
    clientId: clients[0]?.id ?? 0,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: undefined,
    taxRate: settings.taxRate ?? 0,
    discountType: "NONE",
    discountValue: 0,
    shippingCost: 0,
    shippingLabel: settings.shippingOptions?.[0]?.label ?? "",
    notes: "",
    terms: settings.defaultPaymentTerms ?? "",
    lines: [
      {
        name: "Line item",
        description: "",
        quantity: 1,
        unit: "unit",
        unitPrice: 0,
        discountType: "NONE",
        discountValue: 0,
        productTemplateId: null,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <InvoiceEditor
        mode="create"
        initialValues={initialValues}
        invoiceId={undefined}
        clients={clients.map((client) => ({
          ...client,
          createdAt: client.createdAt.toISOString(),
        }))}
        settings={settings}
        templates={templates}
      />
    </div>
  );
}
