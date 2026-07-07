"use client";

import { useEffect, useState } from "react";
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
  Sun,
  Moon,
  Gear,
  Lightning,
  Bell,
} from "@/components/ui/icon";
import { useApp } from "@/lib/store-supabase";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { AddProjectModal } from "./AddProjectModal";
import { BrandMark } from "./BrandMark";
import { getProjectColor, resolveProjectIcon } from "@/lib/constants";
import { AppIcon, type IconName } from "@/components/ui/icon";
import { isDesktop, invoke } from "@/lib/desktop";
import { useNotification } from "@/components/ui/notification";
import type { Project } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: SquaresFour },
  { href: "/tasks",     label: "Tasks",     Icon: CheckSquare },
  { href: "/calendar",  label: "Calendar",  Icon: CalendarBlank },
  { href: "/timer",     label: "Timer",     Icon: Timer },
  { href: "/reminders", label: "Reminders", Icon: Bell },
  { href: "/report",    label: "Report",    Icon: ChartBar },
  { href: "/projects",  label: "Projects",  Icon: FolderOpen },
  { href: "/settings",  label: "Settings",  Icon: Gear },
];

export default function Sidebar({
  onSearchClick,
  theme = "dark",
  onToggleTheme,
}: {
  onSearchClick?: () => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const projects = useApp((s) => s.projects);
  const user = useApp((s) => s.user);
  const selectedProjectId = useApp((s) => s.selectedProjectId);
  const setSelectedProject = useApp((s) => s.setSelectedProject);
  const [openNewProject, setOpenNewProject] = useState(false);
  const [desktopReady, setDesktopReady] = useState(false);
  const { signOut } = useAuth();
  const { notify } = useNotification();

  useEffect(() => {
    setDesktopReady(isDesktop());
  }, []);

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col bg-surface py-5 px-3">
      <div className="flex flex-col gap-6 flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-1">
          <BrandMark size="sm" className="px-0" theme={theme} />
        </div>


        {/* Search */}
        <div className="relative flex items-center px-1">
          <MagnifyingGlass
            size={13}
            weight="regular"
            className="absolute left-[15px] text-text-faint pointer-events-none"
            aria-hidden
          />
          <button
            type="button"
            onClick={onSearchClick}
            aria-label="Quick search"
            className="w-full h-[34px] bg-canvas rounded-[8px] flex items-center justify-between px-2 pl-[30px] cursor-pointer hover:bg-base transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <span className="text-[12px] text-text-faint">Search...</span>
            <div className="flex items-center justify-center border border-border rounded-[4px] px-1.5 py-px bg-surface-raised">
              <span className="text-[10px] text-text-faint font-medium tracking-wide">⌘K</span>
            </div>
          </button>
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
                  "sidebar-link-interactive relative flex items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] text-[13px] font-medium",
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-full bg-accent animate-nav-indicator" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mx-2 h-px bg-surface-raised" />

        {/* Projects */}
        <ProjectsSection
          projects={projects.filter((p) => !p.archived)}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProject}
          onNavigateProject={(projectId) => router.push(`/projects/view?id=${projectId}`)}
          onAddProject={() => setOpenNewProject(true)}
        />
      </div>

      {/* Profile at bottom */}
      <div className="pt-3 mt-3 px-1 space-y-2">
        {desktopReady && (
          <div className="flex items-center gap-1.5 w-full">
            <button
              onClick={async () => {
                try {
                  await invoke("enter_mini_mode");
                } catch (e) {
                  notify({
                    title: "Could not enter pet mode",
                    description: e instanceof Error ? e.message : "The desktop shell did not accept the pet-mode request.",
                    tone: "warning",
                  });
                }
              }}
              className="flex-1 flex h-9 items-center justify-between rounded-[8px] px-2 text-[12px] font-medium text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary focus-ring"
              aria-label="Toggle pet mini-mode"
              title="Shrink to mini-timer + pet overlay (Alt+Shift+T)"
            >
              <span className="flex items-center gap-2.5">
                <Lightning size={15} weight="regular" aria-hidden />
                Pet mode
              </span>
              <span className="rounded-full bg-surface-mid px-2 py-0.5 text-[10px] text-text-faint">
                Mini
              </span>
            </button>
            <button
              onClick={() => router.push("/settings?tab=pet")}
              className="flex h-9 w-9 items-center justify-center rounded-[8px] text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary focus-ring shrink-0"
              aria-label="Pet Mascot Settings"
              title="Mascot & Pet Settings"
            >
              <Gear size={15} weight="regular" />
            </button>
          </div>
        )}
        <button
          onClick={onToggleTheme}
          className="flex h-9 w-full items-center justify-between rounded-[8px] px-2 text-[12px] font-medium text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary focus-ring"
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          <span className="flex items-center gap-2.5">
            {theme === "light" ? (
              <Sun size={15} weight="regular" aria-hidden />
            ) : (
              <Moon size={15} weight="regular" aria-hidden />
            )}
            {theme === "light" ? "Light mode" : "Dark mode"}
          </span>
          <span className="rounded-full bg-surface-mid px-2 py-0.5 text-[10px] text-text-faint">
            Toggle
          </span>
        </button>
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
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onNavigateProject: (id: string) => void;
  onAddProject: () => void;
}

function ProjectsSection({
  projects,
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
                "sidebar-link-interactive flex items-center gap-2 rounded-[7px] px-2 py-[6px] text-left text-[12px] w-full",
                active
                  ? "font-medium"
                  : "text-text-muted hover:bg-surface-raised hover:text-text-secondary font-normal"
              )}
              style={active ? { color: getProjectColor(p.color).hex } : {}}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                style={{ background: getProjectColor(p.color).hex + "20" }}
              >
                <AppIcon
                  name={resolveProjectIcon(p.icon) as IconName}
                  size={12}
                  weight={active ? "bold" : "regular"}
                  style={{ color: getProjectColor(p.color).hex } as React.CSSProperties}
                />
              </span>
              <span className="truncate">{p.name}</span>
            </button>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => onSelectProject(null)}
          className="sidebar-link-interactive flex items-center justify-center rounded-[6px] px-2 py-1.5 text-[12px] font-normal w-full text-text-muted hover:bg-surface-raised hover:text-text-secondary"
        >
          View all {projects.length} projects
        </button>
      )}
    </div>
  );
}
