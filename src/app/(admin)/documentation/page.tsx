import { requireAdmin } from "@/lib/auth-utils";
import { DocumentationView } from "@/components/documentation/documentation-view";
import { getSettings } from "@/server/services/settings";
import { listMaterials } from "@/server/services/materials";
import type { SettingsPayload } from "@/components/settings/settings-form";

function serializeSettings(settings: Awaited<ReturnType<typeof getSettings>>): SettingsPayload | null {
  if (!settings) return null;
  return {
    ...settings,
    createdAt: settings.createdAt?.toISOString(),
    updatedAt: settings.updatedAt?.toISOString(),
  };
}

export default async function DocumentationPage() {
  await requireAdmin();

  const [settings, materials] = await Promise.all([
    getSettings(),
    listMaterials(),
  ]);

  const serializedSettings = serializeSettings(settings);

  if (!serializedSettings) {
    return <div>Settings not found</div>;
  }

  return (
    <DocumentationView
      settings={serializedSettings}
      materials={materials}
    />
  );
}
