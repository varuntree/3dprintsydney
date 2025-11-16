export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUserFromCookies } from "@/server/auth/session";
import { ClientDashboard } from "@/components/client/client-dashboard";
import { getClientDashboardStats } from "@/server/services/dashboard";

export default async function ClientHome() {
  const user = await getUserFromCookies();
  if (!user) redirect("/login");
  if (user.role !== "CLIENT") redirect("/dashboard");

  const stats = await getClientDashboardStats(user.clientId);

  return <ClientDashboard initial={stats} userEmail={user.email} />;
}
