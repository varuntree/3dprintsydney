export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { DashboardView, type DashboardClientSnapshot } from "@/components/dashboard/dashboard-view";
import { getDashboardSnapshot } from "@/server/services/dashboard";
import { getUserFromCookies } from "@/server/auth/session";

export default async function DashboardPage() {
  const user = await getUserFromCookies();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/client");
  const snapshot = await getDashboardSnapshot();
  const initial: DashboardClientSnapshot = {
    metrics: snapshot.metrics,
    revenueTrend: snapshot.revenueTrend,
    quoteStatus: snapshot.quoteStatus,
    jobSummary: snapshot.jobSummary,
    outstandingInvoices: snapshot.outstandingInvoices,
    recentActivity: snapshot.recentActivity,
    recentActivityNextOffset: snapshot.recentActivityNextOffset,
    projectCounters: snapshot.projectCounters,
  };

  return <DashboardView initial={initial} user={user} />;
}
