import {
  SettingsForm,
  type SettingsPayload,
} from "@/components/settings/settings-form";
import { getSettings } from "@/server/services/settings";

export default async function SettingsPage() {
  const settings = await getSettings();
  const initial = JSON.parse(JSON.stringify(settings)) as SettingsPayload;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Settings</h2>
          <p className="text-sm text-zinc-500">
            Configure business identity, numbering, payments, and job policies.
          </p>
        </div>
      </div>
      <SettingsForm initial={initial} />
    </div>
  );
}
