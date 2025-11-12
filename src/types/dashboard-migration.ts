/**
 * Migration plan for renaming dashboard totals from orders to projects.
 * @deprecated This roadmap is temporary and should be removed once the platform fully adopts `totalProjects`.
 */
export type DashboardStatsLegacy = {
  /** @deprecated Use `totalProjects` instead; `totalOrders` will be dropped after the migration completes. */
  totalOrders: number;
  pendingCount: number;
  paidCount: number;
  totalSpent: number;
  walletBalance: number;
};

export type MigrationStep = {
  id: string;
  summary: string;
  status: "todo" | "in-progress" | "done";
  owners: string[];
  detail: string[];
};

export const dashboardMigrationPlan: MigrationStep[] = [
  {
    id: "backend-total-projects",
    summary: "Expose `totalProjects` alongside `totalOrders` in dashboard responses",
    status: "todo",
    owners: ["api-team", "supabase"],
    detail: [
      "Update `getClientDashboardStats` and the public dashboard snapshot query to select `totalProjects` (or compute it before returning).",
      "Keep returning `totalOrders` for backward compatibility while consumers migrate, and document the new field in the API contract.",
      "Log and monitor both counters to ensure they report identical values for existing clients before removing the legacy field."
    ],
  },
  {
    id: "ui-preference",
    summary: "Have UI types prefer `totalProjects` while still reading legacy data",
    status: "in-progress",
    owners: ["web-team"],
    detail: [
      "Normalize the dashboard payload so `DashboardStats.totalProjects` derives from `totalProjects` or falls back to `totalOrders`.",
      "Update client-side types, copy, and documentation to use the new terminology (Projects).",
      "Keep TODO comments in code to remind engineers to drop `totalOrders` once the backend switches over."
    ],
  },
  {
    id: "deprecation-cleanup",
    summary: "Deprecate and remove `totalOrders` after the brand transition completes",
    status: "todo",
    owners: ["platform"],
    detail: [
      "Publish deprecation notes stating that `totalOrders` is deprecated and will be removed in the next major release.",
      "Verify no code paths rely on `totalOrders` (both UI and API clients) before deleting the field.",
      "Release an endpoint version (or flag) where only `totalProjects` is returned, then retire the legacy key."
    ],
  },
];

export const migrationHighlights = {
  primaryType: "DashboardStats",
  focusFields: ["totalOrders", "totalProjects"],
  apiImpact: ["getClientDashboardStats"],
  notes: [
    "DashboardSnapshot currently only reports `totalOrders` for the client stats card; it should mirror the new project terminology once backend is ready.",
    "Use this plan as the single source of truth before removing any legacy fields so the client and backend stay in sync."
  ]
};
