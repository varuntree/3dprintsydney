"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, QUICK_ACTIONS } from "@/lib/navigation";
import { getIcon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NavigationLink } from "./navigation-link";

export function NavigationDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const closeDrawer = () => setIsOpen(false);

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="outline"
        size="icon"
        className="lg:hidden border-zinc-200/80 bg-white/80 text-zinc-700 backdrop-blur"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-zinc-900/20 backdrop-blur-sm lg:hidden"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-[280px] transform border-r border-zinc-200/60 bg-white/95 backdrop-blur-xl shadow-xl transition-transform duration-300 ease-in-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl border border-zinc-200/80 bg-white/80 backdrop-blur flex items-center justify-center text-sm font-semibold tracking-wider">
              3D
            </div>
            <div>
              <p className="text-sm uppercase text-zinc-500">Operations</p>
              <p className="text-lg font-semibold tracking-tight">Print Studio</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeDrawer}
            className="text-zinc-500 hover:text-zinc-900"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator className="mx-6" />

        {/* Navigation */}
        <ScrollArea className="flex-1 px-4 py-4">
          <nav className="flex flex-col gap-6">
            {/* Quick Actions */}
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
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
                      className="bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-medium"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{action.name}</span>
                    </NavigationLink>
                  );
                })}
              </div>
            </div>

            <Separator className="mx-2" />

            {/* Main Navigation */}
            {NAV_SECTIONS.map((section) => (
              <div key={section.title ?? "main"} className="space-y-3">
                {section.title ? (
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
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
      </aside>
    </>
  );
}