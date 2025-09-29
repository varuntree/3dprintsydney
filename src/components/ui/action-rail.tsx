import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ActionRailProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly align?: "start" | "end" | "between";
  readonly wrap?: boolean;
}

export function ActionRail({
  children,
  className,
  align = "end",
  wrap = true,
}: ActionRailProps) {
  const alignmentClass = (() => {
    switch (align) {
      case "start":
        return "justify-start";
      case "between":
        return "justify-between";
      case "end":
      default:
        return "justify-end";
    }
  })();

  return (
    <div
      className={cn(
        "flex gap-2",
        wrap ? "flex-wrap" : "flex-nowrap",
        alignmentClass,
        "[&>*]:grow-0 [&>*]:basis-auto",
        "sm:items-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

