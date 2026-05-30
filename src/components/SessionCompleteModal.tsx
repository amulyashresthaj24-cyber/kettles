"use client";

import { useState } from "react";
import { Checks, ArrowClockwise, Pause } from "@/components/ui/icon";
import { Modal } from "./ui/modal";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { Task } from "@/lib/types";
import { useApp } from "@/lib/store-supabase";
import { formatHMS } from "@/lib/format";

interface SessionCompleteModalProps {
  open: boolean;
  sessionId: string;
  seconds: number;
  task: Task | null;
  onClose: () => void;
  onAdjust: (seconds: number) => void;
}

export function SessionCompleteModal({
  open,
  sessionId,
  seconds,
  task,
  onClose,
  onAdjust,
}: SessionCompleteModalProps) {
  const setTaskStatus = useApp((s) => s.setTaskStatus);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSeconds, setEditedSeconds] = useState(String(seconds));
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveTime = () => {
    const newSeconds = Math.max(0, Number(editedSeconds));
    onAdjust(newSeconds);
    setIsEditing(false);
  };

  const handleComplete = () => {
    if (!task) return;
    setIsLoading(true);
    try {
      setTaskStatus(task.id, "done");
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleReopen = () => {
    if (!task) return;
    setIsLoading(true);
    try {
      setTaskStatus(task.id, "todo");
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeepProgress = () => {
    if (!task) return;
    setIsLoading(true);
    try {
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h2 className="text-[18px] font-semibold text-text-primary">
            Session logged
          </h2>
          <p className="text-[14px] text-text-muted">
            Logged time for <strong className="text-text-primary font-medium">{task.title}</strong>
          </p>
        </div>

        {/* Session Summary */}
        <div
          className="rounded-lg p-4 flex flex-col gap-3"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-text-muted uppercase font-semibold">
              Logged time
            </span>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="60"
                  value={editedSeconds}
                  onChange={(e) => setEditedSeconds(e.target.value)}
                  className="w-20 h-8 px-2 text-[12px]"
                  placeholder="0"
                />
                <span className="text-[11px] text-text-muted">sec</span>
                <button
                  onClick={handleSaveTime}
                  className="text-[11px] font-medium text-accent hover:text-accent-hover"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsEditing(true);
                  setEditedSeconds(String(seconds));
                }}
                className="text-[14px] font-semibold text-text-primary hover:text-accent transition-colors"
              >
                {formatHMS(seconds)}
              </button>
            )}
          </div>
          <p className="text-[11px] text-text-faint">
            Click time to adjust if needed.
          </p>
        </div>

        {/* Task Completion Question */}
        <div className="flex flex-col gap-3">
          <p className="text-[13px] font-medium text-text-primary">
            Mark task complete?
          </p>

          <div className="flex flex-col gap-2">
            <Button
              disabled={isLoading}
              onClick={handleComplete}
              variant="primary"
              className="w-full justify-start gap-2 h-auto py-3 px-4 flex items-center"
            >
              <Checks size={16} />
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[13px] font-semibold">Mark as done</span>
                <span className="text-[11px] text-white/60">Move to Done column</span>
              </div>
            </Button>

            <Button
              disabled={isLoading}
              onClick={handleKeepProgress}
              variant="secondary"
              className="w-full justify-start gap-2 h-auto py-3 px-4 flex items-center"
            >
              <Pause size={16} />
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[13px] font-semibold">Keep in progress</span>
                <span className="text-[11px] text-text-secondary">Continue later</span>
              </div>
            </Button>

            <Button
              disabled={isLoading}
              onClick={handleReopen}
              variant="secondary"
              className="w-full justify-start gap-2 h-auto py-3 px-4 flex items-center"
            >
              <ArrowClockwise size={16} />
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[13px] font-semibold">Reopen as To Do</span>
                <span className="text-[11px] text-text-secondary">Move back to backlog</span>
              </div>
            </Button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-text-faint">
          You can always change this later from the board.
        </p>
      </div>
    </Modal>
  );
}
