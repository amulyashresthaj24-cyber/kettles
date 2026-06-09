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
        <div key={col} className="min-h-[160px] rounded-[18px] border border-[var(--k-hairline)] bg-[var(--k-surface-soft)] p-2.5">
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
         <h3 className="text-xl font-semibold text-[var(--k-ink)]">Up Next</h3>
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
import { User, Clock, Terminal, Globe, Lock, Shield, Cpu, CalendarBlank, Key, Crosshair, Tag, Plus, CheckCircle, Pause, Stop, ChartBar } from "@phosphor-icons/react";

export function HeroVisuals() {
  return (
    <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-12 items-start w-full max-w-[1240px] px-6">

      {/* Left Card: Task Queue / Kanban */}
      <div className="k-card-fade lg:col-span-3 lg:mt-12 rounded-[24px] border border-[var(--k-hairline)] bg-[var(--k-card)] p-6 text-left shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] min-h-[330px] flex flex-col justify-between overflow-hidden k-interactive-card">
        <div>
          <div className="flex items-center gap-2.5 mb-5">
            <CheckCircle size={18} weight="fill" className="text-[#0066ff]" />
            <h3 className="text-[14.5px] font-semibold text-[var(--k-ink)] tracking-tight">Today&apos;s Focus</h3>
          </div>
          
          <div className="flex flex-col gap-3">
            {/* Task 1 */}
            <div className="rounded-[14px] border border-[var(--k-hairline)] bg-[var(--k-surface-soft)] p-3.5 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[12.5px] font-medium text-[var(--k-ink2)] leading-snug">Landing Page Redesign</span>
                <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 mt-1 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              </div>
              <div className="flex gap-1.5">
                <span className="h-1.5 w-5 rounded-full bg-[#0066ff]" />
                <span className="h-1.5 w-5 rounded-full bg-[#0066ff]" />
                <span className="h-1.5 w-5 rounded-full bg-[var(--k-line2)]" />
              </div>
            </div>
            
            {/* Task 2 */}
            <div className="rounded-[14px] border border-transparent bg-transparent px-3.5 py-2 flex flex-col gap-2.5 opacity-50">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[12.5px] font-medium text-[var(--k-faint)] line-through leading-snug">API Database Schema</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
              </div>
              <div className="flex gap-1.5">
                <span className="h-1.5 w-5 rounded-full bg-emerald-500/50" />
                <span className="h-1.5 w-5 rounded-full bg-emerald-500/50" />
              </div>
            </div>

            {/* Task 3 */}
            <div className="rounded-[14px] border border-transparent bg-transparent px-3.5 py-2 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[12.5px] font-medium text-[var(--k-ink2)] leading-snug">Client Pitch Deck</span>
                <span className="h-2 w-2 rounded-full bg-[var(--k-line3)] shrink-0 mt-1" />
              </div>
              <div className="flex gap-1.5">
                <span className="h-1.5 w-5 rounded-full bg-[var(--k-line2)]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center Card: Active Pomodoro / Kettle tracking visual */}
      <div className="k-card-fade lg:col-span-6 self-start -translate-y-[10px] rounded-[24px] border border-[var(--k-hairline)] bg-[var(--k-card)] p-10 text-center shadow-[0_30px_70px_-20px_rgba(0,0,0,0.9)] min-h-[300px] flex flex-col justify-between relative overflow-hidden k-interactive-card">
        {/* Glow behind timer */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-[#0066ff]/10 rounded-full blur-[50px] opacity-60 pointer-events-none" />
        
        <div className="flex flex-col items-center relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--k-surface-soft)] px-3.5 py-1.5 text-[11.5px] font-medium text-[var(--k-muted)] border border-[var(--k-hairline)]">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse" />
            POMODORO RUNNING
          </span>
          <h3 className="text-[26px] font-bold mt-5 text-[var(--k-ink)] tracking-tight">Landing Page Redesign</h3>
          <p className="text-[14px] text-[var(--k-muted)] mt-2">Session 2 of 4</p>
        </div>

        <div className="my-8 relative z-10">
          <span className="k-mono text-[64px] font-bold tracking-tight text-[var(--k-ink)] drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
            24:59
          </span>
        </div>

        <div className="flex justify-center gap-3 mb-2 relative z-10">
          <button className="h-11 w-11 rounded-full bg-[var(--k-surface-soft)] border border-[var(--k-hairline2)] flex items-center justify-center text-[var(--k-ink)] hover:bg-[var(--k-tint)] transition-colors shadow-lg">
            <Pause size={16} weight="fill" />
          </button>
          <button className="h-11 w-11 rounded-full bg-[var(--k-surface-soft)] border border-[var(--k-hairline2)] flex items-center justify-center text-[#ff4b4b] hover:bg-[var(--k-tint)] transition-colors shadow-lg">
            <Stop size={16} weight="fill" />
          </button>
        </div>
      </div>

      {/* Right Card: Analytics & Reporting */}
      <div className="k-card-fade lg:col-span-3 lg:mt-12 rounded-[24px] border border-[var(--k-hairline)] bg-[var(--k-card)] p-6 text-left shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] min-h-[330px] flex flex-col justify-between overflow-hidden k-interactive-card">
        <div>
          <div className="flex items-center gap-2.5 mb-5">
            <ChartBar size={18} weight="fill" className="text-[#0066ff]" />
            <h3 className="text-[14.5px] font-semibold text-[var(--k-ink)] tracking-tight">Weekly Analytics</h3>
          </div>
          
          <div className="flex items-end gap-2.5 h-32 mt-6 px-1">
            {/* Bar chart columns */}
            <div className="flex-1 bg-[var(--k-surface-soft)] rounded-t-md h-[40%]" />
            <div className="flex-1 bg-[var(--k-surface-soft)] rounded-t-md h-[60%]" />
            <div className="flex-1 bg-[var(--k-surface-soft)] rounded-t-md h-[30%]" />
            <div className="flex-1 bg-gradient-to-t from-[#0066ff]/20 to-[#0066ff] rounded-t-md h-[90%] relative shadow-[0_0_15px_rgba(0,102,255,0.3)]">
               <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#0066ff]">6h</div>
            </div>
            <div className="flex-1 bg-[var(--k-surface-soft)] rounded-t-md h-[50%]" />
            <div className="flex-1 bg-[var(--k-surface-soft)] rounded-t-md h-[20%]" />
            <div className="flex-1 bg-[var(--k-surface-soft)] rounded-t-md h-[40%]" />
          </div>
          <div className="flex justify-between mt-3 text-[10px] text-[var(--k-faint)] font-medium px-2">
            <span>M</span><span>T</span><span>W</span><span className="text-[var(--k-ink)]">T</span><span>F</span><span>S</span><span>S</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--k-hairline)] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[var(--k-muted)] font-medium">Total Tracked</div>
            <div className="text-[16px] font-bold text-[var(--k-ink)] mt-0.5 tracking-tight">34h 15m</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[var(--k-muted)] font-medium">Billable</div>
            <div className="text-[16px] font-bold text-emerald-400 mt-0.5 tracking-tight">$2,850</div>
          </div>
        </div>
      </div>


    </div>
  );
}

// ----- Feature Redesign Mock Modal Dialog (Linkd reference) -----------------
export function MockCreateTaskModal() {
  return (
    <div className="w-full max-w-[700px] rounded-3xl border border-[var(--k-line2)] bg-[var(--k-card)] p-8 text-left shadow-[0_30px_60px_-15px_rgba(0,0,0,0.85)] relative overflow-hidden k-glass-panel z-10">
      
      {/* Heading */}
      <div className="flex items-center gap-2.5 mb-6 border-b border-[var(--k-hairline)] pb-4">
        <Plus size={18} className="text-[var(--k-accent2)]" />
        <h3 className="text-[17px] font-bold text-[var(--k-ink)] tracking-tight">Create New Task</h3>
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
      <div className="mt-6 flex flex-wrap gap-2.5 pt-5 border-t border-[var(--k-hairline)]">
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
        <button className="ml-auto bg-[var(--k-ink)] text-[var(--k-bg)] rounded-full font-bold px-6 py-2 text-[13.5px] hover:opacity-90 transition active:scale-[0.98] shadow-md">
          Start Active Brew
        </button>
      </div>

    </div>
  );
}
