export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUserFromCookies } from "@/server/auth/session";
import { ClientDashboard } from "@/components/client/client-dashboard";

export default async function ClientHome() {
  const user = await getUserFromCookies();
  if (!user) redirect("/login");
  if (user.role !== "CLIENT") redirect("/");

  return <ClientDashboard />;
}
