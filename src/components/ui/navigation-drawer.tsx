"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { getNavSections, QUICK_ACTIONS } from "@/lib/navigation";
import { getIcon } from "@/lib/icons";
import { isNavItemActive } from "@/lib/nav-utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavigationLink } from "./navigation-link";
import { AnimatedCubeLogo } from "@/components/branding/animated-cube-logo";

type DrawerUser = {
  email: string;
  role: "ADMIN" | "CLIENT";
};

export function NavigationDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [profile, setProfile] = useState<DrawerUser | null>(null);

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
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fallbackRole = pathname?.startsWith("/client") ? "CLIENT" : "ADMIN";
  const role = profile?.role ?? fallbackRole;

  const closeDrawer = () => setIsOpen(false);

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
        className="flex h-[100svh] w-full max-w-full flex-col overflow-hidden border-r border-border/60 bg-sidebar/95 p-0 text-sidebar-foreground backdrop-blur sm:w-[360px]"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="shrink-0 border-b border-border/60 px-6 pb-6 pt-[calc(1.25rem+env(safe-area-inset-top))]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-surface-overlay/80">
                <AnimatedCubeLogo className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="truncate text-left text-lg font-semibold tracking-tight text-foreground">
                  3D Print Sydney
                </SheetTitle>
                <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground/70">
                  {role === "CLIENT" ? "Client Portal" : "Operations"}
                </p>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-5 py-6">
            <div className="flex flex-col gap-8">
              {role === "ADMIN" ? (
                <section className="space-y-3">
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
                          className="w-auto rounded-full border border-border/60 bg-background/80 px-3 py-2 text-xs font-semibold shadow-sm shadow-black/5 transition hover:border-primary/60 hover:bg-primary hover:text-primary-foreground"
                          aria-label={action.name}
                          fullWidth={false}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          <span>{action.name}</span>
                        </NavigationLink>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <section className="space-y-5">
                {getNavSections(role).map((section) => (
                  <div key={section.title ?? "main"} className="space-y-3">
                    {section.title ? (
                      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground/60">
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
              </section>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
