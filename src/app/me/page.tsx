export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUserFromCookies } from "@/server/auth/session";

export default async function MeRedirect() {
  const user = await getUserFromCookies();
  if (!user) redirect("/login");
  if (user.role === "CLIENT") redirect("/client/messages");
  redirect("/");
}
