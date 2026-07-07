"use client";

import { isDesktop } from "./desktop";

/**
 * Checks the release feed (GitHub Releases `latest.json`) for a newer desktop
 * build, downloads and installs it, then relaunches the app.
 *
 * No-op in the browser and in dev builds — the updater endpoint only serves
 * signed production artifacts, so checking from dev would always mismatch.
 * On Windows the NSIS installer exits the app itself, so `relaunch()` is a
 * fallback for platforms where the process survives the install.
 */
export async function checkForDesktopUpdate(): Promise<void> {
  if (!isDesktop() || process.env.NODE_ENV !== "production") return;

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) return;

    console.info(`Desktop update available: ${update.version}, installing...`);
    await update.downloadAndInstall();

    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch (err) {
    // Never block app startup on updater failures (offline, rate limit, etc.)
    console.warn("Desktop update check failed:", err);
  }
}
