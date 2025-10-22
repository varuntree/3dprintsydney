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
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar - Mobile optimized logo/branding */}
      <aside className="sticky top-0 hidden h-[100svh] w-[260px] flex-col overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground backdrop-blur lg:flex">
        <div className="flex h-20 items-center gap-3 px-6">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border/80 bg-gradient-to-br from-blue-600/10 to-cyan-500/10 text-sm font-semibold tracking-wider shadow-sm">
            3D
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] uppercase tracking-[0.35em] text-muted-foreground/80">
              Client Portal
            </p>
            <p className="truncate text-lg font-semibold tracking-tight text-foreground">
              Print Studio
            </p>
          </div>
        </div>
        <Separator className="mx-6 bg-border" />
        <ScrollArea className="flex-1 min-h-0 px-4 py-4">
          <nav className="flex flex-col gap-6">
            {CLIENT_NAV_SECTIONS.map((section) => (
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
          <div className="rounded-xl border border-border/60 bg-surface-overlay/60 p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-blue-600/10 to-cyan-500/10 text-sm font-medium">
                {user.email[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.email}</p>
                <span className="mt-1 inline-flex items-center rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {user.role}
                </span>
              </div>
            </div>
            <Link
              href="/client/account"
              className="mt-3 block w-full rounded-md border border-border/60 px-3 py-2 text-sm text-foreground transition hover:border-blue-500 hover:bg-blue-500/10"
            >
              Account settings
            </Link>
            <button
              onClick={handleLogout}
              title="Logout"
              className="mt-3 w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Header - Mobile optimized: reduced height on small screens */}
        <header className="sticky top-0 z-40 border-b border-border bg-surface-overlay backdrop-blur">
          <div className="flex min-h-[4rem] items-center justify-between gap-3 px-4 py-3 sm:min-h-[5rem] sm:gap-4 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <NavigationDrawer />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  My Dashboard
                </h1>
                <p className="hidden text-sm text-muted-foreground sm:block">
                  Manage your orders and messages.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Logout button - mobile optimized touch target */}
              <button
                onClick={handleLogout}
                className="min-h-[44px] rounded-full border border-red-200 px-3 py-2 text-sm text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
                aria-label="Logout"
              >
                Logout
              </button>
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
