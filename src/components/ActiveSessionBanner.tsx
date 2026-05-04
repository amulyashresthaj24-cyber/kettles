"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Stop, ArrowUpRight } from "@/components/ui/icon";
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
  const stop = useApp((s) => s.stopSession);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!session || session.paused) return;
    const i = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, [session]);

  if (!session || !task) return null;

  const elapsed =
    session.durationSeconds +
    (session.paused
      ? 0
      : Math.floor((Date.now() - session.startedAt) / 1000));

  return (
    <div
      className="flex items-center gap-3 rounded-[8px] px-4 py-2.5 text-[13px]"
      style={{ background: "linear-gradient(135deg, var(--card-gradient-start) 0%, var(--card-gradient-mid) 100%)" }}
    >
      <span className="relative flex shrink-0" aria-hidden>
        {!session.paused && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-40 animate-ping" />
        )}
        <span
          className={`relative h-2 w-2 rounded-full ${session.paused ? "bg-text-faint" : "bg-success"}`}
        />
      </span>
      <span className="flex-1 min-w-0 truncate text-text-primary">
        {session.paused ? <span className="text-text-muted">Paused · </span> : null}
        <strong className="font-semibold">{task.title || "Untitled task"}</strong>
        {project && <span className="text-text-muted"> · {project.name}</span>}
      </span>
      <span className="font-mono text-[13px] tabular-nums text-text-primary shrink-0">
        {formatHMS(elapsed)}
      </span>
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label={session.paused ? "Resume session" : "Pause session"}
        onClick={() => (session.paused ? resume() : pause())}
      >
        {session.paused
          ? <Play size={14} weight="regular" aria-hidden />
          : <Pause size={14} weight="regular" aria-hidden />}
      </Button>
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label="Stop session"
        onClick={() => { stop(); router.push("/timer"); }}
      >
        <Stop size={14} weight="regular" aria-hidden />
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
