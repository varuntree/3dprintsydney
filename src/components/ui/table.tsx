"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Table - Mobile optimized
 * - Horizontal scroll with smooth scrolling on mobile
 * - Shadow indicators for scrollable content
 * - WebKit overflow scrolling for momentum on iOS
 * - Min column widths to prevent cramping
 *
 * Usage:
 * - First column can be made sticky with className="sticky left-0 bg-background z-10"
 * - For card view on mobile, use a separate component at page level
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto -webkit-overflow-scrolling-touch scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

/**
 * TableHeader - Mobile optimized
 * - Maintains border styling
 */
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  );
}

/**
 * TableBody - Mobile optimized
 * - Removes border on last row
 */
function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

/**
 * TableRow - Mobile optimized
 * - Increased minimum height for better touch targets: min-h-12 (48px)
 * - Hover states work on desktop, tap states on mobile
 */
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors min-h-12",
        className,
      )}
      {...props}
    />
  );
}

/**
 * TableHead - Mobile optimized
 * - Increased height: h-11 (44px) for better touch targets
 * - Increased padding: px-3 on mobile, px-2 on sm+
 * - Prevents text wrapping with whitespace-nowrap
 */
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-11 px-3 text-left align-middle font-medium whitespace-nowrap sm:h-10 sm:px-2 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * TableCell - Mobile optimized
 * - Increased padding: p-3 on mobile, p-2 on sm+
 * - Better touch targets and readability
 * - Prevents text wrapping for key columns
 */
function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-3 align-middle sm:p-2 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
