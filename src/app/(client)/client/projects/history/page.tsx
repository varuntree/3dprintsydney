import { PrintAgainView } from "@/components/client/print-again-view";

export default function PrintAgainPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Print Again</h1>
        <p className="text-sm text-muted-foreground">Redo past projects with the same configuration.</p>
      </div>

      <PrintAgainView />
    </div>
  );
}
