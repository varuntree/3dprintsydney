import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth-utils";

/**
 * Root Home Page
 *
 * Redirects based on authentication status:
 * - Unauthenticated → /login
 * - Admin authenticated → /dashboard
 * - Client authenticated → /client
 *
 * This complements the middleware routing logic and ensures
 * the root path "/" always redirects appropriately.
 */
export default async function HomePage() {
  const user = await getOptionalUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "ADMIN") {
    redirect("/dashboard");
  }

  redirect("/client");
}
