import { ChangePasswordForm } from "@/components/account/change-password-form";
import { requireAuth } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireAuth("/account");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Account Security</h1>
        <p className="text-sm text-muted-foreground">
          Update your password regularly to keep your account secure.
        </p>
      </div>
      <ChangePasswordForm email={user.email} />
    </div>
  );
}
