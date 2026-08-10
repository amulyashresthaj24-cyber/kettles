/**
 * Every keyboard shortcut in the app, in one place.
 *
 * Before this existed, shortcuts were split between Rust (global hotkeys in
 * src-tauri/src/lib.rs), AppShell, and the timer page, and the only hint any
 * user ever saw was a `title` attribute on one sidebar button. The help overlay
 * and the Settings > Keyboard section both render from this list, so a shortcut
 * that is not listed here is invisible — keep it in sync when adding one.
 */

export type ShortcutScope = "global" | "app" | "timer" | "palette";

export interface ShortcutDef {
  /** Key labels, rendered as separate <kbd> chips joined by "+". */
  keys: string[];
  description: string;
  scope: ShortcutScope;
  /** Desktop-only shortcuts are hidden on web, where they cannot fire. */
  desktopOnly?: boolean;
}

export const SCOPE_LABELS: Record<ShortcutScope, string> = {
  global: "System-wide",
  app: "Anywhere in the app",
  timer: "Timer",
  palette: "Command palette",
};

export const SCOPE_HINTS: Partial<Record<ShortcutScope, string>> = {
  global: "Works even when Kettles is not focused.",
  timer: "Ignored while typing in a field.",
};

/** Ctrl on Windows/Linux, ⌘ on macOS. Resolved at render time. */
export function modKey(): string {
  if (typeof navigator === "undefined") return "Ctrl";
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl";
}

export const SHORTCUTS: ShortcutDef[] = [
  // Registered in src-tauri/src/lib.rs. Registration is best-effort: another
  // app may already own the combination.
  { keys: ["Alt", "Shift", "Space"], description: "Pause or resume the timer", scope: "global", desktopOnly: true },
  { keys: ["Alt", "Shift", "T"], description: "Toggle pet mode", scope: "global", desktopOnly: true },

  { keys: ["mod", "K"], description: "Open the command palette", scope: "app" },
  { keys: ["mod", "N"], description: "New task", scope: "app" },
  { keys: ["mod", ","], description: "Open settings", scope: "app" },
  { keys: ["?"], description: "Show this shortcut list", scope: "app" },

  { keys: ["Space"], description: "Pause or resume", scope: "timer" },
  { keys: ["F"], description: "Finish the session", scope: "timer" },
  { keys: ["N"], description: "Add a note", scope: "timer" },
  { keys: ["Esc"], description: "Close notes", scope: "timer" },

  { keys: ["↑", "↓"], description: "Move between results", scope: "palette" },
  { keys: ["Enter"], description: "Run the selected result", scope: "palette" },
  { keys: ["Esc"], description: "Close the palette", scope: "palette" },
];

/** Resolve the "mod" placeholder to the platform key. */
export function renderKeys(keys: string[]): string[] {
  const mod = modKey();
  return keys.map((k) => (k === "mod" ? mod : k));
}

export function shortcutsByScope(isDesktopApp: boolean): [ShortcutScope, ShortcutDef[]][] {
  const scopes: ShortcutScope[] = ["global", "app", "timer", "palette"];
  return scopes
    .map((scope) => [
      scope,
      SHORTCUTS.filter((s) => s.scope === scope && (!s.desktopOnly || isDesktopApp)),
    ] as [ShortcutScope, ShortcutDef[]])
    .filter(([, list]) => list.length > 0);
}
