import { ChangePasswordForm } from "@/components/account/change-password-form";
import { requireClient } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function ClientAccountPage() {
  const user = await requireClient();

  return (
    <div className="container max-w-2xl space-y-6 py-6 sm:py-8">
      {/* Header - Mobile optimized */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Account Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Manage your account security and contact information
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="mb-4 text-lg font-semibold sm:text-xl">Security</h2>
          <ChangePasswordForm email={user.email} />
        </section>
      </div>
    </div>
  );
}
