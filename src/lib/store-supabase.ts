"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "./supabase";
import type { Client, Project, Task, Session, Urgency, TaskStatus } from "./types";
import { uid } from "./format";
import { getSyncEngine } from "./sync-engine";
import { isOnline } from "./desktop";

type SyncEntity = "clients" | "projects" | "tasks" | "sessions";
type SyncAction = "create" | "update" | "delete";
type TaskPatch = Omit<Partial<Task>, "completedAt" | "archivedAt" | "deletedAt"> & {
  completedAt?: number | null;
  archivedAt?: number | null;
  deletedAt?: number | null;
};

/** Push a mutation onto the offline sync queue (replayed when back online). */
function queueMutation(
  entity: SyncEntity,
  action: SyncAction,
  entityId: string,
  payload: Record<string, unknown>
) {
  getSyncEngine().enqueue({ entity, action, entityId, payload });
}

function normalizeSession(session: Session): Session {
  const state = session.state ?? (session.endedAt ? "confirmed" : session.paused ? "paused" : "running");
  return {
    ...session,
    taskId: session.taskId ?? "",
    projectId: session.projectId ?? "",
    paused: state === "paused" || state === "finishing" || session.paused === true,
    state,
    notes: session.notes ?? [],
    isDraft: session.isDraft ?? (state === "draft" || !session.taskId || !session.projectId),
    estimateMinutes: session.estimateMinutes,
  };
}

function isRemoteId(id: string): boolean {
  return id.length >= 20;
}

function handleSessionApiError(
  id: string,
  error: unknown,
  defaultMessage: string,
  set: (patch: Partial<State>) => void,
  get: () => State
) {
  const msg = error instanceof Error ? error.message : String(error);
  const isNotFound = msg.includes('404') ||
                     msg.toLowerCase().includes('not found') ||
                     msg.includes('PGRST116') ||
                     msg.includes('no rows returned') ||
                     msg.includes('multiple or no rows');
  if (isNotFound) {
    set({
      sessions: get().sessions.filter((s: Session) => s.id !== id),
      activeSessionId: null,
      error: "Session not found on server. Cleared locally.",
    });
  } else {
    set({ error: msg || defaultMessage });
  }
}

function elapsedFor(session: Session) {
  const normalized = normalizeSession(session);
  return normalized.durationSeconds + (normalized.state === "running"
    ? Math.floor((Date.now() - normalized.startedAt) / 1000)
    : 0);
}

// If a "running" session's startedAt is older than this, treat it as stale
// (app was killed / machine slept) and freeze it instead of letting elapsed
// balloon into hours or days on the next open.
const STALE_RUNNING_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

function freezeStaleRunning(sessions: Session[]): Session[] {
  const now = Date.now();
  return sessions.map((s) => {
    if (s.state !== "running" || s.endedAt) return s;
    if (now - s.startedAt <= STALE_RUNNING_THRESHOLD_MS) return s;
    return { ...s, state: "paused", paused: true, frozenAt: s.frozenAt ?? now };
  });
}

function reportableSession(session: Session) {
  return normalizeSession(session).state === "confirmed";
}

function mergeSessionLists(remoteSessions: Session[], localSessions: Session[]) {
  const localSessionsMap = new Map(localSessions.map((s) => [s.id, s]));
  const remoteIds = new Set(remoteSessions.map((session) => session.id));
  
  const mergedRemote = remoteSessions.map((remote) => {
    const local = localSessionsMap.get(remote.id);
    if (local && (local.estimateMinutes || local.completionAckMinutes)) {
      return {
        ...remote,
        estimateMinutes: local.estimateMinutes ?? remote.estimateMinutes,
        completionAckMinutes: local.completionAckMinutes ?? remote.completionAckMinutes,
      };
    }
    return remote;
  });

  const localOnly = localSessions.filter(
    (session) => !remoteIds.has(session.id) && !isRemoteId(session.id) && !reportableSession(session)
  );
  return [...mergedRemote, ...localOnly].map(normalizeSession);
}

function withTaskDisplayFallbacks(tasks: Task[]) {
  return tasks.map((task) => ({
    ...task,
    title: task.title?.trim() || `New test task ${task.id.slice(0, 8)}`,
    projectId: task.projectId || null,
    urgency: task.urgency || "normal",
    status: task.status || "todo",
  }));
}

function withProjectDisplayFallbacks(projects: Project[]) {
  return projects.map((project) => ({
    ...project,
    name: project.name?.trim() || `New test project ${project.id.slice(0, 8)}`,
    color: project.color || "indigo",
    billable: project.billable ?? false,
    status: project.status || "active",
  }));
}

function reconcileSessionTasks(tasks: Task[], sessions: Session[]) {
  const taskIds = new Set(tasks.map((task) => task.id));
  const missingTasks = sessions
    .filter((session) => session.taskId && !taskIds.has(session.taskId))
    .map((session) => {
      const sessionData = session as Session & { taskTitle?: string; title?: string };
      return {
        id: session.taskId,
        title: sessionData.taskTitle?.trim() || sessionData.title?.trim() || `New test task ${session.taskId.slice(0, 8)}`,
        projectId: session.projectId,
        urgency: "normal" as Urgency,
        status: "todo" as TaskStatus,
        dateRange: new Date(session.startedAt).toISOString().split("T")[0],
        createdAt: session.startedAt,
        updatedAt: session.endedAt ?? session.startedAt,
      };
    });

  return missingTasks.length > 0 ? [...tasks, ...missingTasks] : tasks;
}

function taskUpdatePayload(current: Task | undefined, patch: TaskPatch) {
  return current ? { ...current, ...patch } : patch;
}

interface State {
  user: { name: string; email?: string } | null;
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  sessions: Session[];
  activeSessionId: string | null;
  selectedProjectId: string | null;
  selectedUrgency: Urgency | "all";
  isLoading: boolean;
  error: string | null;
  lastDailyArchiveDate?: string;
  initialLoadComplete: boolean;

  // Actions
  setUser: (user: { name: string; email?: string } | null) => void;
  
  addClient: (c: Omit<Client, "id">) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Omit<Client, "id">>) => Promise<Client>;
  deleteClient: (id: string) => Promise<void>;
  addProject: (p: Omit<Project, "id">) => Promise<Project>;
  updateProject: (id: string, patch: Partial<Omit<Project, "id">>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  restoreProject: (id: string) => Promise<void>;
  
  addTask: (t: Omit<Task, "id" | "createdAt" | "status"> & { status?: TaskStatus }) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  archiveTask: (id: string) => Promise<void>;
  restoreTask: (id: string) => Promise<void>;
  setTaskStatus: (id: string, status: TaskStatus) => Promise<void>;

  startSession: (taskId: string, billable?: boolean, estimateMinutes?: number) => Promise<Session | null>;
  startDraftSession: (projectId?: string, billable?: boolean, estimateMinutes?: number) => Promise<Session | null>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  finishSession: () => Promise<void>;
  resumeFromFinishing: () => Promise<void>;
  confirmSession: (adjustedSeconds?: number) => Promise<Session | null>;
  saveSessionAsDraft: () => Promise<void>;
  reviewDraftSession: (id: string) => void;
  discardSession: () => Promise<void>;
  classifyDraftSession: (taskId: string, projectId: string, billable: boolean) => void;
  addSessionNote: (text: string) => void;
  updateSessionNote: (noteId: string, text: string) => void;
  deleteSessionNote: (noteId: string) => void;
  stopSession: () => Promise<Session | null>;
  adjustSessionDuration: (id: string, seconds: number) => Promise<void>;
  /** Create a confirmed past time entry without running the timer. */
  addManualSession: (input: {
    taskId?: string;
    taskTitle?: string;
    projectId: string;
    startedAt: number;
    endedAt: number;
    billable?: boolean;
    description?: string;
  }) => Promise<Session | null>;

  /** Session id whose completion alarm is currently ringing (transient). */
  completionAlarmSessionId: string | null;
  markCompletionAlarm: (sessionId: string, estimateMinutes: number) => void;
  dismissCompletionAlarm: () => void;
  extendSession: (minutes: number) => Promise<void>;

  setSelectedProject: (id: string | null) => void;
  setSelectedUrgency: (u: Urgency | "all") => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;

  // Data loading
  loadClients: () => Promise<void>;
  loadProjects: () => Promise<void>;
  loadTasks: () => Promise<void>;
  loadSessions: () => Promise<void>;
  loadAll: () => Promise<void>;
  clearAll: () => void;
  performDailyArchive: () => Promise<void>;

  preferences?: {
    defaultFocusDuration: number;
    weeklyTargetHours?: number;
    whistleSoundEnabled: boolean;
    alarmSound?: string;
    autoBreakEnabled: boolean;
    autoPauseOnIdleEnabled: boolean;
    /** "kettle" = default male mascot. "sprite2" is a legacy persisted alias for "female". */
    activeMascot?: "kettle" | "sprite2" | "female";
    /** How often the mascot plays a spontaneous idle gesture. */
    mascotAnimationFrequency?: "off" | "calm" | "normal" | "lively";
    /** Looping animation the mascot rests in (state name from pet.config.json). */
    mascotDefaultAnimation?: string;
    petBreakRemindersEnabled?: boolean;
    petBreakIntervalMinutes?: number;
    petCustomRemindersEnabled?: boolean;
    /** days: 0 (Sun) – 6 (Sat); omitted/empty = every day. */
    petCustomReminders?: Array<{ id: string; text: string; time: string; active: boolean; days?: number[] }>;
    petNotesIntegrationEnabled?: boolean;
  };
  setPreferences: (patch: Partial<NonNullable<State["preferences"]>>) => void;
}

export const useApp = create<State>()(
persist((set, get) => ({
  user: null,
  clients: [],
  projects: [],
  tasks: [],
  sessions: [],
  activeSessionId: null,
  completionAlarmSessionId: null,
  selectedProjectId: null,
  selectedTaskId: null,
  selectedUrgency: "all",
  isLoading: false,
  error: null,
  lastDailyArchiveDate: undefined,
  initialLoadComplete: false,

  preferences: {
    defaultFocusDuration: 25,
    weeklyTargetHours: 40,
    whistleSoundEnabled: true,
    alarmSound: "kettle",
    autoBreakEnabled: false,
    autoPauseOnIdleEnabled: true,
    activeMascot: "kettle",
    mascotAnimationFrequency: "normal",
    mascotDefaultAnimation: "waiting",
    petBreakRemindersEnabled: false,
    petBreakIntervalMinutes: 45,
    petCustomRemindersEnabled: false,
    petCustomReminders: [],
    petNotesIntegrationEnabled: false,
  },

  setPreferences: (patch) => set({
    preferences: {
      defaultFocusDuration: 25,
      weeklyTargetHours: 40,
      whistleSoundEnabled: true,
      autoBreakEnabled: false,
      autoPauseOnIdleEnabled: true,
      activeMascot: "kettle",
      mascotAnimationFrequency: "normal",
      mascotDefaultAnimation: "waiting",
      petBreakRemindersEnabled: false,
      petBreakIntervalMinutes: 45,
      petCustomRemindersEnabled: false,
      petCustomReminders: [],
      petNotesIntegrationEnabled: false,
      ...(get().preferences ?? {}),
      ...patch,
    }
  }),

  setUser: (user) => set({ user }),

  addClient: async (c) => {
    set({ isLoading: true, error: null });
    try {
      if (!isOnline()) {
        const local = { ...c, id: uid() } as Client;
        set({ clients: [...get().clients, local] });
        queueMutation("clients", "create", local.id, { ...c });
        return local;
      }
      const created = await api.clients.create(c);
      set({ clients: [...get().clients, created] });
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create client' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateClient: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      if (!isOnline()) {
        set({ clients: get().clients.map((c) => c.id === id ? { ...c, ...updates } : c) });
        queueMutation("clients", "update", id, { ...updates });
        return get().clients.find((c) => c.id === id) as Client;
      }
      const updated = await api.clients.update(id, updates);
      set({ clients: get().clients.map((c) => c.id === id ? { ...c, ...updated } : c) });
      return updated;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update client' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteClient: async (id) => {
    set({ isLoading: true, error: null });
    try {
      if (!isOnline()) {
        set({ clients: get().clients.filter((c) => c.id !== id) });
        queueMutation("clients", "delete", id, {});
        return;
      }
      await api.clients.delete(id);
      set({ clients: get().clients.filter((c) => c.id !== id) });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete client' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  addProject: async (p) => {
    set({ isLoading: true, error: null });
    try {
      if (!isOnline()) {
        const local = { ...p, id: uid() } as Project;
        set({ projects: [...get().projects, local] });
        queueMutation("projects", "create", local.id, { ...p });
        return local;
      }
      const created = await api.projects.create(p);
      set({ projects: [...get().projects, created] });
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create project' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateProject: async (id, patch) => {
    set({ isLoading: true, error: null });
    try {
      if (!isOnline()) {
        set({ projects: get().projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
        queueMutation("projects", "update", id, { ...patch });
        return;
      }
      const updated = await api.projects.update(id, patch);
      set({
        projects: get().projects.map((p) => (p.id === id ? { ...p, ...updated } : p)),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update project' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      if (!isOnline()) {
        set({ projects: get().projects.filter((p) => p.id !== id) });
        queueMutation("projects", "delete", id, {});
        return;
      }
      await api.projects.delete(id);
      set({ projects: get().projects.filter((p) => p.id !== id) });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete project' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  archiveProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const now = Date.now();
      await api.projects.update(id, { archived: true, archivedAt: now, status: "archived" });
      set({
        projects: get().projects.map((p) => (p.id === id ? { ...p, archived: true, archivedAt: now, status: "archived" } : p)),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to archive project' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  restoreProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.projects.update(id, { archived: false, archivedAt: null, status: "active" });
      set({
        projects: get().projects.map((p) => {
          if (p.id === id) {
            const nextProj = { ...p, archived: false, status: "active" as const };
            delete nextProj.archivedAt;
            return nextProj;
          }
          return p;
        }),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to restore project' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  addTask: async (t) => {
    set({ isLoading: true, error: null });
    try {
      if (!isOnline()) {
        const local = {
          ...t,
          id: uid(),
          status: t.status ?? "todo",
          createdAt: Date.now(),
        } as Task;
        set({ tasks: [...get().tasks, local] });
        queueMutation("tasks", "create", local.id, { ...t, status: t.status ?? "todo" });
        return local;
      }
      const created = await api.tasks.create({
        ...t,
        status: t.status ?? "todo",
      });
      set({ tasks: [...get().tasks, created] });
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create task' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateTask: async (id, patch) => {
    set({ isLoading: true, error: null });
    try {
      const current = get().tasks.find((t) => t.id === id);
      if (!isOnline()) {
        set({ tasks: get().tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
        queueMutation("tasks", "update", id, taskUpdatePayload(current, patch));
        return;
      }
      const updated = await api.tasks.update(id, taskUpdatePayload(current, patch));
      set({
        tasks: get().tasks.map((t) => (t.id === id ? { ...t, ...updated } : t)),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update task' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      if (!isOnline()) {
        set({ tasks: get().tasks.filter((t) => t.id !== id) });
        queueMutation("tasks", "delete", id, {});
        return;
      }
      await api.tasks.delete(id);
      set({ tasks: get().tasks.filter((t) => t.id !== id) });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete task' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  archiveTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const now = Date.now();
      const task = get().tasks.find((t) => t.id === id);
      await api.tasks.update(id, taskUpdatePayload(task, { archived: true, archivedAt: now }));
      set({
        tasks: get().tasks.map((t) => (t.id === id ? { ...t, archived: true, archivedAt: now } : t)),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to archive task' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  restoreTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const task = get().tasks.find((t) => t.id === id);
      await api.tasks.update(id, taskUpdatePayload(task, { archived: false, archivedAt: null }));
      set({
        tasks: get().tasks.map((t) => {
          if (t.id === id) {
            const nextTask = { ...t, archived: false };
            delete nextTask.archivedAt;
            return nextTask;
          }
          return t;
        }),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to restore task' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  setTaskStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      const task = get().tasks.find((t) => t.id === id);
      // Include the full task payload so the edge function merge never loses the title,
      // even if the DB JSONB is incomplete or stale.
      const patch: TaskPatch = { ...(task ?? {}), status };
      if (status === "done") {
        patch.completedAt = Date.now();
      } else {
        patch.completedAt = null;
      }
      const updated = await api.tasks.update(id, patch);
      set({
        tasks: get().tasks.map((t) => {
          if (t.id === id) {
            const nextTask = { ...t, ...updated };
            if (status !== "done") {
              delete nextTask.completedAt;
            }
            return nextTask;
          }
          return t;
        }),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update task status' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  startSession: async (taskId, billable, estimateMinutes) => {
    if (get().activeSessionId) return null;
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return null;
    
    const project = get().projects.find((p) => p.id === task.projectId);
    
    set({ isLoading: true, error: null });
    try {
      const session = await api.sessions.create({
        taskId,
        projectId: task.projectId,
        billable: billable ?? project?.billable ?? false,
        startedAt: Date.now(),
        durationSeconds: 0,
        paused: false,
        state: "running",
        isDraft: false,
        notes: [],
      });

      const sessionWithEstimate = {
        ...session,
        estimateMinutes: estimateMinutes ?? task.estimateMinutes,
      };

      set({
        sessions: [...get().sessions, sessionWithEstimate],
        activeSessionId: sessionWithEstimate.id,
      });
      
      // Auto-update task status to doing if it was todo
      if (task.status === "todo") {
        await get().setTaskStatus(taskId, "doing");
      }
      
      return sessionWithEstimate;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to start session' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  startDraftSession: async (projectId = "", billable = false, estimateMinutes) => {
    if (get().activeSessionId) return null;
    const session: Session = {
      id: uid(),
      taskId: "",
      projectId,
      billable,
      startedAt: Date.now(),
      durationSeconds: 0,
      paused: false,
      state: "running",
      isDraft: true,
      notes: [],
      estimateMinutes,
    };
    set({
      sessions: [...get().sessions, session],
      activeSessionId: session.id,
    });
    return session;
  },

  pauseSession: async () => {
    const id = get().activeSessionId;
    if (!id) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const normalized = normalizeSession(session);
    if (!normalized || normalized.state !== "running") return;

    const duration = elapsedFor(normalized);
    
    set({ isLoading: true, error: null });
    try {
      if (isRemoteId(id)) await api.sessions.update(id, { paused: true, state: "paused", durationSeconds: duration });
      set({
        sessions: get().sessions.map((s) =>
          s.id === id ? { ...s, paused: true, state: "paused", durationSeconds: duration } : s
        ),
      });
    } catch (error) {
      handleSessionApiError(id, error, 'Failed to pause session', set, get);
    } finally {
      set({ isLoading: false });
    }
  },

  markCompletionAlarm: (sessionId, estimateMinutes) => {
    set({
      sessions: get().sessions.map((s) =>
        s.id === sessionId ? { ...s, completionAckMinutes: estimateMinutes } : s
      ),
      completionAlarmSessionId: sessionId,
    });
  },

  dismissCompletionAlarm: () => {
    if (get().completionAlarmSessionId) set({ completionAlarmSessionId: null });
  },

  extendSession: async (minutes) => {
    const id = get().activeSessionId;
    if (!id || !minutes || minutes <= 0) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const normalized = normalizeSession(session);
    if (normalized.state !== "running" && normalized.state !== "paused") return;

    const task = get().tasks.find((t) => t.id === normalized.taskId);
    const base =
      normalized.estimateMinutes ??
      task?.estimateMinutes ??
      Math.ceil(elapsedFor(normalized) / 60);

    // estimateMinutes stays local-only (matches startSession); the new target
    // exceeds completionAckMinutes, so the completion detector re-arms.
    set({
      sessions: get().sessions.map((s) =>
        s.id === id ? { ...s, estimateMinutes: base + minutes } : s
      ),
      completionAlarmSessionId: null,
    });

    if (normalized.state === "paused") await get().resumeSession();
  },

  resumeSession: async () => {
    const id = get().activeSessionId;
    if (!id) return;
    
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const normalized = normalizeSession(session);
    if (normalized.state !== "paused") return;
    const startedAt = Date.now();
    set({ isLoading: true, error: null });
    try {
      if (isRemoteId(id)) await api.sessions.update(id, { paused: false, state: "running", startedAt });
      set({
        sessions: get().sessions.map((s) =>
          s.id === id ? { ...s, paused: false, state: "running", startedAt } : s
        ),
      });
    } catch (error) {
      handleSessionApiError(id, error, 'Failed to resume session', set, get);
    } finally {
      set({ isLoading: false });
    }
  },

  finishSession: async () => {
    const id = get().activeSessionId;
    if (!id) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const normalized = normalizeSession(session);
    if (normalized.state !== "running" && normalized.state !== "paused") return;
    const frozenAt = Date.now();
    const durationSeconds = elapsedFor(normalized);
    const patch: Partial<Session> = {
      state: "finishing",
      paused: true,
      frozenAt,
      durationSeconds,
    };

    set({ isLoading: true, error: null });
    try {
      if (isRemoteId(id)) await api.sessions.update(id, patch);
      set({ sessions: get().sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    } catch (error) {
      handleSessionApiError(id, error, 'Failed to finish session', set, get);
    } finally {
      set({ isLoading: false });
    }
  },

  resumeFromFinishing: async () => {
    const id = get().activeSessionId;
    if (!id) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const normalized = normalizeSession(session);
    if (normalized.state !== "finishing") return;
    const patch: Partial<Session> = {
      state: "running",
      paused: false,
      startedAt: Date.now(),
      frozenAt: undefined,
    };

    set({ isLoading: true, error: null });
    try {
      if (isRemoteId(id)) await api.sessions.update(id, patch);
      set({ sessions: get().sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    } catch (error) {
      handleSessionApiError(id, error, 'Failed to resume session', set, get);
    } finally {
      set({ isLoading: false });
    }
  },

  confirmSession: async (adjustedSeconds) => {
    const id = get().activeSessionId;
    if (!id) return null;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return null;
    const normalized = normalizeSession(session);
    const durationSeconds = Math.max(0, adjustedSeconds ?? normalized.durationSeconds);
    const endedAt = normalized.frozenAt ?? Date.now();
    const patch: Partial<Session> = {
      state: "confirmed",
      paused: true,
      endedAt,
      durationSeconds,
      isDraft: false,
      frozenAt: undefined,
    };

    set({ isLoading: true, error: null });
    try {
      let updated: Session = { ...normalized, ...patch };
      if (normalized.taskId && normalized.projectId) {
        if (normalized.id.length < 20) {
          updated = await api.sessions.create({ ...updated, id: undefined });
        } else {
          updated = await api.sessions.update(id, patch);
        }
        updated = normalizeSession({ ...updated, state: "confirmed", paused: true, isDraft: false, notes: normalized.notes });
      }
      set({
        sessions: get().sessions.map((s) => (s.id === id ? updated : s)),
        activeSessionId: null,
      });
      return updated;
    } catch (error) {
      handleSessionApiError(id, error, "Failed to confirm session", set, get);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  saveSessionAsDraft: async () => {
    const id = get().activeSessionId;
    if (!id) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const normalized = normalizeSession(session);
    const patch: Partial<Session> = {
      state: "draft",
      isDraft: true,
      paused: true,
      durationSeconds: elapsedFor(normalized),
      frozenAt: normalized.frozenAt ?? Date.now(),
    };
    set({ isLoading: true, error: null });
    try {
      if (isRemoteId(id)) {
        await api.sessions.update(id, patch);
      }
      set({
        sessions: get().sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        activeSessionId: null,
      });
    } catch (error) {
      handleSessionApiError(id, error, "Failed to save session as draft", set, get);
    } finally {
      set({ isLoading: false });
    }
  },

  reviewDraftSession: (id) => {
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    set({
      sessions: get().sessions.map((s) =>
        s.id === id
          ? { ...s, state: "finishing", paused: true, isDraft: true, frozenAt: s.frozenAt ?? Date.now() }
          : s
      ),
      activeSessionId: id,
    });
  },

  discardSession: async () => {
    const id = get().activeSessionId;
    if (!id) return;
    const session = get().sessions.find((s) => s.id === id);
    set({ sessions: get().sessions.filter((s) => s.id !== id), activeSessionId: null });
    if (session && isRemoteId(id)) {
      set({ isLoading: true, error: null });
      try {
        if (!isOnline()) {
          queueMutation("sessions", "delete", id, {});
          return;
        }
        await api.sessions.delete(id);
      } catch (error) {
        queueMutation("sessions", "delete", id, {});
        set({ error: error instanceof Error ? error.message : "Failed to discard session" });
      } finally {
        set({ isLoading: false });
      }
    }
  },

  classifyDraftSession: (taskId, projectId, billable) => {
    const id = get().activeSessionId;
    if (!id) return;
    set({
      sessions: get().sessions.map((s) =>
        s.id === id ? { ...s, taskId, projectId, billable, isDraft: false } : s
      ),
    });
  },

  addSessionNote: (text) => {
    const trimmed = text.trim();
    const id = get().activeSessionId;
    if (!id || !trimmed) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const note = { id: uid(), timestamp: elapsedFor(session), text: trimmed };
    const notes = [...(session.notes ?? []), note];
    set({ sessions: get().sessions.map((s) => (s.id === id ? { ...s, notes } : s)) });
    if (isRemoteId(id)) {
      api.sessions.update(id, { notes }).catch(() => undefined);
    }
  },

  updateSessionNote: (noteId, text) => {
    const trimmed = text.trim();
    const id = get().activeSessionId;
    if (!id || !trimmed) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const notes = (session.notes ?? []).map((note) => (note.id === noteId ? { ...note, text: trimmed } : note));
    set({ sessions: get().sessions.map((s) => (s.id === id ? { ...s, notes } : s)) });
    if (isRemoteId(id)) {
      api.sessions.update(id, { notes }).catch(() => undefined);
    }
  },

  deleteSessionNote: (noteId) => {
    const id = get().activeSessionId;
    if (!id) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const notes = (session.notes ?? []).filter((note) => note.id !== noteId);
    set({ sessions: get().sessions.map((s) => (s.id === id ? { ...s, notes } : s)) });
    if (isRemoteId(id)) {
      api.sessions.update(id, { notes }).catch(() => undefined);
    }
  },

  stopSession: async () => {
    const id = get().activeSessionId;
    if (!id) return null;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return null;

    const normalized = normalizeSession(session);
    const final = elapsedFor(normalized);

    set({ isLoading: true, error: null });
    try {
      let updated = session;
      if (isRemoteId(id)) {
        updated = await api.sessions.update(id, {
          durationSeconds: final,
          endedAt: Date.now(),
          paused: true,
          state: "confirmed",
          isDraft: false,
        });
      }

      set({
        sessions: get().sessions.map((s) => (s.id === id ? normalizeSession(updated) : s)),
        activeSessionId: null,
      });

      return updated;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to stop session' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  adjustSessionDuration: async (id, seconds) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await api.sessions.update(id, { durationSeconds: seconds });
      set({
        sessions: get().sessions.map((s) => (s.id === id ? updated : s)),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to adjust session' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  addManualSession: async (input) => {
    const project = get().projects.find((p) => p.id === input.projectId);
    if (!project) {
      set({ error: "Project not found" });
      return null;
    }
    if (!input.startedAt || !input.endedAt || input.endedAt <= input.startedAt) {
      set({ error: "End time must be after start time" });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      let taskId = input.taskId ?? "";
      if (!taskId) {
        const title = (input.taskTitle ?? "").trim();
        if (!title) {
          set({ error: "Task is required" });
          return null;
        }
        const task = await get().addTask({
          title,
          projectId: input.projectId,
          urgency: "normal",
        });
        taskId = task.id;
      } else {
        const existing = get().tasks.find((t) => t.id === taskId);
        if (!existing) {
          set({ error: "Task not found" });
          return null;
        }
      }

      const durationSeconds = Math.max(1, Math.round((input.endedAt - input.startedAt) / 1000));
      const notes =
        input.description?.trim()
          ? [{ id: uid(), timestamp: input.startedAt, text: input.description.trim() }]
          : [];
      const payload = {
        taskId,
        projectId: input.projectId,
        billable: input.billable ?? project.billable ?? false,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        durationSeconds,
        paused: true,
        state: "confirmed" as const,
        isDraft: false,
        notes,
      };

      if (!isOnline()) {
        const local = normalizeSession({ ...payload, id: uid() });
        set({ sessions: [...get().sessions, local] });
        queueMutation("sessions", "create", local.id, { ...payload });
        return local;
      }

      const created = await api.sessions.create(payload);
      const session = normalizeSession({
        ...created,
        state: "confirmed",
        paused: true,
        isDraft: false,
        notes: created.notes?.length ? created.notes : notes,
        endedAt: created.endedAt ?? input.endedAt,
        durationSeconds: created.durationSeconds || durationSeconds,
      });
      set({ sessions: [...get().sessions, session] });
      return session;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to add time entry" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setSelectedUrgency: (u) => set({ selectedUrgency: u }),

  loadClients: async () => {
    try {
      const { clients } = await api.clients.list();
      const deletedClients = getSyncEngine().getPendingDeletes("clients");
      set({ clients: (clients || []).filter((c) => !deletedClients.has(c.id)) });
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  },

  loadProjects: async () => {
    try {
      const { projects } = await api.projects.list();
      const deletedProjects = getSyncEngine().getPendingDeletes("projects");
      set({ projects: withProjectDisplayFallbacks(projects || []).filter((p) => !deletedProjects.has(p.id)) });
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  },

  loadTasks: async () => {
    try {
      const { tasks } = await api.tasks.list();
      const deletedTasks = getSyncEngine().getPendingDeletes("tasks");
      set({ tasks: withTaskDisplayFallbacks(tasks || []).filter((t) => !deletedTasks.has(t.id)) });
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  },

  loadSessions: async () => {
    try {
      const { sessions } = await api.sessions.list();
      const deletedSessions = getSyncEngine().getPendingDeletes("sessions");
      const remoteSessionsFiltered = (sessions || [])
        .map(normalizeSession)
        .filter((s) => !deletedSessions.has(s.id));
      const merged = mergeSessionLists(remoteSessionsFiltered, get().sessions.filter((s) => !deletedSessions.has(s.id)));
      const mergedSessions = freezeStaleRunning(merged);
      set({ sessions: mergedSessions });

      // Check for active session (not ended)
      const activeSession = mergedSessions.find((s: Session) => !s.endedAt && ["running", "paused", "finishing"].includes(normalizeSession(s).state));
      set({ activeSessionId: activeSession?.id ?? null });
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  },

  loadAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const [clientsResult, projectsResult, tasksResult, sessionsResult] = await Promise.all([
        api.clients.list(),
        api.projects.list(),
        api.tasks.list(),
        api.sessions.list(),
      ]);

      const syncEngine = getSyncEngine();
      const deletedSessions = syncEngine.getPendingDeletes("sessions");
      const deletedTasks = syncEngine.getPendingDeletes("tasks");
      const deletedProjects = syncEngine.getPendingDeletes("projects");
      const deletedClients = syncEngine.getPendingDeletes("clients");

      const remoteSessionsFiltered = (sessionsResult.sessions || [])
        .map(normalizeSession)
        .filter((s) => !deletedSessions.has(s.id));

      const sessions = freezeStaleRunning(
        mergeSessionLists(remoteSessionsFiltered, get().sessions.filter((s) => !deletedSessions.has(s.id)))
      );

      const remoteTasksFiltered = (tasksResult.tasks || [])
        .filter((t) => !deletedTasks.has(t.id));

      const tasks = reconcileSessionTasks(withTaskDisplayFallbacks(remoteTasksFiltered), sessions);

      const remoteProjectsFiltered = withProjectDisplayFallbacks(projectsResult.projects || [])
        .filter((p) => !deletedProjects.has(p.id));

      const remoteClientsFiltered = (clientsResult.clients || [])
        .filter((c) => !deletedClients.has(c.id));

      set({
        clients: remoteClientsFiltered,
        projects: remoteProjectsFiltered,
        tasks,
        sessions,
        activeSessionId: sessions.find((s: Session) => !s.endedAt && ["running", "paused", "finishing"].includes(normalizeSession(s).state))?.id ?? null,
        initialLoadComplete: true,
      });

      await get().performDailyArchive();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ isLoading: false });
    }
  },

  performDailyArchive: async () => {
    const today = new Date().toISOString().split('T')[0];
    const lastArchiveDate = get().lastDailyArchiveDate;
    
    if (lastArchiveDate === today) {
      return;
    }

    const todayStart = new Date(today).getTime();
    const tasksToArchive = get().tasks.filter(
      (t) => t.status === "done" && t.completedAt && t.completedAt < todayStart && !t.archived
    );

    const projectsToArchive = get().projects.filter(
      (p) => p.status === "completed" && p.completedAt && p.completedAt < todayStart && !p.archived && !p.archivedAt
    );

    if (tasksToArchive.length === 0 && projectsToArchive.length === 0) {
      set({ lastDailyArchiveDate: today });
      return;
    }

    const now = Date.now();
    await Promise.all([
      ...tasksToArchive.map((task) =>
        api.tasks.update(task.id, taskUpdatePayload(task, { archived: true, archivedAt: now })).catch((error) => {
          console.error(`Failed to archive task ${task.id}:`, error);
        })
      ),
      ...projectsToArchive.map((project) =>
        api.projects.update(project.id, { archived: true, archivedAt: now, status: "archived" }).catch((error) => {
          console.error(`Failed to archive project ${project.id}:`, error);
        })
      )
    ]);

    set({
      tasks: get().tasks.map((t) => {
        const shouldArchive = tasksToArchive.some((ta) => ta.id === t.id);
        return shouldArchive ? { ...t, archived: true, archivedAt: now } : t;
      }),
      projects: get().projects.map((p) => {
        const shouldArchive = projectsToArchive.some((pa) => pa.id === p.id);
        return shouldArchive ? { ...p, archived: true, archivedAt: now, status: "archived" } : p;
      }),
      lastDailyArchiveDate: today,
    });
  },

  clearAll: () => set({
    clients: [],
    projects: [],
    tasks: [],
    sessions: [],
    activeSessionId: null,
    completionAlarmSessionId: null,
    user: null,
    error: null,
    lastDailyArchiveDate: undefined,
    initialLoadComplete: false,
  }),
}), {
  name: "flowmate-supabase-session-store",
  partialize: (state) => ({
    sessions: state.sessions.filter((session) => !reportableSession(session)),
    activeSessionId: state.activeSessionId,
    preferences: state.preferences,
  }),
  onRehydrateStorage: () => (state) => {
    if (!state) return;
    const sessions = freezeStaleRunning(state.sessions);
    state.sessions = sessions;
    const active = sessions.find((s) => s.id === state.activeSessionId);
    if (!active || normalizeSession(active).state === "confirmed") {
      state.activeSessionId = null;
    }
  },
})
);
