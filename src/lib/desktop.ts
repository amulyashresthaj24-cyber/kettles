"use client";

/**
 * Desktop bridge adapter for Tauri IPC.
 * Provides helpers to detect desktop environment and invoke Tauri commands.
 * Falls back gracefully when running in a regular browser.
 */

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------

type TauriGlobals = typeof window & {
  __TAURI__?: {
    core?: typeof import("@tauri-apps/api/core");
    event?: typeof import("@tauri-apps/api/event");
  };
  __TAURI_INTERNALS__?: unknown;
};

/** Returns true when running inside a Tauri desktop shell. */
export function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  const tauriWindow = window as TauriGlobals;
  return !!(tauriWindow.__TAURI_INTERNALS__ || tauriWindow.__TAURI__);
}

/** Returns true when running in a regular browser (not Tauri). */
export function isWeb(): boolean {
  return !isDesktop();
}

// ---------------------------------------------------------------------------
// Tauri dynamic import helpers
// ---------------------------------------------------------------------------

/**
 * Dynamically import the Tauri `core` API.
 * Returns null when not running inside Tauri.
 */
async function getTauriCore() {
  if (!isDesktop()) return null;
  try {
    return await import("@tauri-apps/api/core");
  } catch {
    return (window as TauriGlobals).__TAURI__?.core ?? null;
  }
}

/**
 * Dynamically import the Tauri `event` API.
 */
async function getTauriEvent() {
  if (!isDesktop()) return null;
  try {
    return await import("@tauri-apps/api/event");
  } catch {
    return (window as TauriGlobals).__TAURI__?.event ?? null;
  }
}

// ---------------------------------------------------------------------------
// IPC: Invoke Tauri Rust commands
// ---------------------------------------------------------------------------

/**
 * Invoke a Tauri command by name. No-ops when not running in desktop mode.
 */
export async function invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  const core = await getTauriCore();
  if (!core) return null;
  return core.invoke<T>(cmd, args);
}

// ---------------------------------------------------------------------------
// Events: Listen to Rust → Frontend events
// ---------------------------------------------------------------------------

type UnlistenFn = () => void;

/**
 * Listen for a named event emitted by the Rust backend.
 * Returns an unlisten function, or a no-op when not in desktop mode.
 */
export async function listen<T = unknown>(
  event: string,
  handler: (payload: T) => void
): Promise<UnlistenFn> {
  const eventApi = await getTauriEvent();
  if (!eventApi) return () => {};
  return eventApi.listen<T>(event, (e) => handler(e.payload));
}

/**
 * Emit a named event from the frontend to the Rust backend.
 */
export async function emit(event: string, payload?: unknown): Promise<void> {
  const eventApi = await getTauriEvent();
  if (!eventApi) return;
  await eventApi.emit(event, payload);
}

// ---------------------------------------------------------------------------
// Desktop-specific window helpers
// ---------------------------------------------------------------------------

/** Minimize the window to the system tray (hide). */
export async function hideToTray(): Promise<void> {
  await invoke("hide_to_tray");
}

/** Show the main window (restore from tray). */
export async function showFromTray(): Promise<void> {
  await invoke("show_from_tray");
}

/** Switch to mini-widget mode. */
export async function enterMiniMode(): Promise<void> {
  await invoke("enter_mini_mode");
}

/** Switch back to full window mode. */
export async function exitMiniMode(): Promise<void> {
  await invoke("exit_mini_mode");
}

/** Enable or disable native idle detection events in the Tauri shell. */
export async function setIdleDetectionEnabled(enabled: boolean): Promise<void> {
  await invoke("set_idle_detection_enabled", { enabled });
}

/** Show a native desktop notification when running under Tauri. */
export async function showDesktopNotification(title: string, body: string): Promise<void> {
  await invoke("show_notification", { title, body });
}

// ---------------------------------------------------------------------------
// Online / Offline status
// ---------------------------------------------------------------------------

type ConnectionCallback = (online: boolean) => void;

let _listeners: ConnectionCallback[] = [];
let _initialized = false;

function _notifyAll(online: boolean) {
  _listeners.forEach((cb) => cb(online));
}

/** Get current online status. */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

/** Register a callback for online/offline changes. Returns an unsubscribe fn. */
export function onConnectionChange(cb: ConnectionCallback): () => void {
  _listeners.push(cb);

  if (!_initialized && typeof window !== "undefined") {
    window.addEventListener("online", () => _notifyAll(true));
    window.addEventListener("offline", () => _notifyAll(false));
    _initialized = true;
  }

  return () => {
    _listeners = _listeners.filter((l) => l !== cb);
  };
}
