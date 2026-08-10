"use client";

import { useCallback } from "react";
import { useApp } from "@/lib/store-supabase";
import { useNotification } from "@/components/ui/notification";
import type { Task } from "@/lib/types";

/**
 * Archive / restore a task with an Undo toast and real failure handling.
 *
 * `archiveTask` and `restoreTask` in the store reject on failure. Every call
 * site used to fire them bare (`archiveTask(id)`), so a failed archive left the
 * row on screen with no message and produced an unhandled promise rejection.
 * Three surfaces need the same behaviour — TaskList, TaskCard, TaskArchive.
 */
export function useTaskArchive() {
  const archiveTask = useApp((s) => s.archiveTask);
  const restoreTask = useApp((s) => s.restoreTask);
  const { notify } = useNotification();

  const run = useCallback(
    async (task: Task, direction: "archive" | "restore") => {
      const apply = direction === "archive" ? archiveTask : restoreTask;
      const undo = direction === "archive" ? restoreTask : archiveTask;

      try {
        await apply(task.id);
        notify({
          title: direction === "archive" ? "Task archived" : "Task restored",
          description: `"${task.title}"`,
          tone: "success",
          action: {
            label: "Undo",
            onClick: () => {
              undo(task.id).catch((err) =>
                notify({
                  title: "Undo failed",
                  description: messageOf(err, "Could not revert that change."),
                  tone: "error",
                })
              );
            },
          },
        });
      } catch (err) {
        notify({
          title: direction === "archive" ? "Couldn't archive task" : "Couldn't restore task",
          description: messageOf(err, `"${task.title}" is unchanged.`),
          tone: "error",
        });
      }
    },
    [archiveTask, restoreTask, notify]
  );

  return run;
}

function messageOf(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}
