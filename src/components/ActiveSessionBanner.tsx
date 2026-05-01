"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Square, ExternalLink } from "lucide-react";
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
    <div className="flex items-center gap-md rounded-md bg-accent-dim px-lg py-sm text-[13px]">
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full bg-status-success",
          !session.paused && "animate-pulse"
        )}
      />
      <span className="flex-1 truncate text-text-primary">
        Working on <strong className="font-semibold">{task.title}</strong>
        {project && (
          <span className="text-text-muted"> · {project.name}</span>
        )}
      </span>
      <span className="font-mono text-[14px] tabular-nums text-text-primary">
        {formatHMS(elapsed)}
      </span>
      <Button
        size="xs"
        variant="ghost"
        aria-label={session.paused ? "Resume" : "Pause"}
        onClick={() => (session.paused ? resume() : pause())}
      >
        {session.paused ? <Play size={13} /> : <Pause size={13} />}
      </Button>
      <Button
        size="xs"
        variant="ghost"
        aria-label="Stop"
        onClick={() => {
          stop();
          router.push("/timer");
        }}
      >
        <Square size={13} />
      </Button>
      <Button
        size="xs"
        variant="ghost"
        aria-label="View timer"
        onClick={() => router.push("/timer")}
      >
        <ExternalLink size={13} />
      </Button>
    </div>
  );
}

// cn inline to avoid extra import — component is standalone
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
