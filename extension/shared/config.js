export const DEFAULT_SETTINGS = {
  appOrigin: "http://localhost:3000",
  supabaseUrl: "",
  functionsBaseUrl: "",
  accessToken: "",
  notificationsEnabled: true,
  reminderIntervalMinutes: 25,
  noActiveSessionEnabled: true,
  longRunningSessionEnabled: true,
  tagMismatchEnabled: true,
  workingTags: [],
  workdayStart: "09:00",
  workdayEnd: "18:00",
  lastNotifiedActiveSessionId: "",
  lastLongRunningBucket: "",
  lastNoActiveSessionDate: "",
  lastTagMismatchSessionId: "",
  selectedProjectId: "",
  selectedTags: []
};

export const STORAGE_KEY = "kettlesExtensionSettings";
export const REMINDER_ALARM_NAME = "kettles-reminder-check";

export function normalizeOrigin(value) {
  const fallback = DEFAULT_SETTINGS.appOrigin;
  if (!value) return fallback;
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return fallback;
  }
}

export function getFunctionsBaseUrl(settings) {
  if (settings.functionsBaseUrl) return settings.functionsBaseUrl.replace(/\/$/, "");
  if (!settings.supabaseUrl) return "";
  return `${settings.supabaseUrl.replace(/\/$/, "")}/functions/v1`;
}

export function isConfigured(settings) {
  return Boolean(settings.accessToken && getFunctionsBaseUrl(settings));
}
