"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, ArrowUpRight, CheckCircle } from "@/components/ui/icon";
import { useApp } from "@/lib/store-supabase";
import { formatHMS } from "@/lib/format";
import { Button } from "./ui/button";

export function ActiveSessionBanner() {
  const router = useRouter();
  const activeSessionId = useApp((s) => s.activeSessionId);
  const session = useApp((s) =>
    activeSessionId ? s.sessions.find((x) => x.id === activeSessionId) : undefined
  );
  const task = useApp((s) =>
    session ? s.tasks.find((t) => t.id === session.taskId) : undefined
  );
  const project = useApp((s) =>
    session ? s.projects.find((p) => p.id === session.projectId) : undefined
  );
  const pause = useApp((s) => s.pauseSession);
  const resume = useApp((s) => s.resumeSession);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!session || session.state !== "running") return;
    const i = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, [session]);

  if (!session) return null;

  const elapsed =
    session.durationSeconds +
    (session.state !== "running"
      ? 0
      : Math.floor((Date.now() - session.startedAt) / 1000));
  const isDraft = session.isDraft || !task;
  const isPaused = session.state === "paused" || session.state === "finishing";
  const label = isDraft
    ? session.state === "finishing"
      ? "Draft session · Paused for review"
      : "Draft session · Not counted yet"
    : session.state === "finishing"
      ? `${task.title} · Paused for review`
      : `${task.title} · ${project?.name ?? "No project"} · ${session.billable ? "Billable" : "Internal"}`;

  return (
    <div
      className="flex items-center gap-3 rounded-[8px] px-4 py-2.5 text-[13px]"
      style={{ background: "linear-gradient(135deg, var(--card-gradient-start) 0%, var(--card-gradient-mid) 100%)" }}
    >
      <span className="relative flex shrink-0" aria-hidden>
        {session.state === "running" && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-40 animate-ping" />
        )}
        <span
          className={`relative h-2 w-2 rounded-full ${isPaused ? "bg-text-faint" : "bg-success"}`}
        />
      </span>
      <span className="flex-1 min-w-0 truncate text-text-primary">
        <span className="text-text-muted">{isPaused ? "Paused · " : "● "}</span>
        <strong className="font-semibold">{label}</strong>
      </span>
      <span className="font-mono text-[13px] tabular-nums text-text-primary shrink-0">
        {formatHMS(elapsed)}
      </span>
      {session.state !== "finishing" && (
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={session.state === "paused" ? "Resume session" : "Pause session"}
          onClick={() => (session.state === "paused" ? resume() : pause())}
        >
          {session.state === "paused"
            ? <Play size={14} weight="regular" aria-hidden />
            : <Pause size={14} weight="regular" aria-hidden />}
        </Button>
      )}
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label="Finish session"
        onClick={() => router.push("/timer?finish=1")}
      >
        <CheckCircle size={14} weight="regular" aria-hidden />
      </Button>
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label="Open timer"
        onClick={() => router.push("/timer")}
      >
        <ArrowUpRight size={14} weight="regular" aria-hidden />
      </Button>
    </div>
  );
}
