import { connectFromActiveKettlesTab } from "../shared/connect.js";
import { getSettings, saveSettings, clearConnection } from "../shared/storage.js";

const fields = {
  appOrigin: document.querySelector("#appOrigin"),
  supabaseUrl: document.querySelector("#supabaseUrl"),
  notificationsEnabled: document.querySelector("#notificationsEnabled"),
  longRunningSessionEnabled: document.querySelector("#longRunningSessionEnabled"),
  noActiveSessionEnabled: document.querySelector("#noActiveSessionEnabled"),
  tagMismatchEnabled: document.querySelector("#tagMismatchEnabled"),
  reminderIntervalMinutes: document.querySelector("#reminderIntervalMinutes"),
  workdayStart: document.querySelector("#workdayStart"),
  workdayEnd: document.querySelector("#workdayEnd"),
  workingTags: document.querySelector("#workingTags")
};

const connectButton = document.querySelector("#connectButton");
const disconnectButton = document.querySelector("#disconnectButton");
const saveButton = document.querySelector("#saveButton");
const testButton = document.querySelector("#testButton");
const connectionStatus = document.querySelector("#connectionStatus");
const saveStatus = document.querySelector("#saveStatus");
const tagPreview = document.querySelector("#tagPreview");

let settings = await getSettings();

function parseTags(value) {
  return [...new Set(String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean))];
}

function renderTagPreview() {
  const tags = parseTags(fields.workingTags.value);
  tagPreview.innerHTML = tags.length
    ? tags.map((tag) => `<span class="tag">${tag.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>`).join("")
    : `<p class="muted">No working tags selected.</p>`;
}

function renderConnectionStatus() {
  connectionStatus.textContent = settings.accessToken
    ? `Connected to ${settings.supabaseUrl || "Kettles"}.`
    : "Not connected.";
}

function fillForm() {
  fields.appOrigin.value = settings.appOrigin || "";
  fields.supabaseUrl.value = settings.supabaseUrl || "";
  fields.notificationsEnabled.checked = Boolean(settings.notificationsEnabled);
  fields.longRunningSessionEnabled.checked = Boolean(settings.longRunningSessionEnabled);
  fields.noActiveSessionEnabled.checked = Boolean(settings.noActiveSessionEnabled);
  fields.tagMismatchEnabled.checked = Boolean(settings.tagMismatchEnabled);
  fields.reminderIntervalMinutes.value = settings.reminderIntervalMinutes || 25;
  fields.workdayStart.value = settings.workdayStart || "09:00";
  fields.workdayEnd.value = settings.workdayEnd || "18:00";
  fields.workingTags.value = (settings.workingTags || []).join(", ");
  renderTagPreview();
  renderConnectionStatus();
}

function readForm() {
  const supabaseUrl = fields.supabaseUrl.value.trim().replace(/\/$/, "");
  return {
    appOrigin: fields.appOrigin.value.trim().replace(/\/$/, "") || "http://localhost:3000",
    supabaseUrl,
    functionsBaseUrl: supabaseUrl ? `${supabaseUrl}/functions/v1` : "",
    notificationsEnabled: fields.notificationsEnabled.checked,
    longRunningSessionEnabled: fields.longRunningSessionEnabled.checked,
    noActiveSessionEnabled: fields.noActiveSessionEnabled.checked,
    tagMismatchEnabled: fields.tagMismatchEnabled.checked,
    reminderIntervalMinutes: Math.max(5, Number(fields.reminderIntervalMinutes.value || 25)),
    workdayStart: fields.workdayStart.value || "09:00",
    workdayEnd: fields.workdayEnd.value || "18:00",
    workingTags: parseTags(fields.workingTags.value)
  };
}

async function saveForm(message = "Settings saved.") {
  settings = await saveSettings(readForm());
  saveStatus.textContent = message;
  renderConnectionStatus();
  window.setTimeout(() => {
    saveStatus.textContent = "";
  }, 2400);
}

connectButton.addEventListener("click", async () => {
  connectButton.disabled = true;
  connectionStatus.textContent = "Connecting...";
  try {
    const connection = await connectFromActiveKettlesTab();
    settings = await saveSettings({
      ...readForm(),
      accessToken: connection.accessToken,
      supabaseUrl: connection.supabaseUrl,
      functionsBaseUrl: `${connection.supabaseUrl}/functions/v1`,
      appOrigin: connection.appOrigin
    });
    fillForm();
    saveStatus.textContent = "Connected.";
  } catch (error) {
    connectionStatus.textContent = error?.message || "Connection failed.";
  } finally {
    connectButton.disabled = false;
  }
});

disconnectButton.addEventListener("click", async () => {
  settings = await clearConnection();
  fillForm();
});

saveButton.addEventListener("click", () => saveForm());
testButton.addEventListener("click", async () => {
  await saveForm("");
  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("assets/icon-128.png"),
    title: "Kettles notifications are on",
    message: "Your browser can show local Kettles reminders.",
    priority: 1
  });
});

fields.workingTags.addEventListener("input", renderTagPreview);

fillForm();
