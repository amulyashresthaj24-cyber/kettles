"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Side = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  label: React.ReactNode;
  children: React.ReactElement;
  side?: Side;
  /** Delay before showing, ms. Leaving is always instant. */
  delay?: number;
  disabled?: boolean;
}

const SIDE_CLASSES: Record<Side, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
  left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
  right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
};

/**
 * Styled tooltip to replace native `title=""`, which has a ~400ms unconfigurable
 * delay, cannot be styled, and never appears on touch.
 *
 * Wraps a single focusable child and describes it via aria-describedby, so the
 * label reaches screen readers too. It does NOT replace an accessible name —
 * icon-only buttons still need their own aria-label.
 */
export function Tooltip({
  label,
  children,
  side = "top",
  delay = 400,
  disabled = false,
}: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<number | null>(null);
  const id = React.useId();

  const clear = React.useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  React.useEffect(() => clear, [clear]);

  const show = () => {
    if (disabled) return;
    clear();
    timer.current = window.setTimeout(() => setOpen(true), delay);
  };

  // Instant on the way out — a lingering tooltip reads as a stuck UI.
  const hide = React.useCallback(() => {
    clear();
    setOpen(false);
  }, [clear]);

  // Escape dismisses without moving the pointer, matching every other overlay.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hide]);

  if (disabled) return children;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      {React.cloneElement(children, { "aria-describedby": open ? id : undefined })}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-tooltip whitespace-nowrap rounded-sm",
            "bg-surface-raised border border-border-subtle shadow-elevation-2",
            "px-2 py-1 text-[12px] font-medium text-text-secondary",
            "animate-fade-in",
            SIDE_CLASSES[side]
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
