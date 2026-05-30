import { REMINDER_ALARM_NAME } from "../shared/config.js";
import { loadKettlesSnapshot } from "../shared/api.js";
import { buildReminder } from "../shared/reminders.js";
import { getSettings, saveSettings } from "../shared/storage.js";

async function scheduleReminderAlarm() {
  const settings = await getSettings();
  const interval = Math.max(5, Number(settings.reminderIntervalMinutes || 25));
  await chrome.alarms.clear(REMINDER_ALARM_NAME);
  chrome.alarms.create(REMINDER_ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: interval
  });
}

async function runReminderCheck() {
  const settings = await getSettings();
  if (!settings.notificationsEnabled || !settings.accessToken) return;

  try {
    const snapshot = await loadKettlesSnapshot(settings);
    const reminder = buildReminder(settings, snapshot);
    if (!reminder) return;

    await chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icon-128.png"),
      title: reminder.title,
      message: reminder.message,
      priority: 1
    });

    await saveSettings(reminder.patch);
  } catch (error) {
    if (error?.status === 401) {
      await chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("assets/icon-128.png"),
        title: "Kettles needs reconnecting",
        message: "Open Kettles, sign in, then reconnect the extension.",
        priority: 1
      });
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  scheduleReminderAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleReminderAlarm();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.kettlesExtensionSettings) {
    scheduleReminderAlarm();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REMINDER_ALARM_NAME) {
    runReminderCheck();
  }
});
