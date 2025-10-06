import {
  SettingsForm,
  type SettingsPayload,
} from "@/components/settings/settings-form";
import { getSettings } from "@/server/services/settings";
import { PageHeader } from "@/components/ui/page-header";

export default async function SettingsPage() {
  const settings = await getSettings();
  const initial = JSON.parse(JSON.stringify(settings)) as SettingsPayload;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure business identity, numbering, payments, and job policies."
      />
      <SettingsForm initial={initial} />
    </div>
  );
}
