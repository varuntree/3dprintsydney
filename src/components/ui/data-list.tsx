import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const baseItemClasses =
  "rounded-2xl border border-border/60 bg-surface-overlay/70 p-4 shadow-sm shadow-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type DataListProps = React.ComponentPropsWithoutRef<"div">;

export const DataList = React.forwardRef<HTMLDivElement, DataListProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-3", className)} {...props} />
  ),
);
DataList.displayName = "DataList";

type DataListItemProps = React.ComponentPropsWithoutRef<"div"> & {
  asChild?: boolean;
};

export const DataListItem = React.forwardRef<HTMLDivElement, DataListItemProps>(
  ({ className, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref}
        className={cn(baseItemClasses, className)}
        {...props}
      />
    );
  },
);
DataListItem.displayName = "DataListItem";

type DataListHeaderProps = React.ComponentPropsWithoutRef<"div">;

export const DataListHeader = React.forwardRef<
  HTMLDivElement,
  DataListHeaderProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-wrap items-start justify-between gap-3",
      className,
    )}
    {...props}
  />
));
DataListHeader.displayName = "DataListHeader";

type DataListContentProps = React.ComponentPropsWithoutRef<"div">;

export const DataListContent = React.forwardRef<
  HTMLDivElement,
  DataListContentProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-2 text-sm text-muted-foreground", className)}
    {...props}
  />
));
DataListContent.displayName = "DataListContent";

type DataListFooterProps = React.ComponentPropsWithoutRef<"div">;

export const DataListFooter = React.forwardRef<
  HTMLDivElement,
  DataListFooterProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground",
      className,
    )}
    {...props}
  />
));
DataListFooter.displayName = "DataListFooter";

type DataListBadgeProps = React.ComponentPropsWithoutRef<"span">;

export const DataListBadge = React.forwardRef<
  HTMLSpanElement,
  DataListBadgeProps
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground",
      className,
    )}
    {...props}
  />
));
DataListBadge.displayName = "DataListBadge";

type DataListValueProps = React.ComponentPropsWithoutRef<"div">;

export const DataListValue = React.forwardRef<
  HTMLDivElement,
  DataListValueProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm font-semibold text-foreground", className)}
    {...props}
  />
));
DataListValue.displayName = "DataListValue";

export const dataList = {
  Root: DataList,
  Item: DataListItem,
  Header: DataListHeader,
  Content: DataListContent,
  Footer: DataListFooter,
  Badge: DataListBadge,
  Value: DataListValue,
};

export type DataListType = typeof dataList;
