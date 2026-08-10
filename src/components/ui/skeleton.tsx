import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Placeholder block sized to the content it stands in for.
 *
 * Prefer this over a centred spinner for list and card layouts — it holds the
 * final layout, so nothing jumps when data lands. `.animate-skeleton` already
 * existed in globals.css with no consumers; this is the consumer.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-skeleton", className)}
      {...props}
    />
  );
}

/** N stacked skeleton rows — the common list/table placeholder. */
export function SkeletonRows({
  rows = 4,
  className,
  rowClassName,
}: {
  rows?: number;
  className?: string;
  rowClassName?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-sm", className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn("h-14 w-full rounded-md", rowClassName)} />
      ))}
    </div>
  );
}
