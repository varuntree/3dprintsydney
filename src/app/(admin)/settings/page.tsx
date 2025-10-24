import {
  SettingsForm,
  type SettingsPayload,
} from "@/components/settings/settings-form";
import { getSettings } from "@/server/services/settings";
import { requireAdmin } from "@/lib/auth-utils";

export default async function SettingsPage() {
  const user = await requireAdmin();
  const settings = await getSettings();
  const initial = JSON.parse(JSON.stringify(settings)) as SettingsPayload;

  return <SettingsForm initial={initial} user={user} />;
}
