import { DEFAULT_SETTINGS, STORAGE_KEY } from "./config.js";

export async function getSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...(stored[STORAGE_KEY] || {})
  };
}

export async function saveSettings(patch) {
  const current = await getSettings();
  const next = {
    ...current,
    ...patch
  };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function clearConnection() {
  return saveSettings({
    accessToken: "",
    supabaseUrl: "",
    functionsBaseUrl: "",
    lastNotifiedActiveSessionId: "",
    lastLongRunningBucket: "",
    lastTagMismatchSessionId: ""
  });
}
