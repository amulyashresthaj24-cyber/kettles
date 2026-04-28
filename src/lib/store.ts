"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Client,
  Project,
  Task,
  Session,
  Urgency,
  TaskStatus,
} from "./types";
import { uid } from "./format";

interface State {
  user: { name: string };
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  sessions: Session[];
  activeSessionId: string | null;

  selectedProjectId: string | null;
  selectedUrgency: Urgency | "all";

  addClient: (c: Omit<Client, "id">) => Client;
  addProject: (p: Omit<Project, "id">) => Project;
  updateProject: (id: string, patch: Partial<Omit<Project, "id">>) => void;
  deleteProject: (id: string) => void;
  addTask: (t: Omit<Task, "id" | "createdAt" | "status"> & { status?: TaskStatus }) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;

  startSession: (taskId: string, billable?: boolean) => Session | null;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: () => Session | null;
  adjustSessionDuration: (id: string, seconds: number) => void;

  setSelectedProject: (id: string | null) => void;
  setSelectedUrgency: (u: Urgency | "all") => void;

  initializeFromJSON: (data: any) => void;
}

const defaultState = {
  user: { name: "Amulya" },
  clients: [] as Client[],
  projects: [] as Project[],
  tasks: [] as Task[],
  sessions: [] as Session[],
  activeSessionId: null as string | null,
  selectedProjectId: null as string | null,
  selectedUrgency: "all" as Urgency | "all",
};

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      ...defaultState,

      addClient: (c) => {
        const created = { ...c, id: uid() };
        set({ clients: [...get().clients, created] });
        return created;
      },
      addProject: (p) => {
        const created = { ...p, id: uid() };
        set({ projects: [...get().projects, created] });
        return created;
      },
      updateProject: (id, patch) =>
        set({ projects: get().projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),
      deleteProject: (id) => set({ projects: get().projects.filter((p) => p.id !== id) }),
      addTask: (t) => {
        const created: Task = {
          ...t,
          id: uid(),
          status: t.status ?? "todo",
          createdAt: Date.now(),
        };
        set({ tasks: [...get().tasks, created] });
        return created;
      },
      updateTask: (id, patch) =>
        set({ tasks: get().tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),
      deleteTask: (id) => set({ tasks: get().tasks.filter((t) => t.id !== id) }),
      setTaskStatus: (id, status) =>
        set({ tasks: get().tasks.map((t) => (t.id === id ? { ...t, status } : t)) }),

      startSession: (taskId, billable) => {
        if (get().activeSessionId) return null;
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return null;
        const project = get().projects.find((p) => p.id === task.projectId);
        const s: Session = {
          id: uid(),
          taskId,
          projectId: task.projectId,
          billable: billable ?? project?.billable ?? false,
          startedAt: Date.now(),
          durationSeconds: 0,
          paused: false,
        };
        set({
          sessions: [...get().sessions, s],
          activeSessionId: s.id,
          tasks: get().tasks.map((t) => (t.id === taskId && t.status === "todo" ? { ...t, status: "in_progress" } : t)),
        });
        return s;
      },
      pauseSession: () => {
        const id = get().activeSessionId;
        if (!id) return;
        set({
          sessions: get().sessions.map((s) =>
            s.id === id && !s.paused
              ? { ...s, paused: true, durationSeconds: s.durationSeconds + Math.floor((Date.now() - s.startedAt) / 1000) }
              : s
          ),
        });
      },
      resumeSession: () => {
        const id = get().activeSessionId;
        if (!id) return;
        set({
          sessions: get().sessions.map((s) =>
            s.id === id && s.paused ? { ...s, paused: false, startedAt: Date.now() } : s
          ),
        });
      },
      stopSession: () => {
        const id = get().activeSessionId;
        if (!id) return null;
        const s = get().sessions.find((x) => x.id === id);
        if (!s) return null;
        const final = s.paused
          ? s.durationSeconds
          : s.durationSeconds + Math.floor((Date.now() - s.startedAt) / 1000);
        const updated: Session = { ...s, durationSeconds: final, endedAt: Date.now(), paused: true };
        set({
          sessions: get().sessions.map((x) => (x.id === id ? updated : x)),
          activeSessionId: null,
        });
        return updated;
      },
      adjustSessionDuration: (id, seconds) =>
        set({
          sessions: get().sessions.map((s) => (s.id === id ? { ...s, durationSeconds: seconds } : s)),
        }),

      setSelectedProject: (id) => set({ selectedProjectId: id }),
      setSelectedUrgency: (u) => set({ selectedUrgency: u }),

      initializeFromJSON: (data) => {
        set({
          user: data.user || { name: "Amulya" },
          clients: data.clients || [],
          projects: data.projects || [],
          tasks: data.tasks || [],
          sessions: data.sessions || [],
        });
      },
    }),
    { name: "flowmate-store" }
  )
);

export async function initializeStore() {
  try {
    const response = await fetch("/data.json");
    if (!response.ok) throw new Error("Failed to load data");
    const data = await response.json();
    useApp.getState().initializeFromJSON(data);
  } catch (error) {
    console.error("Error loading data.json:", error);
  }
}
