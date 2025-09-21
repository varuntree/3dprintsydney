"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, QUICK_ACTIONS } from "@/lib/navigation";
import { getIcon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 text-zinc-900">
      <aside className="hidden w-[260px] flex-col border-r border-zinc-200/60 bg-white/70 backdrop-blur-xl shadow-sm lg:flex">
        <div className="flex h-20 items-center gap-2 px-6">
          <div className="h-10 w-10 rounded-xl border border-zinc-200/80 bg-white/80 backdrop-blur flex items-center justify-center text-sm font-semibold tracking-wider">
            3D
          </div>
          <div>
            <p className="text-sm uppercase text-zinc-500">Operations</p>
            <p className="text-lg font-semibold tracking-tight">Print Studio</p>
          </div>
        </div>
        <Separator className="mx-6" />
        <ScrollArea className="flex-1 px-4 py-4">
          <nav className="flex flex-col gap-6">
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
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                          active
                            ? "bg-zinc-900 text-white shadow-md"
                            : "text-zinc-500 hover:bg-white/80 hover:text-zinc-900",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-zinc-200/60 bg-white/70 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between px-6">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
                Daily Console
              </h1>
              <p className="text-sm text-zinc-500">
                Manage quotes, invoices, jobs, and printers at a glance.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {QUICK_ACTIONS.map((action) => {
                const Icon = getIcon(action.icon);
                return (
                  <Button
                    key={action.href}
                    asChild
                    variant="outline"
                    className="border-zinc-200/80 bg-white/80 text-zinc-700 backdrop-blur hover:bg-zinc-900 hover:text-white"
                  >
                    <Link href={action.href}>
                      <Icon className="mr-2 h-4 w-4" />
                      {action.name}
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>
        </header>
        <main className="flex-1 bg-transparent px-6 py-10">
          <div className="mx-auto w-full max-w-[1400px] space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
