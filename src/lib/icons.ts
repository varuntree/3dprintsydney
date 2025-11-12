import {
  BarChart3,
  Beaker,
  Clock,
  FilePlus,
  FileText,
  Home,
  LayoutDashboard,
  MessagesSquare,
  Package,
  Plus,
  Printer,
  Repeat,
  Rocket,
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
  home: Home,
  "messages-square": MessagesSquare,
  rocket: Rocket,
  plus: Plus,
  clock: Clock,
  repeat: Repeat,
} as const;

export type IconName = keyof typeof iconMap;

export function getIcon(name: string) {
  return iconMap[name as IconName] ?? LayoutDashboard;
}
