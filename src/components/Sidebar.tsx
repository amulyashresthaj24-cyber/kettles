"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SquaresFour,
  CheckSquare,
  Timer,
  ChartBar,
  FolderOpen,
  CalendarBlank,
  Plus,
  MagnifyingGlass,
  SignOut,
  User,
} from "@/components/ui/icon";
import { useApp } from "@/lib/store-supabase";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { AddProjectModal } from "./AddProjectModal";
import { BrandMark } from "./BrandMark";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: SquaresFour },
  { href: "/tasks",     label: "Tasks",     Icon: CheckSquare },
  { href: "/calendar",  label: "Calendar",  Icon: CalendarBlank },
  { href: "/timer",     label: "Timer",     Icon: Timer },
  { href: "/report",    label: "Report",    Icon: ChartBar },
  { href: "/projects",  label: "Projects",  Icon: FolderOpen },
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
    <aside className="flex h-screen w-[240px] shrink-0 flex-col bg-surface py-5 px-3">
      <div className="flex flex-col gap-6 flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-1">
          <BrandMark size="sm" className="px-0" />
        </div>

        {/* Search */}
        <div className="relative flex items-center px-1">
          <MagnifyingGlass
            size={13}
            weight="regular"
            className="absolute left-[15px] text-text-faint pointer-events-none"
            aria-hidden
          />
          <div
            onClick={onSearchClick}
            role="button"
            aria-label="Quick search"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onSearchClick?.()}
            className="w-full h-[34px] bg-canvas rounded-[8px] flex items-center justify-between px-2 pl-[30px] cursor-pointer hover:bg-base transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <span className="text-[12px] text-text-faint">Search...</span>
            <div className="flex items-center justify-center border border-border rounded-[4px] px-1.5 py-px bg-surface-raised">
              <span className="text-[10px] text-text-faint font-medium tracking-wide">⌘K</span>
            </div>
          </div>
        </div>

        {/* Primary Nav */}
        <nav className="flex flex-col gap-0.5 px-1" aria-label="Main navigation">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "nav-interactive relative flex items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] text-[13px] font-medium",
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-text-muted hover:bg-surface-raised hover:text-text-secondary"
                )}
              >
                <Icon
                  size={18}
                  weight={active ? "bold" : "regular"}
                  className={cn("shrink-0", active ? "text-accent" : "text-text-faint")}
                  aria-hidden
                />
                {label}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-full bg-accent" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mx-2 h-px bg-surface-raised" />

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

      {/* Profile at bottom */}
      <div className="pt-3 mt-3 px-1">
        <div className="flex items-center justify-between rounded-[8px] px-2 py-2 hover:bg-surface-raised transition-colors group">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="relative shrink-0">
              <div className="w-7 h-7 bg-surface-mid rounded-[6px] flex items-center justify-center">
                {user ? (
                  <span className="text-[13px] font-bold text-text-primary leading-none">
                    {user.name?.[0]?.toUpperCase() || "U"}
                  </span>
                ) : (
                  <User size={13} weight="regular" className="text-text-muted" aria-hidden />
                )}
              </div>
              {user && (
                <span className="absolute -bottom-px -right-px w-2 h-2 bg-success rounded-full border-[1.5px] border-surface" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-semibold text-text-primary leading-tight truncate">
                {user?.name || "Guest"}
              </span>
              {user?.email && (
                <span className="text-[10px] text-text-faint leading-tight truncate">{user.email}</span>
              )}
            </div>
          </div>
          {user ? (
            <button
              onClick={signOut}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded text-text-faint hover:text-error hover:bg-error/10 shrink-0 focus-visible:opacity-100 focus-ring"
              aria-label="Sign out"
            >
              <SignOut size={14} weight="regular" aria-hidden />
            </button>
          ) : (
            <Link href="/auth" className="text-[12px] text-accent hover:text-accent-hover transition-colors shrink-0">
              Sign in
            </Link>
          )}
        </div>
      </div>

      <AddProjectModal open={openNewProject} onClose={() => setOpenNewProject(false)} />
    </aside>
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
    <div className="flex flex-col gap-2 px-1">
      <div className="flex items-center justify-between px-1.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint">
          Projects
        </h2>
        <button
          onClick={onAddProject}
          aria-label="Add project"
          className="text-text-faint hover:text-text-primary transition-colors flex items-center justify-center w-5 h-5 rounded hover:bg-surface-raised focus-ring"
        >
          <Plus size={13} weight="regular" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-0.5 max-h-[180px] overflow-y-auto scrollbar-hide">
        {visibleProjects.map((p) => {
          const active = selectedProjectId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onNavigateProject(p.id)}
              className={cn(
                "nav-interactive flex items-center gap-2 rounded-[7px] px-2 py-[6px] text-left text-[12px] w-full",
                active
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-text-muted hover:bg-surface-raised hover:text-text-secondary font-normal"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", colorDot(p.color))} />
              <span className="truncate">{p.name}</span>
            </button>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => onSelectProject(null)}
          className="nav-interactive flex items-center justify-center rounded-[6px] px-2 py-1.5 text-[12px] font-normal w-full text-text-muted hover:bg-surface-raised hover:text-text-secondary"
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
