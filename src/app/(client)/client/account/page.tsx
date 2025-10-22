import { ChangePasswordForm } from "@/components/account/change-password-form";
import { requireClient } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function ClientAccountPage() {
  const user = await requireClient();

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account security and contact information
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">Security</h2>
          <ChangePasswordForm email={user.email} />
        </section>
      </div>
    </div>
  );
}
