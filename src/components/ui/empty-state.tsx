import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
  /** An icon element from ui/icon. Rendered in a muted circle above the title. */
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  /** Secondary escape hatch, e.g. "Clear filters" next to "New task". */
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
}

/**
 * Icon + title + description + CTA. Every surface used to hand-roll a bare
 * <p> for this, so "nothing here yet" never offered a way forward.
 *
 * Not to be confused with ReportEmptyState — that is a one-line filler sized
 * for a table body, and stays as it is.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("empty-state", className)}>
      {icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-raised text-text-muted">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold text-text-primary">{title}</p>
        {description && (
          <p className="max-w-[380px] text-[13px] leading-relaxed text-text-muted">
            {description}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-sm pt-1">
          {action && (
            <Button size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button size="sm" variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
