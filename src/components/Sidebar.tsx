"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  { href: "/tasks", label: "Tasks", Icon: CheckSquare },
  { href: "/calendar", label: "Calendar", Icon: Calendar },
  { href: "/timer", label: "Timer", Icon: Timer },
  { href: "/report", label: "Report", Icon: BarChart2 },
  { href: "/projects", label: "Projects", Icon: FolderOpen },
];

export default function Sidebar({ onSearchClick }: { onSearchClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const projects = useApp((s) => s.projects);
  const clients = useApp((s) => s.clients);
  const user = useApp((s) => s.user);
  const selectedProjectId = useApp((s) => s.selectedProjectId);
  const setSelectedProject = useApp((s) => s.setSelectedProject);
  const [openNewProject, setOpenNewProject] = useState(false);
  const { signOut } = useAuth();

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col bg-surface py-6 px-4">
      <div className="flex flex-col gap-7 flex-1 overflow-y-auto">
        <BrandMark size="sm" className="px-0" />

        {/* Search */}
        <div className="relative flex items-center">
          <Search className="absolute left-[8px] text-text-muted" size={14} />
          <div onClick={onSearchClick} className="w-full h-[32px] bg-surface-mid border border-[#2e2e2e] rounded-[8px] flex items-center justify-between px-[7px] pl-[28px] cursor-pointer hover:border-[#444] transition-colors">
            <span className="text-[13px] text-text-muted">Quick Search</span>
            <div className="flex items-center justify-center border border-[#444] rounded-[4px] px-[5px] py-[1px] bg-[#262626]">
              <span className="text-[10px] text-text-muted font-medium">⌘K</span>
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
        <ProjectsSection
          projects={projects.filter((p) => !p.archived)}
          clients={clients}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProject}
          onNavigateProject={(projectId) => router.push(`/projects/${projectId}`)}
          onAddProject={() => setOpenNewProject(true)}
        />
      </div>

      {/* Profile at bottom - Sticky */}
      <div className="border-t border-border-subtle pt-4 mt-4">
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative">
              <div className="w-[30px] h-[30px] bg-[#262626] rounded-[8px] flex items-center justify-center shrink-0">
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
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-semibold text-text-primary leading-tight truncate">
                {user?.name || "Guest"}
              </span>
              {user?.email && (
                <span className="text-[10px] text-text-muted leading-tight truncate">{user.email}</span>
              )}
            </div>
          </div>
          {user ? (
            <button
              onClick={signOut}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded shrink-0"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          ) : (
            <Link
              href="/auth"
              className="text-[12px] text-[#0066ff] hover:text-[#3385ff] transition-colors shrink-0"
            >
              Sign in
            </Link>
          )}
        </div>
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

interface ProjectsSectionProps {
  projects: any[];
  clients: any[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onNavigateProject: (id: string) => void;
  onAddProject: () => void;
}

function ProjectsSection({
  projects,
  clients,
  selectedProjectId,
  onSelectProject,
  onNavigateProject,
  onAddProject,
}: ProjectsSectionProps) {
  const MAX_VISIBLE = 4;
  const hasMore = projects.length > MAX_VISIBLE;
  const visibleProjects = projects.slice(0, MAX_VISIBLE);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-[12px] font-semibold text-text-primary">
          My Projects
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddProject}
            aria-label="Add project"
            className="text-text-muted hover:text-text-primary transition-colors flex items-center justify-center w-5 h-5 rounded hover:bg-surface-raised"
          >
            <Plus size={14} />
          </button>
          {hasMore && (
            <button
              title={`${projects.length - MAX_VISIBLE} more project${projects.length - MAX_VISIBLE !== 1 ? 's' : ''}`}
              className="text-text-muted hover:text-text-primary transition-colors flex items-center justify-center w-5 h-5 rounded hover:bg-surface-raised"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto">
        {visibleProjects.map((p) => {
          const active = selectedProjectId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onNavigateProject(p.id)}
              className={cn(
                "nav-interactive flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[13px] w-full transition-colors",
                active
                  ? "bg-surface-mid text-text-primary"
                  : "text-text-muted hover:bg-surface-raised hover:text-text-primary"
              )}
            >
              <span className="text-[12px] font-semibold">
                #
              </span>
              <span className="truncate">{p.name}</span>
            </button>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => onSelectProject(null)}
          className={cn(
            "nav-interactive flex items-center justify-center rounded-[6px] px-2 py-1.5 text-[12px] font-normal w-full transition-colors",
            !selectedProjectId
              ? "bg-surface-mid text-text-primary"
              : "text-text-muted hover:bg-surface-raised hover:text-text-primary"
          )}
          title="View all projects"
        >
          View all {projects.length} projects
        </button>
      )}
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

