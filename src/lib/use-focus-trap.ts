"use client";

import * as React from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface FocusTrapOptions {
  /** Usually the dialog's `open` flag. */
  active: boolean;
  /** The element to confine focus within. */
  containerRef: React.RefObject<HTMLElement>;
  /** Called on Escape. Omit to opt out of Escape handling. */
  onEscape?: () => void;
  /** Focused on activation; otherwise the first focusable child wins. */
  initialFocusRef?: React.RefObject<HTMLElement>;
}

/**
 * Confine Tab within a container, focus into it on open, and return focus to
 * the trigger on close.
 *
 * Every dialog in the app leaked Tab into the page behind its backdrop —
 * ui/modal.tsx and the six bespoke modals alike. Extracted so the ones with
 * custom chrome get the behaviour without being restructured to fit Modal.
 */
export function useFocusTrap({
  active,
  containerRef,
  onEscape,
  initialFocusRef,
}: FocusTrapOptions) {
  const restoreFocusTo = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!active) return;
    restoreFocusTo.current = document.activeElement as HTMLElement | null;

    const raf = window.requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }
      const first = containerRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    });

    return () => {
      window.cancelAnimationFrame(raf);
      restoreFocusTo.current?.focus?.();
    };
  }, [active, containerRef, initialFocusRef]);

  React.useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape?.();
        return;
      }
      if (e.key !== "Tab") return;

      const container = containerRef.current;
      if (!container) return;

      const items = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;

      // Also pulls focus back in if it has already escaped the container.
      if (!container.contains(activeEl)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, containerRef, onEscape]);
}
