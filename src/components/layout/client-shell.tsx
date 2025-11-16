"use client";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { CLIENT_NAV_SECTIONS } from "@/lib/navigation";
import { isNavItemActive } from "@/lib/nav-utils";
import { getIcon } from "@/lib/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavigationLink } from "@/components/ui/navigation-link";
import { NavigationDrawer } from "@/components/ui/navigation-drawer";
import { MutationLoader } from "@/components/ui/mutation-loader";
import type { LegacyUser } from "@/lib/types/user";
import { GraduationCap } from "lucide-react";
import { AnimatedCubeLogo } from "@/components/branding/animated-cube-logo";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";

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
      <aside className="sticky top-0 z-30 hidden h-[100svh] supports-[height:100dvh]:h-[100dvh] w-[270px] border-r border-border bg-sidebar/95 text-sidebar-foreground backdrop-blur lg:block">
        <div className="flex h-full flex-col">
          <div className="flex min-h-[92px] items-center border-b border-border/70 bg-sidebar/90 px-6 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] md:pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-br from-blue-600/10 via-cyan-500/10 to-sky-400/10">
                <AnimatedCubeLogo className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] uppercase tracking-[0.4em] text-muted-foreground/70">
                  Client Portal
                </p>
                <p className="truncate text-lg font-semibold tracking-tight text-foreground">
                  3D Print Sydney
                </p>
              </div>
            </div>
          </div>
          <ScrollArea className="flex-1 px-6 py-6">
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
                      const shouldHighlight = item.highlight ?? true;
                      const Icon = getIcon(item.icon);
                      const active = shouldHighlight
                        ? isNavItemActive(item.href, pathname)
                        : false;
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
        </div>
      </aside>

      <div className="flex min-h-svh flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-surface-overlay/80 backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/60">
          <div className="mx-auto flex min-h-[92px] w-full max-w-[1440px] items-center justify-between gap-3 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6 md:px-8 md:pb-5">
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
            <div className="flex items-center gap-2">
              <NotificationDropdown user={user} />
              <button
                onClick={handleLogout}
                className="min-h-[44px] flex items-center justify-center rounded-full border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
                aria-label="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden bg-surface-canvas px-4 pb-[max(3.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pb-20 sm:pt-3 md:px-8">
          <div className="mx-auto w-full max-w-full md:max-w-[1440px]">
            {children}
          </div>
        </main>
      </div>

      <MutationLoader />
    </div>
  );
}
