"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "./supabase";
import type { Client, Project, Task, Session, Urgency, TaskStatus } from "./types";
import { uid } from "./format";

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
  };
}

function elapsedFor(session: Session) {
  const normalized = normalizeSession(session);
  return normalized.durationSeconds + (normalized.state === "running"
    ? Math.floor((Date.now() - normalized.startedAt) / 1000)
    : 0);
}

function reportableSession(session: Session) {
  return normalizeSession(session).state === "confirmed";
}

function mergeSessionLists(remoteSessions: Session[], localSessions: Session[]) {
  const remoteIds = new Set(remoteSessions.map((session) => session.id));
  const localOnly = localSessions.filter((session) => !remoteIds.has(session.id) && !reportableSession(session));
  return [...remoteSessions, ...localOnly].map(normalizeSession);
}

function withTaskDisplayFallbacks(tasks: Task[]) {
  return tasks.map((task) => ({
    ...task,
    title: task.title?.trim() || `New test task ${task.id.slice(0, 8)}`,
    projectId: task.projectId || "unassigned",
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

  // Actions
  setUser: (user: { name: string; email?: string } | null) => void;
  
  addClient: (c: Omit<Client, "id">) => Promise<Client>;
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

  startSession: (taskId: string, billable?: boolean) => Promise<Session | null>;
  startDraftSession: (billable?: boolean) => Promise<Session | null>;
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
}

export const useApp = create<State>()(
persist((set, get) => ({
  user: null,
  clients: [],
  projects: [],
  tasks: [],
  sessions: [],
  activeSessionId: null,
  selectedProjectId: null,
  selectedTaskId: null,
  selectedUrgency: "all",
  isLoading: false,
  error: null,
  lastDailyArchiveDate: undefined,

  setUser: (user) => set({ user }),

  addClient: async (c) => {
    set({ isLoading: true, error: null });
    try {
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

  addProject: async (p) => {
    set({ isLoading: true, error: null });
    try {
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
      await api.projects.update(id, { archived: false, archivedAt: undefined, status: "active" });
      set({
        projects: get().projects.map((p) => (p.id === id ? { ...p, archived: false, archivedAt: undefined, status: "active" } : p)),
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
      const updated = await api.tasks.update(id, patch);
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
      await api.tasks.update(id, { archived: true, archivedAt: now });
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
      await api.tasks.update(id, { archived: false, archivedAt: undefined });
      set({
        tasks: get().tasks.map((t) => (t.id === id ? { ...t, archived: false, archivedAt: undefined } : t)),
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
      const patch: any = { ...(task ?? {}), status };
      if (status === "done") {
        patch.completedAt = Date.now();
      } else {
        delete patch.completedAt;
      }
      const updated = await api.tasks.update(id, patch);
      set({
        tasks: get().tasks.map((t) => (t.id === id ? { ...t, ...updated } : t)),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update task status' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  startSession: async (taskId, billable) => {
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

      set({
        sessions: [...get().sessions, session],
        activeSessionId: session.id,
      });
      
      // Auto-update task status to doing if it was todo
      if (task.status === "todo") {
        await get().setTaskStatus(taskId, "doing");
      }
      
      return session;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to start session' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  startDraftSession: async (billable = false) => {
    if (get().activeSessionId) return null;
    const session: Session = {
      id: uid(),
      taskId: "",
      projectId: "",
      billable,
      startedAt: Date.now(),
      durationSeconds: 0,
      paused: false,
      state: "running",
      isDraft: true,
      notes: [],
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
      if (!normalized.isDraft) await api.sessions.update(id, { paused: true, state: "paused", durationSeconds: duration });
      set({
        sessions: get().sessions.map((s) =>
          s.id === id ? { ...s, paused: true, state: "paused", durationSeconds: duration } : s
        ),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to pause session' });
    } finally {
      set({ isLoading: false });
    }
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
      if (!normalized.isDraft) await api.sessions.update(id, { paused: false, state: "running", startedAt });
      set({
        sessions: get().sessions.map((s) =>
          s.id === id ? { ...s, paused: false, state: "running", startedAt } : s
        ),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to resume session' });
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
      if (!normalized.isDraft) await api.sessions.update(id, patch);
      set({ sessions: get().sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to finish session" });
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
      if (!normalized.isDraft) await api.sessions.update(id, patch);
      set({ sessions: get().sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to resume session" });
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
      set({ error: error instanceof Error ? error.message : "Failed to confirm session" });
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
    set({
      sessions: get().sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      activeSessionId: null,
    });
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
    if (session && !normalizeSession(session).isDraft && id.length >= 20) {
      try {
        await api.sessions.delete(id);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : "Failed to discard session" });
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
    if (!normalizeSession(session).isDraft) {
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
    if (!normalizeSession(session).isDraft) {
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
    if (!normalizeSession(session).isDraft) {
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
      const updated = await api.sessions.update(id, {
        durationSeconds: final,
        endedAt: Date.now(),
        paused: true,
        state: "confirmed",
        isDraft: false,
      });

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

  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setSelectedUrgency: (u) => set({ selectedUrgency: u }),

  loadClients: async () => {
    try {
      const { clients } = await api.clients.list();
      set({ clients: clients || [] });
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  },

  loadProjects: async () => {
    try {
      const { projects } = await api.projects.list();
      set({ projects: withProjectDisplayFallbacks(projects || []) });
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  },

  loadTasks: async () => {
    try {
      const { tasks } = await api.tasks.list();
      set({ tasks: withTaskDisplayFallbacks(tasks || []) });
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  },

  loadSessions: async () => {
    try {
      const { sessions } = await api.sessions.list();
      const mergedSessions = mergeSessionLists((sessions || []).map(normalizeSession), get().sessions);
      set({ sessions: mergedSessions });
      
      // Check for active session (not ended)
      const activeSession = mergedSessions.find((s: Session) => !s.endedAt && ["running", "paused", "finishing"].includes(normalizeSession(s).state));
      if (activeSession) {
        set({ activeSessionId: activeSession.id });
      }
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

      const sessions = mergeSessionLists((sessionsResult.sessions || []).map(normalizeSession), get().sessions);
      const tasks = reconcileSessionTasks(withTaskDisplayFallbacks(tasksResult.tasks || []), sessions);
      const activeSession = sessions.find((s: Session) => !s.endedAt && ["running", "paused", "finishing"].includes(normalizeSession(s).state));

      set({
        clients: clientsResult.clients || [],
        projects: withProjectDisplayFallbacks(projectsResult.projects || []),
        tasks,
        sessions,
        activeSessionId: activeSession?.id ?? null,
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

    for (const task of tasksToArchive) {
      try {
        const now = Date.now();
        await api.tasks.update(task.id, { archived: true, archivedAt: now });
      } catch (error) {
        console.error(`Failed to archive task ${task.id}:`, error);
      }
    }

    for (const project of projectsToArchive) {
      try {
        const now = Date.now();
        await api.projects.update(project.id, { archived: true, archivedAt: now, status: "archived" });
      } catch (error) {
        console.error(`Failed to archive project ${project.id}:`, error);
      }
    }

    set({
      tasks: get().tasks.map((t) => {
        const shouldArchive = tasksToArchive.some((ta) => ta.id === t.id);
        return shouldArchive ? { ...t, archived: true, archivedAt: Date.now() } : t;
      }),
      projects: get().projects.map((p) => {
        const shouldArchive = projectsToArchive.some((pa) => pa.id === p.id);
        return shouldArchive ? { ...p, archived: true, archivedAt: Date.now(), status: "archived" } : p;
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
    user: null,
    error: null,
    lastDailyArchiveDate: undefined,
  }),
}), {
  name: "flowmate-supabase-session-store",
  partialize: (state) => ({
    sessions: state.sessions.filter((session) => !reportableSession(session)),
    activeSessionId: state.activeSessionId,
  }),
})
);
