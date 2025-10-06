import {
  InvoicesView,
  type InvoiceSummaryRecord,
} from "@/components/invoices/invoices-view";
import { listInvoices } from "@/server/services/invoices";

export default async function InvoicesPage() {
  const invoices = await listInvoices();
  const initial: InvoiceSummaryRecord[] = invoices.map((invoice) => ({
    ...invoice,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
  }));

  return <InvoicesView initial={initial} />;
}
