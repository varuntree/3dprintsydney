import {
  PrintersView,
  type PrinterRecord,
} from "@/components/printers/printers-view";
import { listPrinters } from "@/server/services/printers";

export default async function PrintersPage() {
  const printers = await listPrinters();
  const initial: PrinterRecord[] = printers.map((printer) => ({
    ...printer,
    createdAt: printer.createdAt.toISOString(),
    updatedAt: printer.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PrintersView initialPrinters={initial} />
    </div>
  );
}
