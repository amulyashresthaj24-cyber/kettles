"use client";

import { create } from "zustand";
import { api } from "./supabase";
import type { Client, Project, Task, Session, Urgency, TaskStatus } from "./types";
import { uid } from "./format";

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
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  stopSession: () => Promise<Session | null>;
  adjustSessionDuration: (id: string, seconds: number) => Promise<void>;

  setSelectedProject: (id: string | null) => void;
  setSelectedUrgency: (u: Urgency | "all") => void;

  // Data loading
  loadClients: () => Promise<void>;
  loadProjects: () => Promise<void>;
  loadTasks: () => Promise<void>;
  loadSessions: () => Promise<void>;
  loadAll: () => Promise<void>;
  clearAll: () => void;
  performDailyArchive: () => Promise<void>;
}

export const useApp = create<State>()((set, get) => ({
  user: null,
  clients: [],
  projects: [],
  tasks: [],
  sessions: [],
  activeSessionId: null,
  selectedProjectId: null,
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
      const patch: any = { status };
      if (status === "done") {
        patch.completedAt = Date.now();
      }
      await api.tasks.update(id, patch);
      set({
        tasks: get().tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
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

  pauseSession: async () => {
    const id = get().activeSessionId;
    if (!id) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session || session.paused) return;

    const duration = session.durationSeconds + Math.floor((Date.now() - session.startedAt) / 1000);
    
    set({ isLoading: true, error: null });
    try {
      await api.sessions.update(id, { paused: true, durationSeconds: duration });
      set({
        sessions: get().sessions.map((s) =>
          s.id === id ? { ...s, paused: true, durationSeconds: duration } : s
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
    
    set({ isLoading: true, error: null });
    try {
      await api.sessions.update(id, { paused: false, startedAt: Date.now() });
      set({
        sessions: get().sessions.map((s) =>
          s.id === id ? { ...s, paused: false, startedAt: Date.now() } : s
        ),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to resume session' });
    } finally {
      set({ isLoading: false });
    }
  },

  stopSession: async () => {
    const id = get().activeSessionId;
    if (!id) return null;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return null;

    const final = session.paused
      ? session.durationSeconds
      : session.durationSeconds + Math.floor((Date.now() - session.startedAt) / 1000);

    set({ isLoading: true, error: null });
    try {
      const updated = await api.sessions.update(id, {
        durationSeconds: final,
        endedAt: Date.now(),
        paused: true,
      });

      set({
        sessions: get().sessions.map((s) => (s.id === id ? updated : s)),
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
      set({ sessions: sessions || [] });
      
      // Check for active session (not ended)
      const activeSession = sessions?.find((s: Session) => !s.endedAt);
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

      const sessions = sessionsResult.sessions || [];
      const tasks = reconcileSessionTasks(withTaskDisplayFallbacks(tasksResult.tasks || []), sessions);
      const activeSession = sessions.find((s: Session) => !s.endedAt);

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
}));
