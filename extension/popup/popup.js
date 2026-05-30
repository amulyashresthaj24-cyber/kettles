import {
  collectAllTags,
  createSession,
  elapsedSeconds,
  formatDuration,
  loadKettlesSnapshot,
  sessionState,
  updateSession
} from "../shared/api.js";
import { connectFromActiveKettlesTab } from "../shared/connect.js";
import { getSettings, saveSettings } from "../shared/storage.js";
import { openKettles } from "../shared/chrome-ui.js";

const focusPanel = document.querySelector("#focusPanel");
const contextPanel = document.querySelector("#contextPanel");
const actionPanel = document.querySelector("#actionPanel");
const notesPanel = document.querySelector("#notesPanel");
const notesInput = document.querySelector("#notesInput");
const noteStatus = document.querySelector("#noteStatus");
const connectButton = document.querySelector("#connectButton");
const settingsButton = document.querySelector("#settingsButton");
const openProjectButton = document.querySelector("#openProjectButton");
const projectSelect = document.querySelector("#projectSelect");
const tagSelector = document.querySelector("#tagSelector");
const selectedTagCount = document.querySelector("#selectedTagCount");

const EXTENSION_NOTE_ID = "kettles-extension-working-note";

let currentSettings = await getSettings();
let currentSnapshot = null;
let elapsedTimer = null;
let noteSaveTimer = null;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function activeProjectId() {
  return currentSnapshot?.activeProject?.id || currentSettings.selectedProjectId || projectSelect.value || "";
}

function selectedTags() {
  const sessionTags = currentSnapshot?.activeSession?.selectedTags;
  if (Array.isArray(sessionTags) && sessionTags.length > 0) return sessionTags;
  return currentSettings.selectedTags || [];
}

function setSelectedTags(tags) {
  const nextTags = [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))];
  currentSettings = { ...currentSettings, selectedTags: nextTags };
  saveSettings({ selectedTags: nextTags });
  renderTags();
}

function selectedProject() {
  const id = activeProjectId();
  return (currentSnapshot?.projects || []).find((project) => project.id === id) || currentSnapshot?.activeProject || null;
}

function displayTime() {
  const node = document.querySelector("#elapsedTime");
  if (node && currentSnapshot?.activeSession) {
    node.textContent = formatDuration(elapsedSeconds(currentSnapshot.activeSession));
  }
}

function resetElapsedTimer() {
  if (elapsedTimer) window.clearInterval(elapsedTimer);
  elapsedTimer = null;
  if (sessionState(currentSnapshot?.activeSession) === "running") {
    elapsedTimer = window.setInterval(displayTime, 1000);
  }
}

function renderFocus(stateName) {
  const session = currentSnapshot?.activeSession;
  const project = selectedProject();
  const elapsed = session ? formatDuration(elapsedSeconds(session)) : "0m";

  if (!currentSettings.accessToken) {
    focusPanel.className = "focus-panel idle";
    focusPanel.innerHTML = `
      <div class="state-row">
        <p class="state-label"><span class="status-dot empty"></span>Not connected</p>
        <span class="mono">--</span>
      </div>
      <h2 class="task-title">Connect Kettles</h2>
      <p class="task-meta">Open Kettles in a signed-in tab, then connect the extension.</p>
    `;
    return;
  }

  if (!session) {
    focusPanel.className = "focus-panel idle";
    focusPanel.innerHTML = `
      <div class="state-row">
        <p class="state-label"><span class="status-dot empty"></span>No active timer</p>
        <span class="mono">Idle</span>
      </div>
      <h2 class="task-title">Ready for the next block</h2>
      <p class="task-meta">${escapeHtml(project?.name || "Choose a project")} - ${selectedTags().length} selected tag${selectedTags().length === 1 ? "" : "s"}</p>
    `;
    return;
  }

  const running = stateName === "running";
  const label = running ? "Timer running" : "Paused";
  focusPanel.className = `focus-panel session ${running ? "running" : "paused"}`;
  focusPanel.innerHTML = `
    <div class="state-row">
      <p class="state-label"><span class="status-dot ${running ? "" : "paused"}"></span>${label}</p>
      <span class="mono">${escapeHtml(project?.name || "No project")}</span>
    </div>
    <div class="timer-stage" aria-label="Elapsed time">
      <div class="timer-ring">
        <span id="elapsedTime" class="elapsed-time mono">${elapsed}</span>
      </div>
    </div>
  `;
}

function renderProjects(disabled) {
  const projects = currentSnapshot?.projects || [];
  const activeId = activeProjectId();
  projectSelect.disabled = disabled || projects.length === 0;
  projectSelect.innerHTML = projects.length
    ? projects.map((project) => `<option value="${escapeHtml(project.id)}"${project.id === activeId ? " selected" : ""}>${escapeHtml(project.name || "Untitled project")}</option>`).join("")
    : `<option value="">No projects found</option>`;
  openProjectButton.disabled = !activeId;
}

function renderTags(disabled = false) {
  const tags = collectAllTags(currentSnapshot?.tasks || [], currentSnapshot?.projects || []);
  const selected = selectedTags();
  selectedTagCount.textContent = String(selected.length);

  tagSelector.innerHTML = tags.length
    ? tags.map((tag) => {
        const isSelected = selected.some((item) => item.toLowerCase() === tag.label.toLowerCase());
        return `<button class="tag-chip ${isSelected ? "selected" : ""}" type="button" data-tag="${escapeHtml(tag.label)}"${disabled ? " disabled" : ""}>${escapeHtml(tag.label)}</button>`;
      }).join("")
    : `<p class="quiet-copy">No existing tags yet.</p>`;
}

function extensionNote(session) {
  return (session?.notes || []).find((note) => note.id === EXTENSION_NOTE_ID);
}

function renderNotes(visible) {
  notesPanel.hidden = !visible;
  if (!visible) return;
  const note = extensionNote(currentSnapshot?.activeSession);
  notesInput.value = note?.text || "";
  noteStatus.textContent = "Saved";
}

function renderActions(stateName) {
  const connected = Boolean(currentSettings.accessToken);
  if (!connected) {
    actionPanel.innerHTML = `<button class="button primary wide" type="button" disabled>Start timer</button>`;
    return;
  }

  if (stateName === "running") {
    actionPanel.innerHTML = `
      <button id="pauseButton" class="button secondary" type="button">Pause</button>
      <button id="endButton" class="button danger" type="button">End session</button>
    `;
    document.querySelector("#pauseButton").addEventListener("click", pauseSession);
    document.querySelector("#endButton").addEventListener("click", endSession);
    return;
  }

  if (stateName === "paused" || stateName === "finishing") {
    actionPanel.innerHTML = `
      <button id="resumeButton" class="button primary" type="button">Resume</button>
      <button id="endButton" class="button danger" type="button">End session</button>
    `;
    document.querySelector("#resumeButton").addEventListener("click", resumeSession);
    document.querySelector("#endButton").addEventListener("click", endSession);
    return;
  }

  actionPanel.innerHTML = `<button id="startButton" class="button primary wide" type="button">Start timer</button>`;
  document.querySelector("#startButton").addEventListener("click", startTimer);
}

function render() {
  const stateName = sessionState(currentSnapshot?.activeSession);
  const active = ["running", "paused", "finishing"].includes(stateName);
  renderFocus(stateName);
  renderProjects(active);
  renderTags(active);
  renderNotes(active);
  renderActions(stateName);
  resetElapsedTimer();
}

async function refresh() {
  currentSettings = await getSettings();
  if (!currentSettings.accessToken) {
    currentSnapshot = null;
    render();
    return;
  }

  try {
    currentSnapshot = await loadKettlesSnapshot(currentSettings);
    if (!currentSettings.selectedProjectId && currentSnapshot.projects?.[0]?.id && !currentSnapshot.activeProject?.id) {
      currentSettings = await saveSettings({ selectedProjectId: currentSnapshot.projects[0].id });
    }
    render();
  } catch (error) {
    currentSnapshot = null;
    focusPanel.className = "focus-panel idle";
    focusPanel.innerHTML = `
      <div class="state-row">
        <p class="state-label"><span class="status-dot empty"></span>Connection issue</p>
        <span class="mono">--</span>
      </div>
      <h2 class="task-title">Reconnect Kettles</h2>
      <p class="task-meta">${escapeHtml(error?.message || "Could not reach Kettles.")}</p>
    `;
    renderProjects(true);
    renderTags(true);
    renderNotes(false);
    renderActions("idle");
  }
}

async function startTimer() {
  const projectId = activeProjectId();
  if (!projectId) return;
  const project = selectedProject();
  await createSession(currentSettings, {
    projectId,
    billable: project?.billable ?? false,
    startedAt: Date.now(),
    durationSeconds: 0,
    paused: false,
    state: "running",
    isDraft: true,
    selectedTags: selectedTags(),
    notes: []
  });
  await refresh();
}

async function pauseSession() {
  const session = currentSnapshot?.activeSession;
  if (!session) return;
  await updateSession(currentSettings, session.id, {
    paused: true,
    state: "paused",
    durationSeconds: elapsedSeconds(session)
  });
  await refresh();
}

async function resumeSession() {
  const session = currentSnapshot?.activeSession;
  if (!session) return;
  await updateSession(currentSettings, session.id, {
    paused: false,
    state: "running",
    startedAt: Date.now()
  });
  await refresh();
}

async function endSession() {
  const session = currentSnapshot?.activeSession;
  if (!session) return;
  if (!notesPanel.hidden) await saveWorkingNote();
  const now = Date.now();
  await updateSession(currentSettings, session.id, {
    paused: true,
    state: "confirmed",
    endedAt: now,
    isDraft: false,
    durationSeconds: elapsedSeconds(session)
  });
  await refresh();
}

async function saveWorkingNote() {
  const session = currentSnapshot?.activeSession;
  if (!session) return;
  noteStatus.textContent = "Saving";
  const text = notesInput.value.trim();
  const notes = (session.notes || []).filter((note) => note.id !== EXTENSION_NOTE_ID);
  if (text) {
    notes.push({
      id: EXTENSION_NOTE_ID,
      timestamp: elapsedSeconds(session),
      text
    });
  }
  try {
    const updated = await updateSession(currentSettings, session.id, { notes });
    currentSnapshot.activeSession = { ...session, ...updated, notes };
    noteStatus.textContent = "Saved";
  } catch {
    noteStatus.textContent = "Not saved";
  }
}

connectButton.addEventListener("click", async () => {
  connectButton.disabled = true;
  try {
    const connection = await connectFromActiveKettlesTab();
    currentSettings = await saveSettings({
      accessToken: connection.accessToken,
      supabaseUrl: connection.supabaseUrl,
      functionsBaseUrl: `${connection.supabaseUrl}/functions/v1`,
      appOrigin: connection.appOrigin
    });
    await refresh();
  } catch (error) {
    currentSnapshot = null;
    focusPanel.className = "focus-panel idle";
    focusPanel.innerHTML = `
      <div class="state-row">
        <p class="state-label"><span class="status-dot empty"></span>Not connected</p>
        <span class="mono">--</span>
      </div>
      <h2 class="task-title">Connect Kettles</h2>
      <p class="task-meta">${escapeHtml(error?.message || "Connection failed.")}</p>
    `;
  } finally {
    connectButton.disabled = false;
  }
});

projectSelect.addEventListener("change", async () => {
  currentSettings = await saveSettings({ selectedProjectId: projectSelect.value });
  render();
});

tagSelector.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tag]");
  if (!button || button.disabled) return;
  const tag = button.dataset.tag;
  const selected = selectedTags();
  const exists = selected.some((item) => item.toLowerCase() === tag.toLowerCase());
  setSelectedTags(exists ? selected.filter((item) => item.toLowerCase() !== tag.toLowerCase()) : [...selected, tag]);
});

notesInput.addEventListener("input", () => {
  noteStatus.textContent = "Saving";
  if (noteSaveTimer) window.clearTimeout(noteSaveTimer);
  noteSaveTimer = window.setTimeout(saveWorkingNote, 650);
});

openProjectButton.addEventListener("click", () => {
  const id = activeProjectId();
  openKettles(currentSettings, id ? `/projects/${id}` : "/projects");
});
settingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());

refresh();
