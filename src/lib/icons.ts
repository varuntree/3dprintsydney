import {
  BarChart3,
  Beaker,
  FilePlus,
  FileText,
  LayoutDashboard,
  Package,
  Printer,
  Receipt,
  Settings,
  UserPlus,
  Users,
  Workflow,
} from "lucide-react";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  users: Users,
  "file-text": FileText,
  receipt: Receipt,
  workflow: Workflow,
  beaker: Beaker,
  package: Package,
  printer: Printer,
  "bar-chart-3": BarChart3,
  settings: Settings,
  "file-plus": FilePlus,
  "user-plus": UserPlus,
} as const;

export type IconName = keyof typeof iconMap;

export function getIcon(name: string) {
  return iconMap[name as IconName] ?? LayoutDashboard;
}
