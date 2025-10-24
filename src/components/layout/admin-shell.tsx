"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { OWNER_NAV_SECTIONS, QUICK_ACTIONS } from "@/lib/navigation";
import { isNavItemActive } from "@/lib/nav-utils";
import { getIcon } from "@/lib/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavigationLink } from "@/components/ui/navigation-link";
import { NavigationDrawer } from "@/components/ui/navigation-drawer";
import { ActionButton } from "@/components/ui/action-button";
import { MutationLoader } from "@/components/ui/mutation-loader";
import type { LegacyUser } from "@/lib/types/user";
import { AnimatedCubeLogo } from "@/components/branding/animated-cube-logo";
import { Settings } from "lucide-react";

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
    <div className="flex min-h-svh w-full bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 z-30 hidden h-[100svh] w-[280px] border-r border-border bg-sidebar/95 text-sidebar-foreground backdrop-blur lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-border/70 bg-sidebar/90 px-6 pb-6 pt-[calc(1.75rem+env(safe-area-inset-top))]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-surface-overlay text-foreground">
                <AnimatedCubeLogo className="h-6 w-6 text-foreground" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.4em] text-muted-foreground/70">
                  Operations
                </p>
                <p className="truncate text-lg font-semibold tracking-tight text-foreground">
                  3D Print Sydney
                </p>
              </div>
            </div>
            {/* Keep only the Admin pill in the sidebar header */}
            <div className="mt-6 flex items-center justify-end gap-2 text-[11px] font-medium uppercase tracking-[0.35em] text-muted-foreground/70">
              <span className="flex shrink-0 items-center rounded-full border border-border/60 px-2 py-0.5 text-[10px] tracking-[0.3em] text-muted-foreground">
                Admin
              </span>
            </div>
          </div>
          <ScrollArea className="flex-1 px-6 py-6">
            <nav className="flex flex-col gap-7">
              {OWNER_NAV_SECTIONS.map((section) => (
                <div key={section.title ?? "main"} className="space-y-3">
                  {section.title ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/60">
                      {section.title}
                    </p>
                  ) : null}
                  <div className="space-y-1.5">
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
          <div className="border-t border-border/70 bg-sidebar/60 px-6 py-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-overlay text-sm font-medium">
                {user.email[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.email}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-svh flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-surface-overlay/80 backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/60">
          <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 pb-3 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6 md:px-8 md:pb-4">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <NavigationDrawer />
              <div className="min-w-0 flex-1 space-y-1">
                {/* Hide duplicated branding on desktop; show only on mobile */}
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground/70 sm:hidden">
                  Operations Console
                </p>
                <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:hidden">
                  3D Print Sydney
                </h1>
              </div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              {QUICK_ACTIONS.map((action) => {
                const Icon = getIcon(action.icon);
                return (
                  <ActionButton
                    key={action.href}
                    href={action.href}
                    variant="outline"
                    size="sm"
                    className="rounded-full border-border/70 bg-background/80 px-4 py-2 font-medium text-foreground shadow-sm shadow-black/5 transition hover:border-border hover:bg-background"
                    title={action.name}
                    aria-label={action.name}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{action.name}</span>
                  </ActionButton>
                );
              })}
              <Link
                href="/account"
                className="flex items-center justify-center rounded-full border border-border/70 bg-background/80 px-4 py-2 font-medium text-foreground shadow-sm shadow-black/5 transition hover:border-border hover:bg-background"
                title="Account settings"
                aria-label="Account settings"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden lg:inline ml-2">Settings</span>
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-full border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
          <div className="md:hidden">
            <div className="flex w-full gap-2 overflow-x-auto px-4 pb-3 pt-1 sm:px-6" role="list">
              {QUICK_ACTIONS.map((action) => {
                const Icon = getIcon(action.icon);
                return (
                  <ActionButton
                    key={action.href}
                    href={action.href}
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 rounded-full border border-border/60 bg-background/70 px-3 py-2 text-xs font-semibold shadow-sm shadow-black/5"
                    title={action.name}
                    aria-label={action.name}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {action.name}
                  </ActionButton>
                );
              })}
              <Link
                href="/account"
                className="flex-shrink-0 flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-3 py-2 text-xs font-semibold transition hover:border-border hover:bg-background"
                title="Account settings"
                aria-label="Account settings"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex-shrink-0 rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
                aria-label="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden bg-surface-canvas px-4 pb-[max(3.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-20 sm:pt-8 md:px-8">
          <div className="mx-auto w-full max-w-full space-y-6 sm:space-y-8 md:max-w-[1440px]">
            {children}
          </div>
        </main>
      </div>

      <MutationLoader />
    </div>
  );
}
