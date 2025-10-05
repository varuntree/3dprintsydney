"use client";

import { usePathname } from "next/navigation";
import { NAV_SECTIONS, QUICK_ACTIONS } from "@/lib/navigation";
import { getIcon } from "@/lib/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NavigationLink } from "@/components/ui/navigation-link";
import { NavigationDrawer } from "@/components/ui/navigation-drawer";
import { RouteProgressBar } from "@/components/ui/route-progress-bar";
import { ActionButton } from "@/components/ui/action-button";

interface AppShellProps {
  children: React.ReactNode;
}


export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-[260px] flex-col border-r border-border bg-sidebar text-sidebar-foreground backdrop-blur lg:flex">
        <div className="flex h-20 items-center gap-2 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-overlay text-sm font-semibold tracking-wider">
            3D
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Operations
            </p>
            <p className="text-lg font-semibold tracking-tight text-foreground">
              Print Studio
            </p>
          </div>
        </div>
        <Separator className="mx-6 bg-border" />
        <ScrollArea className="flex-1 px-4 py-4">
          <nav className="flex flex-col gap-6">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title ?? "main"} className="space-y-3">
                {section.title ? (
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/60">
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
        <header className="sticky top-0 z-40 border-b border-border bg-surface-overlay backdrop-blur">
          <div className="flex min-h-[5rem] items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <NavigationDrawer />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  Daily Console
                </h1>
                <p className="hidden text-sm text-muted-foreground sm:block">
                  Manage quotes, invoices, jobs, and printers at a glance.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 sm:flex">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = getIcon(action.icon);
                  return (
                    <ActionButton
                      key={action.href}
                      href={action.href}
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      title={action.name}
                      aria-label={action.name}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden lg:inline">{action.name}</span>
                    </ActionButton>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 sm:hidden">
                {QUICK_ACTIONS.slice(0, 2).map((action) => {
                  const Icon = getIcon(action.icon);
                  return (
                    <ActionButton
                      key={action.href}
                      href={action.href}
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      title={action.name}
                      aria-label={action.name}
                    >
                      <Icon className="h-4 w-4" />
                    </ActionButton>
                  );
                })}
              </div>
            </div>
          </div>
          <RouteProgressBar className="border-t border-border" />
        </header>
        <main className="flex-1 bg-surface-canvas px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto w-full max-w-[1400px] space-y-6 sm:space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
