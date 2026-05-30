import { getFunctionsBaseUrl, isConfigured } from "./config.js";

export class KettlesApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "KettlesApiError";
    this.status = status;
  }
}

async function edgeFunction(settings, path, options = {}) {
  if (!isConfigured(settings)) {
    throw new KettlesApiError("Connect your Kettles account first.", 401);
  }

  const response = await fetch(`${getFunctionsBaseUrl(settings)}/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.accessToken}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    let message = `Kettles request failed (${response.status}).`;
    try {
      const body = await response.json();
      message = body.error || body.message || message;
    } catch {
      // Keep the default message for non-JSON responses.
    }
    throw new KettlesApiError(message, response.status);
  }

  return response.json();
}

export async function updateTask(settings, taskId, patch) {
  return edgeFunction(settings, `tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(patch)
  });
}

export async function createSession(settings, payload) {
  return edgeFunction(settings, "sessions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateSession(settings, sessionId, patch) {
  return edgeFunction(settings, `sessions/${sessionId}`, {
    method: "PUT",
    body: JSON.stringify(patch)
  });
}

export async function loadKettlesSnapshot(settings) {
  const [tasksResult, projectsResult, sessionsResult] = await Promise.all([
    edgeFunction(settings, "tasks"),
    edgeFunction(settings, "projects"),
    edgeFunction(settings, "sessions")
  ]);

  const tasks = tasksResult.tasks || [];
  const projects = projectsResult.projects || [];
  const sessions = sessionsResult.sessions || [];
  const activeSession = sessions.find((session) => {
    const state = session.state || (session.endedAt ? "confirmed" : session.paused ? "paused" : "running");
    return !session.endedAt && ["running", "paused", "finishing"].includes(state);
  });
  const activeTask = activeSession ? tasks.find((task) => task.id === activeSession.taskId) : null;
  const activeProject = activeSession ? projects.find((project) => project.id === activeSession.projectId) : null;

  return {
    tasks,
    projects,
    sessions,
    activeSession: activeSession || null,
    activeTask: activeTask || null,
    activeProject: activeProject || null
  };
}

export function elapsedSeconds(session) {
  if (!session) return 0;
  const base = Number(session.durationSeconds || 0);
  if ((session.state || "running") !== "running") return base;
  return base + Math.max(0, Math.floor((Date.now() - Number(session.startedAt || Date.now())) / 1000));
}

export function sessionState(session) {
  if (!session) return "idle";
  return session.state || (session.endedAt ? "confirmed" : session.paused ? "paused" : "running");
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m`;
}

export function collectAllTags(tasks = [], projects = []) {
  const tagMap = new Map();
  const addTag = (tag, source) => {
    const trimmed = String(tag || "").trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    const current = tagMap.get(key) || { label: trimmed, tasks: 0, projects: 0 };
    current[source] += 1;
    tagMap.set(key, current);
  };

  tasks.forEach((task) => (task.tags || []).forEach((tag) => addTag(tag, "tasks")));
  projects.forEach((project) => (project.tags || []).forEach((tag) => addTag(tag, "projects")));

  return [...tagMap.values()].sort((a, b) => {
    const countDiff = (b.tasks + b.projects) - (a.tasks + a.projects);
    return countDiff || a.label.localeCompare(b.label);
  });
}
