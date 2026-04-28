export type Urgency = "urgent" | "high" | "normal" | "low";
export type TaskStatus = "todo" | "in_progress" | "done";
export type ProjectColor = "teal" | "amber" | "rose" | "indigo";

export interface Client {
  id: string;
  name: string;
  hourlyRate: number;
}

export interface Project {
  id: string;
  name: string;
  clientId?: string;
  color: ProjectColor;
  billable: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  urgency: Urgency;
  status: TaskStatus;
  estimateMinutes?: number;
  tags?: string[];
  assignees?: string[];
  dateRange?: string;
  createdAt: number;
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
}
