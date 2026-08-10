"use client";

import { isDesktop } from "./desktop";

export interface PendingUpdate {
  version: string;
  currentVersion: string;
  /** Release notes from latest.json, when the release body carries them. */
  notes?: string;
  date?: string;
  /** Download + install. On Windows NSIS this terminates the process. */
  install: (onProgress?: (percent: number | null) => void) => Promise<void>;
}

/**
 * Ask the release feed (GitHub Releases `latest.json`) whether a newer desktop
 * build exists. Resolves to null when there is nothing to install.
 *
 * This deliberately does NOT install. The previous version checked once on
 * mount and immediately ran downloadAndInstall() + relaunch() — and because the
 * Windows NSIS installer terminates the running process, a session in progress
 * simply vanished with no warning. Deciding when to interrupt is the caller's
 * job; see useDesktopUpdatePrompt.
 */
export async function checkForDesktopUpdate(): Promise<PendingUpdate | null> {
  if (!isDesktop() || !updaterEnabled()) return null;

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) return null;

    return {
      version: update.version,
      currentVersion: update.currentVersion,
      notes: update.body,
      date: update.date,
      install: async (onProgress) => {
        // DownloadEvent is Started { contentLength? } | Progress { chunkLength }
        // | Finished. contentLength is optional, so percent can legitimately be
        // unknown — report null rather than faking a number.
        let total = 0;
        let received = 0;
        await update.downloadAndInstall((event) => {
          if (event.event === "Started") {
            total = event.data.contentLength ?? 0;
            onProgress?.(total > 0 ? 0 : null);
          } else if (event.event === "Progress") {
            received += event.data.chunkLength;
            onProgress?.(total > 0 ? Math.min(100, (received / total) * 100) : null);
          } else if (event.event === "Finished") {
            onProgress?.(100);
          }
        });

        // Windows NSIS exits the app itself, so this is only reached on
        // platforms where the process survives the install.
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      },
    };
  } catch (err) {
    // Never block startup on updater failures (offline, rate limit, unsigned).
    console.warn("Desktop update check failed:", err);
    return null;
  }
}

/**
 * The updater endpoint only serves signed production artifacts, so a dev build
 * always mismatches. Set NEXT_PUBLIC_ENABLE_UPDATER=1 to exercise the flow
 * locally — the old hard `NODE_ENV !== "production"` gate made this path
 * impossible to test before shipping it.
 */
function updaterEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_UPDATER === "1") return true;
  return process.env.NODE_ENV === "production";
}
