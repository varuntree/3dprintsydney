export const dynamic = "force-dynamic";

import { DashboardView, type DashboardClientSnapshot } from "@/components/dashboard/dashboard-view";
import { getDashboardSnapshot } from "@/server/services/dashboard";

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();
  const initial: DashboardClientSnapshot = {
    metrics: snapshot.metrics,
    revenueTrend: snapshot.revenueTrend,
    quoteStatus: snapshot.quoteStatus,
    jobSummary: snapshot.jobSummary,
    outstandingInvoices: snapshot.outstandingInvoices,
    recentActivity: snapshot.recentActivity,
    recentActivityNextOffset: snapshot.recentActivityNextOffset,
  };

  return <DashboardView initial={initial} />;
}
