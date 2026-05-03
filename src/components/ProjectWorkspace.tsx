"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronLeft,
  Eye,
  Lock,
  LockOpen,
  MoreVertical,
  Plus,
} from "lucide-react";
import type { Project, Task } from "@/lib/types";
import { useApp } from "@/lib/store-supabase";
import { Button } from "@/components/ui/button";
import { AddTaskModal } from "@/components/AddTaskModal";
import { EditProjectModal } from "@/components/EditProjectModal";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TaskList } from "@/components/TaskList";
import { ProjectDetailsCard } from "@/components/ProjectDetailsCard";

type TabId = "overview" | "tasks" | "board";

interface ProjectWorkspaceProps {
  project: Project;
  tasks: Task[];
  onBack: () => void;
}

export function ProjectWorkspace({
  project,
  tasks,
  onBack,
}: ProjectWorkspaceProps) {
  const { updateProject, clients } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showProjectInfo, setShowProjectInfo] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    members: true,
  });
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [isPrivate, setIsPrivate] = useState(!project.tags?.includes("public"));
  const [newTag, setNewTag] = useState("");

  const projectTasks = useMemo(
    () => tasks.filter((t) => !t.archived),
    [tasks]
  );

  const getClientName = () => {
    const client = clients.find((c) => c.id === project.clientId);
    return client?.name || "";
  };

  const handlePrivacyChange = (isPrivate: boolean) => {
    setIsPrivate(isPrivate);
    const newTags = isPrivate 
      ? (project.tags || []).filter(t => t !== "public")
      : [...(project.tags || []), "public"];
    updateProject(project.id, { tags: newTags });
  };

  const handleAddTag = async () => {
    if (newTag.trim()) {
      const currentTags = project.tags || [];
      if (!currentTags.includes(newTag)) {
        await updateProject(project.id, { tags: [...currentTags, newTag] });
        setNewTag("");
      }
    }
  };

  const handleDateChange = async (startDate?: number, endDate?: number) => {
    await updateProject(project.id, { startDate, endDate });
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "tasks", label: "Tasks" },
    { id: "board", label: "Board" },
  ];

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="flex flex-col h-screen bg-base overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-lg py-sm">
        <div className="flex items-center gap-sm">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-surface-raised transition-colors text-text-secondary hover:text-text-primary"
          >
            <ChevronLeft size={18} />
          </button>

          <div 
            className="flex items-center gap-md"
            onMouseEnter={() => setShowProjectInfo(true)}
            onMouseLeave={() => setShowProjectInfo(false)}
          >
            <div className="flex items-center gap-sm">
              <Lock size={16} className="text-text-secondary" />
              <h1 className="text-sm font-semibold text-text-primary">
                {project.name}
              </h1>
            </div>

            {/* Client and Billable Tags - Appear on Hover */}
            <div className="flex items-center gap-sm">
              {getClientName() && (
                <div 
                  className="px-sm py-xs rounded-md bg-surface-raised text-text-secondary text-xs whitespace-nowrap transition-all duration-200 ease-out origin-left transform"
                  style={{
                    opacity: showProjectInfo ? 1 : 0,
                    transform: showProjectInfo ? "scale(1)" : "scale(0.95)",
                    pointerEvents: showProjectInfo ? "auto" : "none",
                  }}
                >
                  {getClientName()}
                </div>
              )}
              {project.billable && (
                <div 
                  className="px-sm py-xs rounded-md bg-surface-raised text-accent text-xs font-medium flex items-center gap-xs whitespace-nowrap transition-all duration-200 ease-out origin-left transform"
                  style={{
                    opacity: showProjectInfo ? 1 : 0,
                    transform: showProjectInfo ? "scale(1)" : "scale(0.95)",
                    pointerEvents: showProjectInfo ? "auto" : "none",
                  }}
                >
                  <span>$</span>
                  <span>Billable</span>
                </div>
              )}
            </div>
          </div>

          <button className="flex items-center gap-xs text-text-secondary hover:text-text-primary transition-colors text-sm ml-sm">
            <span>Rochak</span>
            <ChevronDown size={14} />
          </button>

          <button className="flex items-center gap-xs text-text-secondary hover:text-text-primary transition-colors">
            <MoreVertical size={16} />
          </button>
        </div>

        <div className="flex items-center gap-sm">
          <button className="text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-xs">
            Saved views
            <ChevronDown size={14} />
          </button>
          <Button className="flex items-center gap-xs" variant="secondary" size="sm">
            <Plus size={14} />
            Share
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2xl px-lg py-0 border-b border-border-subtle bg-base overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-0 py-md text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === tab.id
                ? "text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Main Content Area - Full Width */}
      <div className="flex-1 overflow-hidden bg-base pt-lg">
        <div className="w-full h-full flex flex-col overflow-y-auto">
          <TabContent
            activeTab={activeTab}
            project={project}
            tasks={projectTasks}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onAddTask={() => setAddTaskOpen(true)}
            onEditProject={() => setEditProjectOpen(true)}
            isPrivate={isPrivate}
            onPrivacyChange={handlePrivacyChange}
            onAddTag={handleAddTag}
            onDateChange={handleDateChange}
            newTag={newTag}
            onNewTagChange={setNewTag}
            clientName={getClientName()}
            clients={clients}
            onUpdateProject={updateProject}
          />
        </div>
      </div>

      {/* Modals */}
      <AddTaskModal
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        defaultProjectId={project.id}
      />

      <EditProjectModal
        open={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
        project={project}
      />
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hasIcons?: boolean;
}

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
  hasIcons = false,
}: CollapsibleSectionProps) {
  return (
    <div className="border-b border-border-subtle pb-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-md hover:bg-surface-raised rounded-md px-sm transition-colors group"
      >
        <div className="flex items-center gap-sm">
          <span className="text-sm font-medium text-text-primary group-hover:text-accent">
            {title}
          </span>
          {hasIcons && (
            <div className="flex items-center gap-xs ml-auto">
              <button className="text-text-secondary hover:text-accent transition-colors">
                <Eye size={14} />
              </button>
              <button className="text-text-secondary hover:text-accent transition-colors">
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-text-secondary transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && <div className="pt-md text-sm">{children}</div>}
    </div>
  );
}

interface TabContentProps {
  activeTab: TabId;
  project: Project;
  tasks: Task[];
  expandedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  onAddTask: () => void;
  onEditProject: () => void;
  isPrivate: boolean;
  onPrivacyChange: (isPrivate: boolean) => void;
  onAddTag: () => void;
  onDateChange: (startDate?: number, endDate?: number) => Promise<void>;
  newTag: string;
  onNewTagChange: (tag: string) => void;
  clientName: string;
  clients: any[];
  onUpdateProject: (id: string, patch: any) => Promise<void>;
}

function TabContent({
  activeTab,
  project,
  tasks,
  expandedSections,
  onToggleSection,
  onAddTask,
  onEditProject,
  isPrivate,
  onPrivacyChange,
  onAddTag,
  onDateChange,
  newTag,
  onNewTagChange,
  clientName,
  clients,
  onUpdateProject,
}: TabContentProps) {
  if (activeTab === "overview") {
    return (
      <div className="overflow-y-auto h-full">
        <div className="flex gap-lg h-full">
          {/* Left Sidebar */}
          <div className="w-72 border-r border-border-subtle bg-base overflow-y-auto px-lg py-lg space-y-lg flex-shrink-0">
            {/* Project Header */}
            <div className="space-y-md">
              <div className="flex items-center gap-md">
                <div
                  className={`w-6 h-6 rounded-md ${getColorClass(
                    project.color
                  )}`}
                />
                <h2 className="text-sm font-semibold text-text-primary">
                  {project.name}
                </h2>
              </div>
            </div>

            {/* Project Controls */}
            <div className="space-y-sm">
              <button className="w-full flex items-center justify-between px-sm py-xs rounded-md bg-surface-raised hover:bg-surface-mid transition-colors text-text-secondary hover:text-text-primary border border-border-subtle text-sm">
                <span className="font-medium">
                  {project.startDate || project.endDate 
                    ? `${project.startDate ? new Date(project.startDate).toLocaleDateString() : ''} – ${project.endDate ? new Date(project.endDate).toLocaleDateString() : ''}`.trim()
                    : "Set start date – End date"}
                </span>
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Privacy Toggle */}
            <div className="flex gap-sm">
              <button
                onClick={() => onPrivacyChange(true)}
                className={`flex-1 flex items-center justify-center gap-xs px-sm py-xs rounded-md transition-colors text-xs font-medium border ${
                  isPrivate
                    ? "bg-accent text-white border-accent"
                    : "bg-transparent text-text-secondary hover:text-text-primary border-border-subtle"
                }`}
              >
                <Lock size={12} />
                Private
              </button>
              <button
                onClick={() => onPrivacyChange(false)}
                className={`flex-1 flex items-center justify-center gap-xs px-sm py-xs rounded-md transition-colors text-xs font-medium border ${
                  !isPrivate
                    ? "bg-surface-raised text-text-primary border-border-subtle"
                    : "bg-transparent text-text-secondary hover:text-text-primary border-border-subtle"
                }`}
              >
                <LockOpen size={12} />
                Shared
              </button>
            </div>


            {/* Divider */}
            <div className="h-px bg-border-subtle" />

            {/* Project Description */}
            <div className="space-y-sm">
              <p className="text-sm text-text-secondary">Project description</p>
              <textarea
                placeholder="Add description..."
                className="w-full px-sm py-xs rounded-md bg-surface-raised border border-border-subtle text-text-primary text-base placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 resize-none"
                rows={3}
                defaultValue={project.description || ""}
                onBlur={(e) => onUpdateProject(project.id, { description: e.currentTarget.value })}
              />
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="flex-1 overflow-y-auto px-lg py-lg space-y-lg pr-lg">
            {/* Project Members Section */}
            <CollapsibleSection
              title="Project members"
              isOpen={expandedSections.members}
              onToggle={() => onToggleSection("members")}
              hasIcons={true}
            >
              <div className="space-y-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-sm">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        Amulyamars
                      </p>
                      <p className="text-xs text-text-muted">
                        Project manager
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "tasks") {
    return (
      <div className="p-lg space-y-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            Tasks ({tasks.length})
          </h2>
          <Button onClick={onAddTask} className="flex items-center gap-md">
            <Plus size={16} />
            Add Task
          </Button>
        </div>
        <TaskList
          tasks={tasks}
          onAddTask={() => onAddTask()}
          onEditTask={() => {}}
        />
      </div>
    );
  }

  if (activeTab === "board") {
    return (
      <div className="p-lg space-y-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            Board ({tasks.length})
          </h2>
          <Button onClick={onAddTask} className="flex items-center gap-md">
            <Plus size={16} />
            Add Task
          </Button>
        </div>
        <KanbanBoard tasks={tasks} onAddTask={onAddTask} />
      </div>
    );
  }

  return null;
}

function getColorClass(color: string): string {
  const colors: Record<string, string> = {
    teal: "bg-teal-400",
    amber: "bg-accent",
    rose: "bg-rose-400",
    indigo: "bg-indigo-400",
  };
  return colors[color] || "bg-slate-400";
}
