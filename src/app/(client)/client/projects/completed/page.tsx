import { CompletedProjectsView } from "@/components/client/completed-projects-view";

export default function CompletedProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Completed Projects</h1>
        <p className="text-sm text-muted-foreground">Archive the completed jobs once they are done.</p>
      </div>

      <CompletedProjectsView />
    </div>
  );
}
