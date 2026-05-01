"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  Timer,
  BarChart2,
  LayoutDashboard,
  Plus,
  FolderOpen,
  Search,
  Calendar,
  LogOut,
  User,
} from "lucide-react";
import { useApp } from "@/lib/store-supabase";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { AddProjectModal } from "./AddProjectModal";
import { BrandMark } from "./BrandMark";
const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/", label: "Tasks", Icon: CheckSquare },
  { href: "/calendar", label: "Calendar", Icon: Calendar },
  { href: "/timer", label: "Timer", Icon: Timer },
  { href: "/report", label: "Report", Icon: BarChart2 },
  { href: "/projects", label: "Projects", Icon: FolderOpen },
];

export default function Sidebar({ onSearchClick }: { onSearchClick?: () => void }) {
  const pathname = usePathname();
  const projects = useApp((s) => s.projects);
  const clients = useApp((s) => s.clients);
  const user = useApp((s) => s.user);
  const selectedProjectId = useApp((s) => s.selectedProjectId);
  const setSelectedProject = useApp((s) => s.setSelectedProject);
  const [openNewProject, setOpenNewProject] = useState(false);
  const { signOut } = useAuth();

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col overflow-y-auto bg-surface py-6 px-4">
      <div className="flex flex-col gap-7">
        <BrandMark size="sm" className="px-0" />

        {/* Profile */}
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-[30px] h-[30px] bg-[#262626] rounded-[8px] flex items-center justify-center">
                {user ? (
                  <span className="text-[16px] font-bold text-text-primary leading-none">
                    {user.name?.[0]?.toUpperCase() || "U"}
                  </span>
                ) : (
                  <User size={16} className="text-text-muted" />
                )}
              </div>
              {user && (
                <span className="absolute bottom-[-2px] right-[-2px] w-[8px] h-[8px] bg-[#22c55e] rounded-full border-[1.5px] border-base" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-semibold text-text-primary leading-tight">
                {user?.name || "Guest"}
              </span>
              {user?.email && (
                <span className="text-[11px] text-text-muted leading-tight">{user.email}</span>
              )}
            </div>
          </div>
          {user ? (
            <button
              onClick={signOut}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          ) : (
            <Link
              href="/auth"
              className="text-[12px] text-[#0066ff] hover:text-[#3385ff] transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative flex items-center">
          <Search className="absolute left-[8px] text-text-muted" size={14} />
          <div onClick={onSearchClick} className="w-full h-[32px] bg-surface-mid border border-[#2e2e2e] rounded-[8px] flex items-center justify-between px-[7px] pl-[28px] cursor-pointer hover:border-[#444] transition-colors">
            <span className="text-[13px] text-text-muted">Quick Search</span>
            <div className="flex items-center justify-center border border-[#444] rounded-[4px] px-[5px] py-[1px] bg-[#262626]">
              <span className="text-[10px] text-text-muted font-medium">⌘F</span>
            </div>
          </div>
        </div>

        {/* Primary Nav */}
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "nav-interactive flex items-center gap-3 rounded-[8px] px-2 py-1.5 text-[13px] font-normal",
                  active
                    ? "bg-surface-mid text-text-primary"
                    : "text-text-muted hover:bg-surface-raised hover:text-text-primary"
                )}
              >
                <Icon size={16} className={cn("shrink-0", active ? "text-text-primary" : "text-text-muted")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="h-px w-full bg-border-subtle" />

        {/* Projects */}
        <Section
          title="Projects"
          action={{ label: "+", onClick: () => setOpenNewProject(true) }}
        >
          <button
            onClick={() => setSelectedProject(null)}
            className={cn(
              "nav-interactive flex items-center gap-3 rounded-[8px] px-2 py-1.5 text-left text-[13px] font-normal w-full",
              !selectedProjectId
                ? "bg-surface-mid text-text-primary"
                : "text-text-muted hover:bg-surface-raised hover:text-text-primary"
            )}
          >
            <FolderOpen size={16} className={cn("shrink-0", !selectedProjectId ? "text-text-primary" : "text-text-muted")} />
            All projects
          </button>
          {projects.map((p) => {
            const client = p.clientId
              ? clients.find((c) => c.id === p.clientId)
              : undefined;
            const active = selectedProjectId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProject(p.id)}
                className={cn(
                  "nav-interactive flex flex-col items-start rounded-[8px] px-2 py-1.5 text-left text-[13px] w-full",
                  active
                    ? "bg-surface-mid text-text-primary"
                    : "text-text-muted hover:bg-surface-raised hover:text-text-primary"
                )}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      colorDot(p.color)
                    )}
                  />
                  <span className={active ? "font-normal" : "font-normal"}>{p.name}</span>
                </span>
                {client && (
                  <span className="pl-[20px] text-[11px] text-text-faint mt-0.5">
                    {client.name}
                  </span>
                )}
              </button>
            );
          })}
        </Section>
      </div>

      <AddProjectModal
        open={openNewProject}
        onClose={() => setOpenNewProject(false)}
      />
    </aside>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-faint">
          {title}
        </h2>
        {action && (
          <button
            onClick={action.onClick}
            aria-label={`Add ${title.toLowerCase()}`}
            className="text-text-muted hover:text-text-primary transition-colors flex items-center justify-center w-5 h-5 rounded hover:bg-surface-raised"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function colorDot(c: string) {
  switch (c) {
    case "teal":   return "bg-teal-400";
    case "amber":  return "bg-accent";
    case "rose":   return "bg-rose-400";
    case "indigo": return "bg-indigo-400";
    default:       return "bg-text-muted";
  }
}

