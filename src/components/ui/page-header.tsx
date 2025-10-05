import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ActionRail } from "./action-rail";

interface PageHeaderProps {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly kicker?: ReactNode;
  readonly meta?: ReactNode;
  readonly actions?: ReactNode;
  readonly className?: string;
  readonly children?: ReactNode;
}

export function PageHeader({
  title,
  description,
  kicker,
  meta,
  actions,
  className,
  children,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="space-y-3">
        {kicker ? (
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
            {kicker}
          </div>
        ) : null}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? (
            <div className="max-w-2xl text-sm text-muted-foreground">{description}</div>
          ) : null}
          {meta ? (
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
              {meta}
            </div>
          ) : null}
        </div>
        {children ? <div className="space-y-2 text-sm text-muted-foreground">{children}</div> : null}
      </div>
      {actions ? <ActionRail>{actions}</ActionRail> : null}
    </header>
  );
}
