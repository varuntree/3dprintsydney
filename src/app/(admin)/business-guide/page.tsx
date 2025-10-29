import { requireAdmin } from "@/lib/auth-utils";
import { BusinessGuideView } from "@/components/business-guide/business-guide-view";
import { getSettings } from "@/server/services/settings";
import { listMaterials } from "@/server/services/materials";
import { getServiceSupabase } from "@/server/supabase/service-client";
import type { SettingsPayload } from "@/components/settings/settings-form";

/**
 * Fetch recent example invoices for real-world calculation examples
 * Returns anonymized invoice data showing actual calculations
 */
async function getExampleInvoices() {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("invoices")
    .select(`
      id,
      number,
      subtotal,
      tax:tax_total,
      shipping_cost,
      shipping_label,
      total,
      discount_type,
      discount_value,
      tax_rate,
      credit_applied,
      invoice_items (
        id,
        name,
        description,
        quantity,
        unit_price,
        discount_type,
        discount_value,
        total
      )
    `)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("Failed to fetch example invoices:", {
      message: (error as { message?: string })?.message,
      details: (error as { details?: unknown })?.details,
      hint: (error as { hint?: unknown })?.hint,
      code: (error as { code?: unknown })?.code,
    });
    return [];
  }

  return data || [];
}

function serializeSettings(settings: Awaited<ReturnType<typeof getSettings>>): SettingsPayload | null {
  if (!settings) return null;
  return {
    ...settings,
    createdAt: settings.createdAt?.toISOString(),
    updatedAt: settings.updatedAt?.toISOString(),
  };
}

export default async function BusinessGuidePage() {
  await requireAdmin();

  // Fetch all data needed for the business guide
  const [settings, materials, exampleInvoices] = await Promise.all([
    getSettings(),
    listMaterials(),
    getExampleInvoices(),
  ]);

  const serializedSettings = serializeSettings(settings);

  if (!serializedSettings) {
    return <div>Settings not found</div>;
  }

  return (
    <BusinessGuideView
      settings={serializedSettings}
      materials={materials}
      exampleInvoices={exampleInvoices}
    />
  );
}
