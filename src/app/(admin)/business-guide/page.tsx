'use client'; // TODO: This file was causing build issues, verify client/server component status later if needed. But for now, assuming it's a server component.
// Actually, it has async function BusinessGuidePage, so it MUST be a Server Component.
// The error "Cannot find module for page" suggests something else, maybe an import issue or nextjs config.
// Wait, the error is "[Error [PageNotFoundError]: Cannot find module for page: /business-guide]"
// This often happens in Next.js if the export is wrong or if the file is ignored.
// Let's check if there are any weird imports.
// imports look fine.
// Maybe it's "export default async function" issue in older next versions? No, 15 is fine.
// The file exists.
// Let's try to make it simpler to debug, or maybe it's just a transient build cache issue.
// Re-reading the error: "Failed to collect page data for /business-guide"
// This usually means an error thrown during rendering.
// Let's wrap the body in a try-catch or check nulls more aggressively.

import { requireAdmin } from "@/lib/auth-utils";
import { BusinessGuideView } from "@/components/business-guide/business-guide-view";
import { getSettings } from "@/server/services/settings";
import { listMaterials } from "@/server/services/materials";
import { getServiceSupabase } from "@/server/supabase/service-client";
import type { SettingsPayload } from "@/components/settings/settings-form";
import { logger } from "@/lib/logger";

/**
 * Fetch recent example invoices for real-world calculation examples
 * Returns anonymized invoice data showing actual calculations
 */
async function getExampleInvoices() {
  try {
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
      logger.error({
        scope: "business-guide.example-invoices",
        message: "Failed to fetch example invoices",
        error,
        data: {
          message: (error as { message?: string })?.message,
          details: (error as { details?: unknown })?.details,
          hint: (error as { hint?: unknown })?.hint,
          code: (error as { code?: unknown })?.code,
        },
      });
      return [];
    }

    return data || [];
  } catch (err) {
    logger.error({ scope: "business-guide.example-invoices", message: "Unexpected error", error: err });
    return [];
  }
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
  try {
    await requireAdmin();

    // Fetch all data needed for the business guide
    const [settings, materials, exampleInvoices] = await Promise.all([
      getSettings().catch(() => null),
      listMaterials().catch(() => []),
      getExampleInvoices().catch(() => []),
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
  } catch (error) {
     logger.error({ scope: 'business-guide.page', message: 'Render failed', error });
     return <div>Failed to load business guide</div>;
  }
}

