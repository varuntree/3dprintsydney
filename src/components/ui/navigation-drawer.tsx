"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { Menu } from "lucide-react";
import { getNavSections, QUICK_ACTIONS } from "@/lib/navigation";
import { getIcon } from "@/lib/icons";
import { isNavItemActive } from "@/lib/nav-utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavigationLink } from "./navigation-link";

type DrawerUser = {
  email: string;
  role: "ADMIN" | "CLIENT";
};

export function NavigationDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<DrawerUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok) {
          return null;
        }
        const { data } = await r.json();
        const normalizedRole = data.role === "ADMIN" ? "ADMIN" : "CLIENT";
        return {
          email: String(data.email ?? ""),
          role: normalizedRole,
        } satisfies DrawerUser;
      })
      .then((user) => {
        if (cancelled) return;
        if (user) {
          setProfile(user);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fallbackRole = pathname?.startsWith("/client") ? "CLIENT" : "ADMIN";
  const role = profile?.role ?? fallbackRole;

  const closeDrawer = () => setIsOpen(false);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsOpen(false);
    router.replace("/login");
  }, [router]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-xl border-border bg-surface-overlay/80 text-foreground backdrop-blur lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex h-[100svh] w-[320px] max-w-[92vw] flex-col gap-0 overflow-hidden border-r border-border/60 bg-sidebar/95 p-0 text-sidebar-foreground backdrop-blur"
      >
        <SheetHeader className="shrink-0 px-6 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full border border-border bg-surface-overlay backdrop-blur flex items-center justify-center text-sm font-semibold tracking-wider">
              3D
            </div>
            <div>
              <SheetTitle className="text-left text-lg font-semibold tracking-tight text-foreground">
                Print Studio
              </SheetTitle>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {role === "CLIENT" ? "Client Portal" : "Operations"}
              </p>
            </div>
          </div>
        </SheetHeader>

        <Separator className="mx-6 shrink-0" />

        <ScrollArea className="min-h-0 flex-1 overflow-hidden px-4 py-5">
          <nav className="flex flex-col gap-6">
            {/* Quick Actions */}
            {role === "ADMIN" ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/60">
                  Quick actions
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = getIcon(action.icon);
                    return (
                      <NavigationLink
                        key={action.href}
                        href={action.href}
                        onClick={closeDrawer}
                        className="w-auto rounded-full border border-border/60 bg-background/80 px-3 py-2 text-xs font-semibold hover:border-primary/60 hover:bg-primary hover:text-primary-foreground"
                        aria-label={action.name}
                        fullWidth={false}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <span>{action.name}</span>
                      </NavigationLink>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <Separator className="mx-2" />

            {/* Main Navigation */}
            {getNavSections(role).map((section) => (
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
                        onClick={closeDrawer}
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
        <div className="shrink-0 border-t border-border/60 bg-sidebar/80 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-sidebar-foreground/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-overlay text-sm font-semibold uppercase tracking-[0.2em] text-sidebar-foreground">
              {profile?.email ? profile.email[0]?.toUpperCase() : "3D"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {profile?.email || (loadingProfile ? "Loading…" : "")}
              </p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                {role === "ADMIN" ? "Admin" : "Client"}
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            <Link
              href={role === "CLIENT" ? "/client/account" : "/account"}
              onClick={closeDrawer}
              className="flex items-center justify-center rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm font-medium text-sidebar-foreground transition hover:border-border hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            >
              Account settings
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center rounded-xl border border-red-200/80 px-3 py-2 text-sm font-semibold text-red-500 transition hover:border-red-500 hover:bg-red-500 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
