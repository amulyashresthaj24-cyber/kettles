"use client";

import { Modal } from "@/components/ui/modal";
import {
  SCOPE_HINTS,
  SCOPE_LABELS,
  renderKeys,
  shortcutsByScope,
} from "@/lib/shortcuts";

/**
 * The `?` cheat sheet. Renders from lib/shortcuts.ts so it cannot drift from
 * what is actually bound.
 */
export function ShortcutHelp({
  open,
  onClose,
  isDesktopApp,
}: {
  open: boolean;
  onClose: () => void;
  isDesktopApp: boolean;
}) {
  const groups = shortcutsByScope(isDesktopApp);

  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" className="max-w-[520px]">
      <div className="flex flex-col gap-xl">
        {groups.map(([scope, list]) => (
          <section key={scope} className="flex flex-col gap-sm">
            <div className="flex items-baseline gap-2">
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-text-faint">
                {SCOPE_LABELS[scope]}
              </h4>
              {SCOPE_HINTS[scope] && (
                <span className="text-[11px] text-text-faint">{SCOPE_HINTS[scope]}</span>
              )}
            </div>
            <ul className="flex flex-col">
              {list.map((s) => (
                <li
                  key={`${scope}-${s.keys.join("+")}-${s.description}`}
                  className="flex items-center justify-between gap-lg py-1.5"
                >
                  <span className="text-[13px] text-text-secondary">{s.description}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {renderKeys(s.keys).map((k, i) => (
                      <kbd
                        key={i}
                        className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-text-muted"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
