import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@sluice/ui";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-hi">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-mid">{description}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-edge bg-surface-1/40 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="grid size-12 place-items-center rounded-full border border-hairline bg-surface-2 text-mid">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-4 font-display text-base font-medium text-hi">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-mid">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** A titled section with an optional hint, used to group console content. */
export function Section({
  title,
  hint,
  children,
  className,
}: {
  title?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      {(title || hint) && (
        <div className="flex items-baseline justify-between gap-3">
          {title && <h2 className="text-sm font-medium text-hi">{title}</h2>}
          {hint && <span className="text-xs text-low">{hint}</span>}
        </div>
      )}
      {children}
    </section>
  );
}
