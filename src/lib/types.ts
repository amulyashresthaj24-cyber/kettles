export type Urgency = "urgent" | "high" | "normal" | "low";
export type TaskStatus = "todo" | "doing" | "done";
export type ProjectColor = string;
export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type SessionState = "running" | "paused" | "finishing" | "confirmed" | "draft" | "discarded";

export interface SessionNote {
  id: string;
  timestamp: number;
  text: string;
}

export interface Client {
  id: string;
  name: string;
  hourlyRate: number;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  clientId?: string;
  color: ProjectColor;
  icon?: string;
  billable: boolean;
  /** Project hourly rate in USD. Preferred over client rate for earnings. */
  hourlyRate?: number;
  status?: ProjectStatus;
  startDate?: number;
  endDate?: number;
  budget?: number;
  createdAt?: number;
  updatedAt?: number;
  completedAt?: number;
  archived?: boolean;
  archivedAt?: number;
  tags?: string[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId?: string | null;
  urgency: Urgency;
  status: TaskStatus;
  estimateMinutes?: number;
  tags?: string[];
  assignees?: string[];
  dateRange?: string;
  createdAt: number;
  updatedAt?: number;
  completedAt?: number;
  archived?: boolean;
  archivedAt?: number;
  deletedAt?: number;
}

export interface Session {
  id: string;
  taskId: string;
  projectId: string;
  billable: boolean;
  startedAt: number;
  endedAt?: number;
  durationSeconds: number;
  paused: boolean;
  state: SessionState;
  isDraft?: boolean;
  notes?: SessionNote[];
  frozenAt?: number;
  estimateMinutes?: number;
  /** Estimate value the completion alarm already fired at (local-only latch). */
  completionAckMinutes?: number;
}
