"use client";

import { cn } from "@/lib/utils";

interface ReportCardProps {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Removes body padding — for tables that manage their own row padding. */
  flush?: boolean;
}

export function ReportCard({ title, action, children, className, flush }: ReportCardProps) {
  return (
    <div
      className={cn("rounded-md overflow-hidden", className)}
      style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}
    >
      {(title || action) && (
        <div
          className={cn("flex items-center justify-between px-5 py-3", !flush && "pb-0")}
          style={flush ? { borderBottom: "1px solid var(--border-subtle)" } : undefined}
        >
          {title && <h2 className="text-[13px] font-semibold text-text-primary">{title}</h2>}
          {action}
        </div>
      )}
      <div className={cn(!flush && "p-5", (title || action) && !flush && "pt-4")}>{children}</div>
    </div>
  );
}

export function ReportEmptyState({ message }: { message: string }) {
  return <div className="px-5 py-12 text-center text-[13px] text-text-muted">{message}</div>;
}
