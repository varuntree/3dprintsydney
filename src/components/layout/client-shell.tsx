"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { CLIENT_NAV_SECTIONS } from "@/lib/navigation";
import { isNavItemActive } from "@/lib/nav-utils";
import { getIcon } from "@/lib/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NavigationLink } from "@/components/ui/navigation-link";
import { NavigationDrawer } from "@/components/ui/navigation-drawer";
import { MutationLoader } from "@/components/ui/mutation-loader";
import type { LegacyUser } from "@/lib/types/user";
import { GraduationCap } from "lucide-react";

interface ClientShellProps {
  children: React.ReactNode;
  user: LegacyUser;
}

/**
 * Client Portal Shell
 *
 * Client component that provides:
 * - Desktop sidebar navigation
 * - Mobile navigation drawer
 * - Header
 * - Logout functionality
 *
 * FIXED: Uses isNavItemActive() to prevent navigation highlighting bugs
 */
export function ClientShell({ children, user }: ClientShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="flex min-h-svh w-full bg-background text-foreground">
      <aside className="sticky top-0 z-30 hidden h-[100svh] w-[270px] border-r border-border bg-sidebar/95 text-sidebar-foreground backdrop-blur lg:block">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-6 pb-5 pt-8">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-br from-blue-600/10 via-cyan-500/10 to-sky-400/10 text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">
              3D
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] uppercase tracking-[0.4em] text-muted-foreground/70">
                Client Portal
              </p>
              <p className="truncate text-lg font-semibold tracking-tight text-foreground">
                Print Studio
              </p>
            </div>
          </div>
          <Separator className="mx-4" />
          <ScrollArea className="flex-1 px-4 py-6">
            <nav className="flex flex-col gap-7">
              {CLIENT_NAV_SECTIONS.map((section) => (
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
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600/15 via-cyan-500/15 to-sky-400/15 text-sm font-medium">
                  {user.email[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.email}</p>
                  <span className="mt-1 inline-flex items-center rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {user.role}
                  </span>
                  {user.studentDiscountEligible ? (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      <GraduationCap className="h-3 w-3" />
                      {user.studentDiscountRate ?? 0}% off
                    </span>
                  ) : null}
                </div>
              </div>
              <Link
                href="/client/account"
                className="mt-3 block w-full rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground transition hover:border-border hover:bg-background/50 hover:text-foreground"
              >
                Account settings
              </Link>
              <button
                onClick={handleLogout}
                title="Logout"
                className="mt-3 w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
                aria-label="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-svh flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-surface-overlay/80 backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/60">
          <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 pb-3 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6 md:px-8 md:pb-4">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <NavigationDrawer />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="hidden text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground/70 sm:block">
                  Client Portal
                </p>
                <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  My Workspace
                </h1>
                {user.studentDiscountEligible ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    <GraduationCap className="h-3 w-3" />
                    {user.studentDiscountRate ?? 0}% student discount active
                  </span>
                ) : null}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="hidden min-h-[44px] items-center justify-center rounded-full border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white md:inline-flex"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
          <div className="md:hidden">
            <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1 sm:px-6" role="list">
              <button
                onClick={handleLogout}
                className="flex min-h-[44px] flex-shrink-0 items-center justify-center rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
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
