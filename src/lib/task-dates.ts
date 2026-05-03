import type { Task } from "./types";

export function taskDateTimestamp(task: Task): number {
  if (typeof task.dateRange === "string" && task.dateRange.trim()) {
    const parsed = new Date(`${task.dateRange}T12:00:00`).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }

  if (task.completedAt) return task.completedAt;
  return task.createdAt;
}

export function isTaskOnDay(task: Task, start: number, end: number): boolean {
  const timestamp = taskDateTimestamp(task);
  return timestamp >= start && timestamp < end;
}
