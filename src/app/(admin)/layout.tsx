import { requireAdmin } from "@/lib/auth-utils";
import { AdminShell } from "@/components/layout/admin-shell";

/**
 * Admin Route Group Layout
 *
 * This layout wraps all admin pages.
 * - Validates ADMIN role server-side (no flicker)
 * - Provides AdminShell with navigation and header
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side role validation - blocks CLIENT users before render
  const user = await requireAdmin();

  return <AdminShell user={user}>{children}</AdminShell>;
}
