"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { OWNER_NAV_SECTIONS, QUICK_ACTIONS } from "@/lib/navigation";
import { isNavItemActive } from "@/lib/nav-utils";
import { getIcon } from "@/lib/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NavigationLink } from "@/components/ui/navigation-link";
import { NavigationDrawer } from "@/components/ui/navigation-drawer";
import { ActionButton } from "@/components/ui/action-button";
import { MutationLoader } from "@/components/ui/mutation-loader";
import type { LegacyUser } from "@/lib/types/user";

interface AdminShellProps {
  children: React.ReactNode;
  user: LegacyUser;
}

/**
 * Admin Portal Shell
 *
 * Client component that provides:
 * - Desktop sidebar navigation
 * - Mobile navigation drawer
 * - Header with quick actions
 * - Logout functionality
 *
 * FIXED: Uses isNavItemActive() to prevent "/" from matching all paths
 */
export function AdminShell({ children, user }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-[100svh] w-[260px] flex-col overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground backdrop-blur lg:flex">
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
        <ScrollArea className="flex-1 min-h-0 px-4 py-4">
          <nav className="flex flex-col gap-6">
            {OWNER_NAV_SECTIONS.map((section) => (
              <div key={section.title ?? "main"} className="space-y-3">
                {section.title ? (
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/60">
                    {section.title}
                  </p>
                ) : null}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = getIcon(item.icon);
                    const active = isNavItemActive(item.href, pathname);
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

        {/* User Profile */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-overlay text-sm font-medium">
              {user.email[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.email}</p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{user.role}</p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <Link
              href="/account"
              className="block w-full rounded-md border border-border px-3 py-2 text-sm text-foreground transition hover:border-blue-500 hover:bg-blue-500/10"
            >
              Account settings
            </Link>
            <button
              onClick={handleLogout}
              className="w-full rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:border-red-600 hover:bg-red-600 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Header */}
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
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-red-200 px-3 py-1 text-sm text-red-600 hover:border-red-600 hover:bg-red-600 hover:text-white transition-colors"
                >
                  Logout
                </button>
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
                <button
                  onClick={handleLogout}
                  className="rounded-md px-2 py-1 text-sm text-red-600 hover:text-red-700 underline"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 bg-surface-canvas px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto w-full max-w-[1400px] space-y-6 sm:space-y-8">
            {children}
          </div>
        </main>
      </div>

      {/* Global Mutation Loading Indicator */}
      <MutationLoader />
    </div>
  );
}
