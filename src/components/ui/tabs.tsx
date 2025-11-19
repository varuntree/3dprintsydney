"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

/**
 * TabsList - Mobile optimized with enhanced styling
 * - Horizontal scroll on mobile with overflow-x-auto
 * - Increased height on mobile: h-11 for better touch targets
 * - Enhanced visual design with proper padding and shadows
 * - Full-width on mobile, w-fit on sm+
 */
function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <div className="w-full overflow-x-auto -webkit-overflow-scrolling-touch scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent no-scrollbar">
      <TabsPrimitive.List
        data-slot="tabs-list"
        className={cn(
          "inline-flex h-auto w-fit min-w-full items-center justify-start gap-2 rounded-2xl border border-border/70 bg-surface-overlay/90 p-2 shadow-sm backdrop-blur sm:min-w-0 sm:justify-center",
          className,
        )}
        {...props}
      />
    </div>
  );
}

/**
 * TabsTrigger - Mobile optimized with enhanced active state
 * - Increased padding on mobile: px-4 py-2 for better touch
 * - Min width to prevent cramping
 * - Visible active state with primary color background
 * - Better touch targets
 */
function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-9 min-w-[80px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all",
        "text-muted-foreground hover:text-foreground hover:bg-surface-muted/50",
        "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "sm:min-w-0 sm:px-3",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
