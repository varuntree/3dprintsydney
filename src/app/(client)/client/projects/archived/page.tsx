import { ArchivedProjectsView } from "@/components/client/archived-projects-view";

export default function ArchivedProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Archived Projects</h1>
        <p className="text-sm text-muted-foreground">Restore archived projects or keep them in storage.</p>
      </div>

      <ArchivedProjectsView />
    </div>
  );
}
