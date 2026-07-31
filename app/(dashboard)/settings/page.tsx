import { redirect } from "next/navigation";
import { getCurrentUser, needsTwoFactorSetup } from "@/lib/session";
import { AppShell } from "@/components/shared/app-shell";
import { ChangePasswordForm, TwoFactorSettings } from "@/components/shared/settings-panels";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell role={user.role}>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h2 className="text-headline-lg text-primary tracking-tight">Account Settings</h2>
          <p className="mt-1 text-body-lg text-on-secondary-container">{user.email}</p>
        </div>

        <div className="rounded-xl border bg-surface-container-lowest p-8 shadow-sm">
          <h3 className="mb-6 text-headline-md">Two-Factor Authentication</h3>
          <TwoFactorSettings
            role={user.role}
            initialEnabled={user.totpEnabled}
            mandatory={needsTwoFactorSetup(user)}
          />
        </div>

        <div className="rounded-xl border bg-surface-container-lowest p-8 shadow-sm">
          <h3 className="mb-6 text-headline-md">Change Password</h3>
          <ChangePasswordForm />
        </div>
      </div>
    </AppShell>
  );
}
