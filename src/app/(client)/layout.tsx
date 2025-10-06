import { requireClient } from "@/lib/auth-utils";
import { ClientShell } from "@/components/layout/client-shell";

/**
 * Client Route Group Layout
 *
 * This layout wraps all client pages.
 * - Validates CLIENT role server-side (no flicker)
 * - Provides ClientShell with navigation and header
 */
export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side role validation - blocks ADMIN users before render
  const user = await requireClient();

  return <ClientShell user={user}>{children}</ClientShell>;
}
