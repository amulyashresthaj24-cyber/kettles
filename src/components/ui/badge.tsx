import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "raised" | "accent" | "success" | "warning" | "error";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const styles: Record<string, string> = {
    default: "bg-surface-mid text-text-secondary",
    raised: "bg-surface-raised text-text-secondary",
    accent: "bg-accent-dim text-accent-hover",
    success: "bg-status-success/15 text-status-success",
    warning: "bg-status-warning/15 text-status-warning",
    error: "bg-status-error/15 text-status-error",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-sm py-xs text-[12px] font-medium leading-none",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
