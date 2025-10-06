"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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

export function NavigationDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [role, setRole] = useState<"ADMIN" | "CLIENT" | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me").then(async (r) => {
      if (!r.ok) return;
      const { data } = await r.json();
      if (!cancelled) setRole(data.role);
    });
    return () => { cancelled = true; };
  }, []);

  const closeDrawer = () => setIsOpen(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden border-border bg-surface-overlay text-foreground backdrop-blur"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 bg-sidebar text-sidebar-foreground">
        <SheetHeader className="px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full border border-border bg-surface-overlay backdrop-blur flex items-center justify-center text-sm font-semibold tracking-wider">
              3D
            </div>
            <div>
              <SheetTitle className="text-left text-lg font-semibold tracking-tight text-foreground">
                Print Studio
              </SheetTitle>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Operations
              </p>
            </div>
          </div>
        </SheetHeader>

        <Separator className="mx-6" />

        <ScrollArea className="flex-1 px-4 py-4">
          <nav className="flex flex-col gap-6">
            {/* Quick Actions */}
            {role === 'ADMIN' && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/60">
                Quick Actions
              </p>
              <div className="space-y-1">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = getIcon(action.icon);
                  return (
                    <NavigationLink
                      key={action.href}
                      href={action.href}
                      onClick={closeDrawer}
                      className="bg-surface-elevated hover:bg-primary hover:text-primary-foreground font-medium"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{action.name}</span>
                    </NavigationLink>
                  );
                })}
              </div>
            </div>
            )}

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
      </SheetContent>
    </Sheet>
  );
}
