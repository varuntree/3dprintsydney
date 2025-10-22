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
 * TabsList - Mobile optimized
 * - Horizontal scroll on mobile with overflow-x-auto
 * - Increased height on mobile: h-11 for better touch targets
 * - Snap scroll for better UX on mobile
 * - Full-width on mobile, w-fit on sm+
 */
function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <div className="w-full overflow-x-auto -webkit-overflow-scrolling-touch scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      <TabsPrimitive.List
        data-slot="tabs-list"
        className={cn(
          "inline-flex h-11 w-fit min-w-full items-center justify-start rounded-lg bg-zinc-100 p-[3px] text-zinc-500 sm:h-9 sm:min-w-0 sm:justify-center",
          className,
        )}
        {...props}
      />
    </div>
  );
}

/**
 * TabsTrigger - Mobile optimized
 * - Increased padding on mobile: px-4 py-2 for better touch
 * - Min width to prevent cramping
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
        "inline-flex h-[calc(100%-1px)] min-w-[80px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-4 py-2 text-sm font-medium text-zinc-600 transition-[color,box-shadow] focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] data-[state=active]:border-zinc-200 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm disabled:pointer-events-none disabled:opacity-50 sm:min-w-0 sm:px-3 sm:py-1 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
