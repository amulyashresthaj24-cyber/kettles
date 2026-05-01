"use client";

import { create } from "zustand";
import { api } from "./supabase";
import type { Client, Project, Task, Session, Urgency, TaskStatus } from "./types";
import { uid } from "./format";

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

  // Actions
  setUser: (user: { name: string; email?: string } | null) => void;
  
  addClient: (c: Omit<Client, "id">) => Promise<Client>;
  addProject: (p: Omit<Project, "id">) => Promise<Project>;
  updateProject: (id: string, patch: Partial<Omit<Project, "id">>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  addTask: (t: Omit<Task, "id" | "createdAt" | "status"> & { status?: TaskStatus }) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
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

  setTaskStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      await api.tasks.update(id, { status });
      set({
        tasks: get().tasks.map((t) => (t.id === id ? { ...t, status } : t)),
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
      
      // Auto-update task status to in_progress if it was todo
      if (task.status === "todo") {
        await get().setTaskStatus(taskId, "in_progress");
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
      set({ projects: projects || [] });
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  },

  loadTasks: async () => {
    try {
      const { tasks } = await api.tasks.list();
      set({ tasks: tasks || [] });
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
      await Promise.all([
        get().loadClients(),
        get().loadProjects(),
        get().loadTasks(),
        get().loadSessions(),
      ]);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ isLoading: false });
    }
  },

  clearAll: () => set({
    clients: [],
    projects: [],
    tasks: [],
    sessions: [],
    activeSessionId: null,
    user: null,
    error: null,
  }),
}));
