import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "raised" | "accent" | "success" | "warning" | "error";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const styles: Record<string, string> = {
    default: "bg-[--surface-mid] text-text-secondary",
    raised:  "bg-[--surface-mid] text-text-muted",
    accent:  "bg-accent/[0.12] text-accent",
    success: "bg-success/[0.12] text-success",
    warning: "bg-warning/[0.12] text-warning",
    error:   "bg-error/[0.12] text-error",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[5px] px-1.5 py-0.5 text-[11px] font-medium leading-none",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
