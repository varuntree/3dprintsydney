"use client";

import { usePathname } from "next/navigation";
import { NAV_SECTIONS, QUICK_ACTIONS } from "@/lib/navigation";
import { getIcon } from "@/lib/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NavigationLink } from "@/components/ui/navigation-link";
import { NavigationDrawer } from "@/components/ui/navigation-drawer";
import { RouteProgressBar } from "@/components/ui/route-progress-bar";

interface AppShellProps {
  children: React.ReactNode;
}

// Consistent button styles for header actions
const HEADER_BUTTON_STYLES =
  "h-10 min-w-[8.5rem] max-w-[14rem] items-center justify-center gap-2 overflow-hidden rounded-md border border-zinc-200/80 bg-white/85 px-4 text-sm font-medium text-zinc-700 shadow-xs backdrop-blur transition-colors hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10 disabled:pointer-events-none disabled:opacity-50";

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 text-zinc-900">
      <aside className="hidden w-[260px] flex-col border-r border-zinc-200/60 bg-white/70 backdrop-blur-xl shadow-sm lg:flex">
        <div className="flex h-20 items-center gap-2 px-6">
          <div className="h-10 w-10 rounded-xl border border-zinc-200/80 bg-white/80 backdrop-blur flex items-center justify-center text-sm font-semibold tracking-wider">
            3D
          </div>
          <div>
            <p className="text-sm uppercase text-zinc-500">Operations</p>
            <p className="text-lg font-semibold tracking-tight">Print Studio</p>
          </div>
        </div>
        <Separator className="mx-6" />
        <ScrollArea className="flex-1 px-4 py-4">
          <nav className="flex flex-col gap-6">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title ?? "main"} className="space-y-3">
                {section.title ? (
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                    {section.title}
                  </p>
                ) : null}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = getIcon(item.icon);
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    return (
                      <NavigationLink
                        key={item.href}
                        href={item.href}
                        active={active}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </NavigationLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-zinc-200/60 bg-white/70 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <NavigationDrawer />
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
                  Daily Console
                </h1>
                <p className="text-sm text-zinc-500">
                  Manage quotes, invoices, jobs, and printers at a glance.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {QUICK_ACTIONS.map((action) => {
                const Icon = getIcon(action.icon);
                return (
                  <NavigationLink
                    key={action.href}
                    href={action.href}
                    className={HEADER_BUTTON_STYLES}
                    title={action.name}
                    fullWidth={false}
                    aria-label={action.name}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{action.name}</span>
                  </NavigationLink>
                );
              })}
            </div>
          </div>
          <RouteProgressBar className="border-t border-zinc-200/60" />
        </header>
        <main className="flex-1 bg-transparent px-6 py-10">
          <div className="mx-auto w-full max-w-[1400px] space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
