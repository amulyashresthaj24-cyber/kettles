"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/use-focus-trap";

type ModalVariant = "dialog" | "sheet";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** "dialog" centres; "sheet" slides in from the right edge, full height. */
  variant?: ModalVariant;
  /** Focused on open. Without it the first focusable element wins. */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Set while a destructive action is in flight, to block accidental dismissal. */
  dismissible?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  variant = "dialog",
  initialFocusRef,
  dismissible = true,
}: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  // Kept mounted for one exit animation after `open` flips false. Without this
  // the panel vanished instantly — the modal-out keyframe existed but nothing
  // ever played it.
  const [exiting, setExiting] = React.useState(false);
  const [mounted, setMounted] = React.useState(open);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      setExiting(false);
      return;
    }
    if (!mounted) return;
    setExiting(true);
    const t = window.setTimeout(() => {
      setMounted(false);
      setExiting(false);
    }, 140); // ~--motion-fast, the exit animation length
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  const handleEscape = React.useCallback(() => {
    if (dismissible) onClose();
  }, [dismissible, onClose]);

  // Escape to close, Tab confined to the panel, focus restored to the trigger.
  useFocusTrap({
    active: open,
    containerRef: panelRef,
    onEscape: handleEscape,
    initialFocusRef,
  });

  if (!mounted) return null;

  const isSheet = variant === "sheet";

  return (
    <div
      className={cn(
        "fixed inset-0 z-modal flex",
        isSheet ? "justify-end" : "items-center justify-center p-lg"
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-base/60 backdrop-blur-sm",
          exiting ? "animate-fade-out" : "animate-fade-in"
        )}
        onClick={dismissible ? onClose : undefined}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative z-10 bg-surface-raised outline-none",
          isSheet
            ? "h-full w-full max-w-[420px] border-l border-border-subtle p-2xl shadow-elevation-4 overflow-y-auto"
            : "w-full max-w-md rounded-xl p-2xl shadow-elevation-3",
          isSheet
            ? exiting
              ? "animate-sheet-out"
              : "animate-sheet-in"
            : exiting
            ? "animate-modal-out"
            : "animate-modal-in",
          className
        )}
      >
        {title && (
          <h3 className="mb-lg text-[17px] font-semibold tracking-[-0.01em] text-text-primary">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
