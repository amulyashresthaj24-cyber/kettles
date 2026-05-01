"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  FolderOpen,
  CheckSquare,
  Timer,
  BarChart2,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";
import { useApp } from "@/lib/store-supabase";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  group: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string[];
  action: () => void;
};

export function CommandPalette({
  open,
  onClose,
  onNewTask,
  onNewProject,
}: {
  open: boolean;
  onClose: () => void;
  onNewTask: () => void;
  onNewProject: () => void;
}) {
  const router = useRouter();
  const tasks = useApp((s) => s.tasks);
  const projects = useApp((s) => s.projects);

  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const staticItems: Item[] = useMemo(() => [
    {
      id: "new-task",
      group: "Actions",
      label: "Create new task...",
      icon: <Plus size={15} />,
      shortcut: ["C"],
      action: () => { onClose(); onNewTask(); },
    },
    {
      id: "new-project",
      group: "Actions",
      label: "Create new project...",
      icon: <Plus size={15} />,
      shortcut: ["N", "P"],
      action: () => { onClose(); onNewProject(); },
    },
    {
      id: "nav-dashboard",
      group: "Navigate",
      label: "Go to Dashboard",
      icon: <LayoutDashboard size={15} />,
      action: () => { onClose(); router.push("/dashboard"); },
    },
    {
      id: "nav-tasks",
      group: "Navigate",
      label: "Go to Tasks",
      icon: <CheckSquare size={15} />,
      action: () => { onClose(); router.push("/"); },
    },
    {
      id: "nav-timer",
      group: "Navigate",
      label: "Go to Timer",
      icon: <Timer size={15} />,
      action: () => { onClose(); router.push("/timer"); },
    },
    {
      id: "nav-report",
      group: "Navigate",
      label: "Go to Report",
      icon: <BarChart2 size={15} />,
      action: () => { onClose(); router.push("/report"); },
    },
  ], [onClose, onNewTask, onNewProject, router]);

  const taskItems: Item[] = useMemo(() =>
    tasks
      .filter((t) => t.status !== "done")
      .map((t) => ({
        id: `task-${t.id}`,
        group: "Tasks",
        label: t.title,
        icon: <CheckSquare size={15} />,
        action: () => { onClose(); router.push("/"); },
      })),
    [tasks, onClose, router]
  );

  const projectItems: Item[] = useMemo(() =>
    projects.map((p) => ({
      id: `proj-${p.id}`,
      group: "Projects",
      label: p.name,
      icon: <FolderOpen size={15} />,
      action: () => { onClose(); router.push("/"); },
    })),
    [projects, onClose, router]
  );

  const filtered = useMemo(() => {
    const allItems = [...staticItems, ...taskItems, ...projectItems];
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter((i) => i.label.toLowerCase().includes(q));
  }, [query, staticItems, taskItems, projectItems]);

  // Group filtered items
  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of filtered) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    }
    return map;
  }, [filtered]);

  // Flat list for keyboard nav
  const flat = useMemo(() => filtered, [filtered]);

  useEffect(() => { setCursor(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, flat.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        flat[cursor]?.action();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flat, cursor, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[18vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-base/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="animate-modal-in relative w-full max-w-[580px] mx-lg bg-surface-raised border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">

        {/* Search input */}
        <div className="flex items-center gap-md px-lg py-md border-b border-border-subtle">
          <Search size={16} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-text-primary placeholder:text-text-muted"
          />
          <kbd className="text-[11px] text-text-faint border border-border rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto py-sm">
          {filtered.length === 0 && (
            <p className="px-lg py-xl text-[13px] text-text-muted text-center">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {Array.from(grouped.entries()).map(([group, items]) => (
            <div key={group}>
              <div className="px-lg py-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-faint">
                  {group}
                </span>
              </div>

              {items.map((item) => {
                const idx = flatIdx++;
                const active = cursor === idx;
                return (
                  <button
                    key={item.id}
                    data-idx={idx}
                    type="button"
                    onMouseEnter={() => setCursor(idx)}
                    onClick={item.action}
                    className={cn(
                      "w-full flex items-center gap-md px-lg py-sm text-[13px] transition-colors text-left",
                      active
                        ? "bg-surface-mid text-text-primary"
                        : "text-text-secondary hover:bg-surface-mid hover:text-text-primary"
                    )}
                  >
                    <span className={cn("shrink-0", active ? "text-text-primary" : "text-text-muted")}>
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <span className="flex items-center gap-1 ml-auto">
                        {item.shortcut.map((k, i) => (
                          <span key={i} className="flex items-center gap-0.5">
                            {i > 0 && (
                              <span className="text-[10px] text-text-faint mx-0.5">then</span>
                            )}
                            <kbd className="text-[11px] text-text-faint border border-border rounded px-1.5 py-0.5 font-mono bg-surface">
                              {k}
                            </kbd>
                          </span>
                        ))}
                      </span>
                    )}
                    {!item.shortcut && active && (
                      <ArrowRight size={13} className="text-text-faint ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
