"use client";

import { motion } from "framer-motion";
import { Checks, ArrowClockwise, PencilSimple, Archive, Trash, Spinner } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@/lib/types";
import { useEffect, useState } from "react";

const STATUS_DOT: Record<string, string> = {
  todo: "bg-emerald-500",
  doing: "bg-amber-400",
  done: "bg-blue-500",
};

const URGENCY_BADGE_VARIANT: Record<string, "error" | "warning" | "accent" | "raised"> = {
  urgent: "error",
  high: "warning",
  normal: "accent",
  low: "raised",
};

export function MockTaskCard({ task, isActive = false }: { task: Task; isActive?: boolean }) {
  const isDone = task.status === "done";
  const urgencyLabel = task.urgency.charAt(0).toUpperCase() + task.urgency.slice(1);

  return (
    <div
      className={[
        "group flex flex-col gap-2.5 rounded-xl border p-3.5 cursor-default text-left",
        "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none",
        isActive
          ? "border-transparent bg-[var(--k-tint)] shadow-[0_4px_16px_rgba(0,102,255,0.08)]"
          : isDone
          ? "border-[var(--k-line2)] bg-[var(--k-card2)] opacity-55"
          : "border-[var(--k-line2)] bg-[var(--k-card2)]",
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
          <span className={`h-[7px] w-[7px] rounded-full transition-colors ${STATUS_DOT[task.status]}`} />
        </div>
        <p
          className={[
            "flex-1 min-w-0 break-words text-[13px] font-medium leading-snug tracking-[-0.01em]",
            isDone ? "text-[var(--k-faint)] line-through" : "text-[var(--k-ink2)]",
          ].join(" ")}
        >
          {task.title}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pl-[17px]">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--k-bg2)] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--k-muted)] border border-[var(--k-line2)]">
          <span className={`h-[6px] w-[6px] rounded-full ${task.projectId === "p1" ? "bg-indigo-500" : "bg-pink-500"}`} />
          {task.projectId === "p1" ? "Northwind" : "Pricing"}
        </span>
      </div>
    </div>
  );
}

export function PerpetualKanban() {
  const [activeTask, setActiveTask] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    const timer = setInterval(() => {
      setActiveTask((prev) => (prev + 1) % 3);
    }, 2000);
    return () => clearInterval(timer);
  }, [isHovered]);

  const tasks: Task[] = [
    { id: "t1", title: "Export flow", status: "todo", projectId: "p1", urgency: "normal", createdAt: 0 },
    { id: "t2", title: "Pricing copy", status: "doing", projectId: "p2", urgency: "high", createdAt: 0 },
    { id: "t3", title: "Auth screens", status: "done", projectId: "p1", urgency: "urgent", createdAt: 0 },
  ];

  return (
    <div 
      className="grid w-full h-full grid-cols-3 gap-2.5 px-4 pb-6 pt-4 cursor-default"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {(["Todo", "Doing", "Done"] as const).map((col, ci) => (
        <div key={col} className="min-h-[160px] rounded-[18px] border border-white/5 bg-white/[0.02] p-2.5">
          <h4 className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--k-faint)]">{col}</h4>
          <div className="flex flex-col gap-2">
            {tasks.map((task, ti) => {
              const currentStatus = task.status;
              const targetStatus = ["todo", "doing", "done"][ci];
              
              let isVisible = false;
              if (activeTask === 0) {
                isVisible = currentStatus === targetStatus;
              } else if (activeTask === 1) {
                if (task.id === "t1") isVisible = targetStatus === "doing";
                else isVisible = currentStatus === targetStatus;
              } else {
                if (task.id === "t1") isVisible = targetStatus === "done";
                else if (task.id === "t2") isVisible = targetStatus === "done";
                else isVisible = currentStatus === targetStatus;
              }

              if (!isVisible) return null;

              return (
                <motion.div
                  key={task.id}
                  layoutId={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", duration: 0.45, bounce: 0.08 }}
                >
                  <MockTaskCard task={{ ...task, status: targetStatus as any }} isActive={targetStatus === "doing"} />
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FloatingMockDashboard() {
  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", duration: 0.6, bounce: 0.1 }}
      viewport={{ once: true, margin: "-100px" }}
      className="w-full max-w-[800px] rounded-3xl border border-[var(--k-line2)] bg-[var(--k-card)] p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.85)] relative overflow-hidden k-glass-panel"
    >
      {/* ... Dashboard mock UI that uses MockTaskCard ... */}
      <div className="mb-6 flex items-center justify-between">
         <h3 className="text-xl font-semibold text-white">Up Next</h3>
         <div className="flex gap-2">
            <div className="h-8 w-8 rounded-full border border-[var(--k-line2)] bg-[var(--k-bg2)]" />
            <div className="h-8 w-8 rounded-full border border-[var(--k-line2)] bg-[var(--k-bg2)]" />
         </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <MockTaskCard task={{ id: "t1", title: "Review marketing copy", status: "todo", projectId: "p1", urgency: "high", createdAt: 0 }} />
        <MockTaskCard task={{ id: "t2", title: "Deploy to production", status: "doing", projectId: "p2", urgency: "urgent", createdAt: 0 }} isActive />
      </div>
    </motion.div>
  )
}

// ----- Hero Redesign Flanking Cards (Linkd reference) ---------------------
import { User, Clock, Terminal, Globe, Lock, Shield, Cpu, CalendarBlank, Key, Crosshair, Tag, Plus } from "@phosphor-icons/react";

export function HeroVisuals() {
  return (
    <div className="relative mt-16 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start w-full max-w-[1240px] px-6">

      {/* Left Card: Recent focus logs (James Brighton reference) */}
      <div className="k-card-fade lg:col-span-3 lg:mt-12 rounded-[20px] border border-white/[0.06] bg-[#181818]/80 backdrop-blur-xl p-5 text-left shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] min-h-[330px] flex flex-col justify-between overflow-hidden k-interactive-card k-sheen-code">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--k-accent)] to-[var(--k-accent2)] flex items-center justify-center text-white font-semibold">
            AV
          </div>
          <div>
            <h4 className="text-[14px] font-semibold text-[var(--k-ink)]">Alexander Vance</h4>
            <p className="text-[12px] text-[var(--k-muted)]">alex@vance.design</p>
          </div>
        </div>
        
        <div className="flex flex-col gap-3.5 flex-1 justify-center">
          <div className="flex gap-3 p-1.5 rounded-lg border border-transparent">
            <Clock size={16} className="text-[var(--k-muted)] mt-0.5" />
            <div>
              <div className="text-[12.5px] font-medium text-[var(--k-ink2)]">Design System Refactor</div>
              <div className="text-[11px] text-[var(--k-faint)]">Jun 8 · 1h 42m · Flowmate</div>
            </div>
          </div>
          
          <div className="flex gap-3 p-1.5 rounded-lg border border-transparent">
            <Clock size={16} className="text-[var(--k-muted)] mt-0.5" />
            <div>
              <div className="text-[12.5px] font-medium text-[var(--k-ink2)]">Landing Page Design</div>
              <div className="text-[11px] text-[var(--k-faint)]">Jun 7 · 2h 15m · Flowmate</div>
            </div>
          </div>

          <div className="flex gap-3 p-1.5 rounded-lg border border-transparent">
            <Clock size={16} className="text-[var(--k-muted)] mt-0.5" />
            <div>
              <div className="text-[12.5px] font-medium text-[var(--k-ink2)]">API Schema Blueprint</div>
              <div className="text-[11px] text-[var(--k-faint)]">Jun 5 · 3h 12m · Northwind</div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-white/5 flex gap-2 text-[10.5px] text-[var(--k-muted)] font-medium">
          <span className="bg-white/5 px-2 py-0.5 rounded-full border border-white/5">macOS</span>
          <span className="bg-white/5 px-2 py-0.5 rounded-full border border-white/5">Safari</span>
        </div>
      </div>

      {/* Center Card: Active Pomodoro / Kettle tracking visual */}
      <div className="k-card-fade lg:col-span-6 self-start rounded-[20px] border border-white/[0.06] bg-[#181818]/80 backdrop-blur-xl p-8 text-center shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] min-h-[300px] flex flex-col justify-between relative overflow-hidden k-interactive-card">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[11px] font-semibold text-[var(--k-ink2)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ACTIVE SESSION
          </span>
          <h3 className="text-2xl font-bold mt-4 text-[var(--k-ink)] tracking-tight">Kettles Landing Page</h3>
          <p className="text-[13px] text-[var(--k-muted)] mt-1.5">Focus period for marketing redesign</p>
        </div>

        <div className="my-6">
          <span className="k-mono text-[52px] font-semibold tracking-[-0.04em] text-white k-glow-text">
            18:42
          </span>
        </div>

        <div className="flex justify-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--k-tint)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--k-accent2)] border border-[var(--k-tint2)]">
            <Tag size={12} /> Flowmate
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11.5px] font-medium text-[var(--k-ok)] border border-emerald-500/20">
            $90/hr
          </span>
        </div>

      </div>

      {/* Right Card: Code block Snip (Figma SDK reference) */}
      <div className="k-card-fade lg:col-span-3 lg:mt-12 rounded-[20px] border border-white/[0.06] bg-[#181818]/80 backdrop-blur-xl p-5 text-left shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] min-h-[330px] flex flex-col justify-between overflow-hidden k-interactive-card k-sheen-code">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Terminal size={14} className="text-[var(--k-accent2)]" />
            <span className="text-[11.5px] font-semibold tracking-[0.05em] text-[var(--k-muted)] uppercase">flowmate SDK</span>
          </div>
          <pre className="text-[11px] leading-[1.5] text-indigo-200/90 font-mono overflow-x-auto">
            <code>
{`import { Billing } from "flowmate";
 
const ledger = new Billing({
  apiKey: "FM_API_KEY"
});
 
const report = await ledger.reports.get({
  project: "marketing-v3",
  billedOnly: true
});
 
// Hours Billed: 34.8h
// Amount Due:  $2,784.00`}
            </code>
          </pre>
        </div>

        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[var(--k-muted)] font-medium">
          <span className="inline-flex items-center gap-1.5">
            <Shield size={12} className="text-[var(--k-muted)]" /> SOC2 Verified
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock size={12} className="text-[var(--k-muted)]" /> GDPR Protected
          </span>
        </div>
      </div>

      {/* Trust badges — centered row below the center card */}
      <div className="lg:col-span-12 flex items-center justify-center gap-7 text-[11.5px] text-[var(--k-muted)] font-medium -mt-2">
        <span className="inline-flex items-center gap-1.5"><Globe size={13} className="text-[var(--k-muted)]" /> GDPR</span>
        <span className="inline-flex items-center gap-1.5"><Lock size={13} className="text-[var(--k-muted)]" /> SOC2</span>
        <span className="inline-flex items-center gap-1.5"><Shield size={13} className="text-[var(--k-muted)]" /> ISO 27001</span>
      </div>

    </div>
  );
}

// ----- Feature Redesign Mock Modal Dialog (Linkd reference) -----------------
export function MockCreateTaskModal() {
  return (
    <div className="w-full max-w-[700px] rounded-3xl border border-[var(--k-line2)] bg-[var(--k-card)] p-8 text-left shadow-[0_30px_60px_-15px_rgba(0,0,0,0.85)] relative overflow-hidden k-glass-panel z-10">
      
      {/* Heading */}
      <div className="flex items-center gap-2.5 mb-6 border-b border-white/5 pb-4">
        <Plus size={18} className="text-[var(--k-accent2)]" />
        <h3 className="text-[17px] font-bold text-white tracking-tight">Create New Task</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Inputs */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-semibold text-[var(--k-muted)] uppercase tracking-[0.05em] mb-1.5 block">
              Task Title *
            </label>
            <input 
              type="text" 
              readOnly 
              value="Write pricing copy & hero layouts" 
              className="h-10 w-full rounded-lg border border-[var(--k-line2)] bg-[var(--k-bg2)] px-3 text-[13.5px] text-[var(--k-ink)] outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[var(--k-muted)] uppercase tracking-[0.05em] mb-1.5 block">
              Project Short Code
            </label>
            <div className="relative">
              <input 
                type="text" 
                readOnly 
                value="flowmate" 
                className="h-10 w-full rounded-lg border border-[var(--k-line2)] bg-[var(--k-bg2)] px-3 pr-10 text-[13.5px] text-[var(--k-ink)] outline-none"
              />
              <span className="absolute right-3 top-3.5 h-[6px] w-[6px] rounded-full bg-indigo-500" />
            </div>
          </div>
        </div>

        {/* Right Inputs */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-semibold text-[var(--k-muted)] uppercase tracking-[0.05em] mb-1.5 block">
              Estimated Hours
            </label>
            <input 
              type="text" 
              readOnly 
              value="3 hours" 
              className="h-10 w-full rounded-lg border border-[var(--k-line2)] bg-[var(--k-bg2)] px-3 text-[13.5px] text-[var(--k-ink)] outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[var(--k-muted)] uppercase tracking-[0.05em] mb-1.5 block">
              Task Description
            </label>
            <input 
              type="text" 
              readOnly 
              value="Drafting billing copying and matching visual layouts." 
              className="h-10 w-full rounded-lg border border-[var(--k-line2)] bg-[var(--k-bg2)] px-3 text-[13.5px] text-[var(--k-ink)] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Bottom Option Badges (Password, Targeting, Expiration match) */}
      <div className="mt-6 flex flex-wrap gap-2.5 pt-5 border-t border-white/5">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--k-bg2)] border border-[var(--k-line2)] px-3.5 py-2 text-[12px] font-medium text-[var(--k-ink2)]">
          <Key size={14} className="text-[var(--k-muted)]" /> Passcode Lock
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-[var(--k-bg2)] border border-[var(--k-line2)] px-3.5 py-2 text-[12px] font-medium text-[var(--k-ink2)]">
          <Crosshair size={14} className="text-indigo-400" /> Billing Rate ($90/hr)
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-[var(--k-bg2)] border border-[var(--k-line2)] px-3.5 py-2 text-[12px] font-medium text-[var(--k-ink2)]">
          <CalendarBlank size={14} className="text-rose-400" /> Target Date (Today)
        </div>
        
        {/* Action Button */}
        <button className="ml-auto bg-white text-black rounded-full font-bold px-6 py-2 text-[13.5px] hover:bg-white/90 transition active:scale-[0.98] shadow-md">
          Start Active Brew
        </button>
      </div>

    </div>
  );
}
