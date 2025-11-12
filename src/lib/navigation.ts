export type NavSection = {
  title?: string;
  items: { name: string; href: string; icon: string }[];
};

export const OWNER_NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { name: "Dashboard", href: "/dashboard", icon: "layout-dashboard" },
      { name: "Clients", href: "/clients", icon: "users" },
      { name: "Quotes", href: "/quotes", icon: "file-text" },
      { name: "Invoices", href: "/invoices", icon: "receipt" },
      { name: "Jobs", href: "/jobs", icon: "workflow" },
    ],
  },
  {
    title: "Catalog",
    items: [
      { name: "Materials", href: "/dashboard/materials-admin", icon: "beaker" },
      { name: "Products", href: "/products", icon: "package" },
      { name: "Printers", href: "/printers", icon: "printer" },
    ],
  },
  {
    title: "Operations",
    items: [
      { name: "Messages", href: "/messages", icon: "messages-square" },
      { name: "Reports", href: "/reports", icon: "bar-chart-3" },
      { name: "Business Guide", href: "/business-guide", icon: "book-open" },
      { name: "Documentation", href: "/documentation", icon: "file-text" },
      { name: "Settings", href: "/settings", icon: "settings" },
    ],
  },
];

export const QUICK_ACTIONS = [
  { name: "New Quote", href: "/quotes/new", icon: "file-plus" },
  { name: "New Invoice", href: "/invoices/new", icon: "receipt" },
  { name: "New Client", href: "/clients/new", icon: "user-plus" },
];

export const CLIENT_NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { name: "Home", href: "/client", icon: "home" },
      { name: "QuickPrint", href: "/quick-order", icon: "rocket" },
      { name: "Projects", href: "/client/orders", icon: "receipt" },
      { name: "Messages", href: "/client/messages", icon: "messages-square" },
      { name: "Settings", href: "/client/account", icon: "settings" },
    ],
  },
  {
    title: "Projects",
    items: [
      { name: "New Project", href: "/quick-order", icon: "plus" },
      { name: "Active Projects", href: "/client/projects/active", icon: "clock" },
      { name: "Print Again", href: "/client/projects/history", icon: "repeat" },
    ],
  },
];

export function getNavSections(role: "ADMIN" | "CLIENT" | null | undefined): NavSection[] {
  if (role === "CLIENT") return CLIENT_NAV_SECTIONS;
  if (role === "ADMIN") return OWNER_NAV_SECTIONS;
  return OWNER_NAV_SECTIONS;
}
