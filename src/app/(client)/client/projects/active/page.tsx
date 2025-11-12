import { ActiveProjectsView } from "@/components/client/active-projects-view";

export default function ActiveProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Active Projects</h1>
        <p className="text-sm text-muted-foreground">Track the work that is currently in production.</p>
      </div>

      <ActiveProjectsView />
    </div>
  );
}
