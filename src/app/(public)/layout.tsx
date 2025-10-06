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
      redirect("/");
    } else {
      redirect("/client");
    }
  }

  // Minimal wrapper for public pages
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
