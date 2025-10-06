"use client";

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
import type { User } from "@prisma/client";

interface ClientShellProps {
  children: React.ReactNode;
  user: User;
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
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-[100svh] w-[260px] flex-col overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground backdrop-blur lg:flex">
        <div className="flex h-20 items-center gap-2 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-overlay text-sm font-semibold tracking-wider">
            3D
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Client Portal
            </p>
            <p className="text-lg font-semibold tracking-tight text-foreground">
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
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-overlay text-sm font-medium">
              {user.email[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.email}</p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{user.role}</p>
            </div>
          </div>
          <Separator className="my-3" />
          <button
            onClick={handleLogout}
            className="w-full rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:border-red-600 hover:bg-red-600 hover:text-white transition-colors"
          >
            Logout
          </button>
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
                  My Dashboard
                </h1>
                <p className="hidden text-sm text-muted-foreground sm:block">
                  Manage your orders and messages.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="rounded-full border border-red-200 px-3 py-1 text-sm text-red-600 hover:border-red-600 hover:bg-red-600 hover:text-white transition-colors"
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
