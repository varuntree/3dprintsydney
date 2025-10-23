import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth-utils";

/**
 * Public Route Group Layout
 *
 * This layout wraps public pages (login, signup).
 * - Redirects authenticated users to their appropriate dashboard
 * - Minimal styling for auth pages
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is already authenticated
  const user = await getOptionalUser();

  // Redirect authenticated users to their dashboard
  if (user) {
    if (user.role === "ADMIN") {
      redirect("/dashboard");
    } else {
      redirect("/client");
    }
  }

  // Minimal wrapper for public pages
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface-canvas px-4 py-12">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-primary/25 via-primary/10 to-transparent blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-40 bottom-24 -z-10 hidden h-72 w-72 rounded-full bg-primary/10 blur-3xl sm:block"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-32 top-1/3 -z-10 hidden h-80 w-80 rounded-full bg-amber-200/20 blur-3xl sm:block"
        aria-hidden="true"
      />
      <div className="w-full max-w-5xl">{children}</div>
    </div>
  );
}
