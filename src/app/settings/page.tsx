"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Lock,
  Timer,
  Palette,
  Briefcase,
  FolderOpen,
  Download,
  Gear,
  Trash,
  Plus,
  PencilSimple,
  At,
  Archive,
  ArrowClockwise,
  Eye,
  EyeSlash,
  Warning,
} from "@/components/ui/icon";
import { useApp } from "@/lib/store-supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AddProjectModal } from "@/components/AddProjectModal";
import { EditProjectModal } from "@/components/EditProjectModal";
import { PageLayout, PageHeader, PageContent } from "@/components/layout";
import { useNotification } from "@/components/ui/notification";
import { AuthGuard } from "@/components/AuthGuard";
import { getSupabaseClient } from "@/lib/supabase";
import { isDesktop } from "@/lib/desktop";
import type { Client, Project, ProjectColor } from "@/lib/types";
import { PROJECT_COLOR_CLASSES } from "@/lib/constants";

type SettingsTab = "profile" | "preferences" | "projects" | "clients" | "data" | "pet";

const colorDot = (color: string) => {
  return PROJECT_COLOR_CLASSES[color as ProjectColor] || "bg-slate-400";
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function SettingsContent() {
  const router = useRouter();
  const { notify } = useNotification();
  
  // Tab control
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as SettingsTab;
      const allowed = ["profile", "preferences", "projects", "clients", "data"];
      if (isDesktop()) allowed.push("pet");
      if (tabParam && allowed.includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Store variables
  const user = useApp((s) => s.user);
  const setUser = useApp((s) => s.setUser);
  const preferences = useApp((s) => s.preferences);
  const setPreferences = useApp((s) => s.setPreferences);
  const clients = useApp((s) => s.clients);
  const addClient = useApp((s) => s.addClient);
  const updateClient = useApp((s) => s.updateClient);
  const deleteClient = useApp((s) => s.deleteClient);
  const projects = useApp((s) => s.projects);
  const deleteProject = useApp((s) => s.deleteProject);
  const archiveProject = useApp((s) => s.archiveProject);
  const restoreProject = useApp((s) => s.restoreProject);
  const sessions = useApp((s) => s.sessions);
  const tasks = useApp((s) => s.tasks);

  // Profile forms
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Theme tracking
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("dark");
  const [desktopAvailable, setDesktopAvailable] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("flowmate-theme");
      if (stored === "light" || stored === "dark") {
        setCurrentTheme(stored);
      }
      setDesktopAvailable(isDesktop());
    }
  }, []);

  // Update profile name form initial state on load
  useEffect(() => {
    if (user?.name) {
      setDisplayName(user.name);
    }
  }, [user]);

  // Projects local controllers
  const [openAddProject, setOpenAddProject] = useState(false);
  const [openEditProject, setOpenEditProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [deleteTargetProject, setDeleteTargetProject] = useState<Project | null>(null);
  const [projectDeleting, setProjectDeleting] = useState(false);

  // Clients local controllers
  const [openClientForm, setOpenClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [clientName, setClientName] = useState("");
  const [clientHourlyRate, setClientHourlyRate] = useState<number>(0);
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [clientFormLoading, setClientFormLoading] = useState(false);
  const [deleteTargetClient, setDeleteTargetClient] = useState<Client | null>(null);
  const [clientDeleting, setClientDeleting] = useState(false);

  // ─── Theme Handler ─────────────────────────────────────────────────────────
  const handleThemeChange = (theme: "light" | "dark") => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("flowmate-theme", theme);
      setCurrentTheme(theme);
      // Dispatch sync event
      window.dispatchEvent(new Event("flowmate-theme-changed"));
      notify({
        title: "Theme updated",
        description: `Switched workspace theme to ${theme} mode.`,
        tone: "success",
      });
    }
  };

  // ─── Profile Update ────────────────────────────────────────────────────────
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      notify({
        title: "Validation error",
        description: "Display name cannot be empty.",
        tone: "warning",
      });
      return;
    }
    setProfileLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        data: { name: displayName.trim() }
      });
      if (error) throw error;

      // Sync Zustand store
      setUser({
        name: displayName.trim(),
        email: user?.email,
      });

      notify({
        title: "Profile updated",
        description: "Display name was successfully updated.",
        tone: "success",
      });
    } catch (err) {
      notify({
        title: "Update failed",
        description: getErrorMessage(err, "Could not update profile."),
        tone: "warning",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // ─── Password Update ───────────────────────────────────────────────────────
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      notify({
        title: "Validation error",
        description: "Please enter a new password.",
        tone: "warning",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      notify({
        title: "Validation error",
        description: "New passwords do not match.",
        tone: "warning",
      });
      return;
    }
    setPasswordLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify({
        title: "Password updated",
        description: "Your security credentials have been updated.",
        tone: "success",
      });
    } catch (err) {
      notify({
        title: "Update failed",
        description: getErrorMessage(err, "Could not reset password."),
        tone: "warning",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // ─── Client CRUD Handlers ──────────────────────────────────────────────────
  const handleOpenAddClient = () => {
    setEditingClient(undefined);
    setClientName("");
    setClientHourlyRate(0);
    setClientCompany("");
    setClientEmail("");
    setClientPhone("");
    setClientNotes("");
    setOpenClientForm(true);
  };

  const handleOpenEditClient = (c: Client) => {
    setEditingClient(c);
    setClientName(c.name);
    setClientHourlyRate(c.hourlyRate || 0);
    setClientCompany(c.company || "");
    setClientEmail(c.email || "");
    setClientPhone(c.phone || "");
    setClientNotes(c.notes || "");
    setOpenClientForm(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    setClientFormLoading(true);
    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          name: clientName.trim(),
          hourlyRate: Number(clientHourlyRate),
          company: clientCompany.trim() || undefined,
          email: clientEmail.trim() || undefined,
          phone: clientPhone.trim() || undefined,
          notes: clientNotes.trim() || undefined,
        });
        notify({
          title: "Client updated",
          description: `Successfully updated ${clientName}`,
          tone: "success",
        });
      } else {
        await addClient({
          name: clientName.trim(),
          hourlyRate: Number(clientHourlyRate),
          company: clientCompany.trim() || undefined,
          email: clientEmail.trim() || undefined,
          phone: clientPhone.trim() || undefined,
          notes: clientNotes.trim() || undefined,
        });
        notify({
          title: "Client created",
          description: `Successfully added ${clientName}`,
          tone: "success",
        });
      }
      setOpenClientForm(false);
    } catch (err) {
      notify({
        title: "Error saving client",
        description: getErrorMessage(err, "Failed to save client details."),
        tone: "warning",
      });
    } finally {
      setClientFormLoading(false);
    }
  };

  const handleDeleteClientConfirm = async () => {
    if (!deleteTargetClient) return;
    setClientDeleting(true);
    try {
      await deleteClient(deleteTargetClient.id);
      notify({
        title: "Client deleted",
        description: `Successfully removed client "${deleteTargetClient.name}".`,
        tone: "success",
      });
      setDeleteTargetClient(null);
    } catch (err) {
      notify({
        title: "Failed to delete client",
        description: getErrorMessage(err, "Make sure no active projects use this client first."),
        tone: "warning",
      });
    } finally {
      setClientDeleting(false);
    }
  };

  // ─── Project Handlers ──────────────────────────────────────────────────────
  const handleEditProject = (p: Project) => {
    setEditingProject(p);
    setOpenEditProject(true);
  };

  const handleDeleteProjectConfirm = async () => {
    if (!deleteTargetProject) return;
    setProjectDeleting(true);
    try {
      await deleteProject(deleteTargetProject.id);
      notify({
        title: "Project deleted",
        description: `Successfully removed project "${deleteTargetProject.name}".`,
        tone: "success",
      });
      setDeleteTargetProject(null);
    } catch (err) {
      notify({
        title: "Failed to delete project",
        description: getErrorMessage(err, "Could not complete project deletion."),
        tone: "warning",
      });
    } finally {
      setProjectDeleting(false);
    }
  };

  // ─── Data Actions ──────────────────────────────────────────────────────────
  const handleExportData = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        user: { name: user?.name, email: user?.email },
        clients,
        projects,
        tasks,
        sessions,
        preferences,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `flowmate-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify({
        title: "Data exported",
        description: "Workspace configuration backup downloaded successfully.",
        tone: "success",
      });
    } catch (err) {
      notify({
        title: "Export failed",
        description: getErrorMessage(err, "Could not generate download package."),
        tone: "warning",
      });
    }
  };

  const handleResetCache = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("flowmate-supabase-session-store");
      notify({
        title: "Cache cleared",
        description: "Local data store was reset. Reloading session...",
        tone: "info",
      });
      window.setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  // ─── Tabs List ─────────────────────────────────────────────────────────────
  const TABS = [
    { id: "profile" as SettingsTab, label: "Profile", Icon: User },
    { id: "preferences" as SettingsTab, label: "Timer & Theme", Icon: Timer },
    { id: "projects" as SettingsTab, label: "Projects", Icon: FolderOpen },
    { id: "clients" as SettingsTab, label: "Clients", Icon: Briefcase },
    { id: "data" as SettingsTab, label: "Data Management", Icon: Download },
    // Mascot & Pet settings only apply to the Tauri desktop app.
    ...(desktopAvailable
      ? [{ id: "pet" as SettingsTab, label: "Mascot & Pet", Icon: Palette }]
      : []),
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Settings"
        subtitle="Manage display credentials, default timer intervals, client pricing rates, and backups."
      />

      <PageContent>
        <div className="grid grid-cols-1 gap-xl lg:grid-cols-[240px_1fr] items-start mt-md">
          
          {/* Side Nav (Desktop tabs) */}
          <aside 
            className="flex flex-row overflow-x-auto lg:flex-col gap-sm pb-md lg:pb-0 border-b border-border-subtle lg:border-b-0 lg:border-r lg:pr-md scrollbar-hide shrink-0"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {TABS.map((tab) => {
              const Icon = tab.Icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-[14px] font-medium rounded-lg text-left whitespace-nowrap transition-all duration-120",
                    isActive
                      ? "bg-surface-mid text-text-primary"
                      : "text-text-muted hover:text-text-primary hover:bg-surface-raised/40"
                  )}
                >
                  <Icon size={16} className={isActive ? "text-accent" : "text-text-faint"} />
                  {tab.label}
                </button>
              );
            })}
          </aside>

          {/* Settings Section Panel */}
          <div className="flex-1 min-w-0">
            {/* ─── Profile Tab ─── */}
            {activeTab === "profile" && (
              <div className="flex flex-col gap-lg animate-fade-up">
                {/* Account Details */}
                <section className="rounded-xl p-xl border" style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}>
                  <h2 className="text-[17px] font-semibold tracking-[-0.012em] text-text-primary mb-1">Account details</h2>
                  <p className="text-[13px] text-text-muted mb-lg">Update your user identity and view current credentials.</p>
                  
                  <form onSubmit={handleUpdateProfile} className="flex flex-col gap-md max-w-md">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="displayName" className="text-[12px] font-semibold text-text-secondary">Display Name</label>
                      <Input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="John Doe"
                        className="bg-surface-mid border-border-subtle"
                        disabled={profileLoading}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="email" className="text-[12px] font-semibold text-text-secondary">Email address</label>
                      <div className="relative">
                        <At size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
                        <Input
                          id="email"
                          type="email"
                          value={user?.email || ""}
                          className="bg-surface border-border-subtle/50 pl-9 text-text-faint cursor-not-allowed opacity-75"
                          readOnly
                          disabled
                        />
                      </div>
                      <p className="text-[11px] text-text-faint">Your email is managed via Supabase credentials and is read-only.</p>
                    </div>

                    <Button type="submit" variant="primary" size="sm" className="w-fit mt-sm" disabled={profileLoading}>
                      {profileLoading ? "Saving details..." : "Save details"}
                    </Button>
                  </form>
                </section>

                {/* Password Update */}
                <section className="rounded-xl p-xl border" style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}>
                  <h2 className="text-[17px] font-semibold tracking-[-0.012em] text-text-primary mb-1">Update password</h2>
                  <p className="text-[13px] text-text-muted mb-lg">Re-verify and establish a new authentication passcode.</p>
                  
                  <form onSubmit={handleUpdatePassword} className="flex flex-col gap-md max-w-md">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="newPassword" className="text-[12px] font-semibold text-text-secondary">New Password</label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-surface-mid border-border-subtle pr-9"
                          disabled={passwordLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                        >
                          {showNewPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="confirmPassword" className="text-[12px] font-semibold text-text-secondary">Confirm New Password</label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-surface-mid border-border-subtle pr-9"
                          disabled={passwordLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                        >
                          {showConfirmPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" variant="primary" size="sm" className="w-fit mt-sm" disabled={passwordLoading}>
                      {passwordLoading ? "Updating..." : "Update password"}
                    </Button>
                  </form>
                </section>
              </div>
            )}

            {/* ─── Preferences Tab ─── */}
            {activeTab === "preferences" && (
              <div className="flex flex-col gap-lg animate-fade-up">
                
                {/* Theme Selector */}
                <section className="rounded-xl p-xl border" style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}>
                  <h2 className="text-[17px] font-semibold tracking-[-0.012em] text-text-primary mb-1">Color Theme</h2>
                  <p className="text-[13px] text-text-muted mb-lg">Select the canvas color scheme for the Flowmate application.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md max-w-xl">
                    <button
                      type="button"
                      onClick={() => handleThemeChange("light")}
                      className={cn(
                        "relative flex flex-col gap-3 rounded-xl p-md text-left transition-all border-2",
                        currentTheme === "light"
                          ? "border-accent bg-surface-mid ring-2 ring-accent/15"
                          : "border-border-subtle bg-surface hover:border-border"
                      )}
                    >
                      <div className="h-20 w-full rounded bg-[#f4f6f8] border border-[#cdd5e0] p-3 flex flex-col gap-1.5 overflow-hidden">
                        <div className="h-3 w-1/3 rounded bg-[#0f172a]" />
                        <div className="h-2 w-full rounded bg-[#eaedf2]" />
                        <div className="h-2 w-4/5 rounded bg-[#eaedf2]" />
                      </div>
                      <span className="text-[13px] font-semibold text-text-primary">Light Mode</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleThemeChange("dark")}
                      className={cn(
                        "relative flex flex-col gap-3 rounded-xl p-md text-left transition-all border-2",
                        currentTheme === "dark"
                          ? "border-accent bg-surface-mid ring-2 ring-accent/15"
                          : "border-border-subtle bg-surface hover:border-border"
                      )}
                    >
                      <div className="h-20 w-full rounded bg-[#08090a] border border-[#2a2b2c] p-3 flex flex-col gap-1.5 overflow-hidden">
                        <div className="h-3 w-1/3 rounded bg-[#f7f8f8]" />
                        <div className="h-2 w-full rounded bg-[#191a1b]" />
                        <div className="h-2 w-4/5 rounded bg-[#191a1b]" />
                      </div>
                      <span className="text-[13px] font-semibold text-text-primary">Dark Mode</span>
                    </button>
                  </div>
                </section>

                {/* Desktop Native Preferences */}
                <section className="rounded-xl p-xl border" style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}>
                  <div className="flex flex-col gap-1 mb-lg sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-[17px] font-semibold tracking-[-0.012em] text-text-primary mb-1">Desktop Timer Protection</h2>
                      <p className="text-[13px] text-text-muted">Control native desktop safety behavior for active tracking sessions.</p>
                    </div>
                    <Badge variant={desktopAvailable ? "success" : "raised"}>
                      {desktopAvailable ? "Desktop active" : "Desktop only"}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-md max-w-xl">
                    <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface p-md">
                      <Checkbox
                        id="autoPauseOnIdleEnabled"
                        checked={preferences?.autoPauseOnIdleEnabled !== false}
                        onChange={(val) => setPreferences({ autoPauseOnIdleEnabled: val })}
                      />
                      <div
                        className="flex flex-col gap-0.5 select-none"
                        onClick={() =>
                          setPreferences({
                            autoPauseOnIdleEnabled: !(preferences?.autoPauseOnIdleEnabled !== false),
                          })
                        }
                      >
                        <label htmlFor="autoPauseOnIdleEnabled" className="text-[13px] font-semibold text-text-primary cursor-pointer">
                          Auto-pause timer after 5 minutes idle
                        </label>
                        <p className="text-[12px] text-text-muted">
                          When Flowmate Desktop detects no system input for 5 minutes, the running session pauses and Windows shows &quot;Timer Paused&quot;.
                        </p>
                      </div>
                    </div>

                    {!desktopAvailable && (
                      <p className="text-[12px] text-text-faint">
                        This setting is saved here, but only the Tauri desktop app can read system idle time or send native Windows notifications.
                      </p>
                    )}
                  </div>
                </section>

                {/* Focus Timer Preferences */}
                <section className="rounded-xl p-xl border" style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}>
                  <h2 className="text-[17px] font-semibold tracking-[-0.012em] text-text-primary mb-1">Focus & Timer Intervals</h2>
                  <p className="text-[13px] text-text-muted mb-lg">Define how your Pomodoro sessions and break alerts are preset.</p>
                  
                  <div className="flex flex-col gap-xl max-w-md">
                    {/* Default Duration */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-text-secondary">Default Focus Session Duration</label>
                      <select
                        value={preferences?.defaultFocusDuration || 25}
                        onChange={(e) => setPreferences({ defaultFocusDuration: Number(e.target.value) })}
                        className="flex w-full h-9 rounded-lg bg-surface-mid border border-border-subtle px-3 text-[14px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
                      >
                        <option value={15}>15 Minutes</option>
                        <option value={25}>25 Minutes (Standard Pomodoro)</option>
                        <option value={30}>30 Minutes</option>
                        <option value={45}>45 Minutes</option>
                        <option value={60}>60 Minutes</option>
                      </select>
                    </div>

                    {/* Completion Whistle Toggle */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="whistleSoundEnabled"
                        checked={preferences?.whistleSoundEnabled !== false}
                        onChange={(val) => setPreferences({ whistleSoundEnabled: val })}
                      />
                      <div className="flex flex-col gap-0.5 select-none" onClick={() => setPreferences({ whistleSoundEnabled: !(preferences?.whistleSoundEnabled !== false) })}>
                        <label htmlFor="whistleSoundEnabled" className="text-[13px] font-semibold text-text-primary cursor-pointer">
                          Enable whistle alert sound
                        </label>
                        <p className="text-[12px] text-text-muted">
                          Play a kettle whistle audio sound effect when a focus duration completes.
                        </p>
                      </div>
                    </div>

                    {/* Auto Start break Toggle */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="autoBreakEnabled"
                        checked={!!preferences?.autoBreakEnabled}
                        onChange={(val) => setPreferences({ autoBreakEnabled: val })}
                      />
                      <div className="flex flex-col gap-0.5 select-none" onClick={() => setPreferences({ autoBreakEnabled: !preferences?.autoBreakEnabled })}>
                        <label htmlFor="autoBreakEnabled" className="text-[13px] font-semibold text-text-primary cursor-pointer">
                          Auto-start break sessions
                        </label>
                        <p className="text-[12px] text-text-muted">
                          Automatically start break timers immediately after a focus period ends.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ─── Projects Tab ─── */}
            {activeTab === "projects" && (
              <div className="flex flex-col gap-lg animate-fade-up">
                <section className="rounded-xl p-xl border" style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}>
                  <div className="flex items-center justify-between mb-lg">
                    <div>
                      <h2 className="text-[17px] font-semibold tracking-[-0.012em] text-text-primary mb-1">Projects Workspace</h2>
                      <p className="text-[13px] text-text-muted">Review, archive, and manage active system projects.</p>
                    </div>
                    <Button variant="primary" size="sm" onClick={() => setOpenAddProject(true)} className="gap-1.5">
                      <Plus size={14} /> New Project
                    </Button>
                  </div>

                  {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-xl bg-surface rounded-lg text-center gap-md border border-dashed border-border">
                      <FolderOpen size={32} className="text-text-faint" />
                      <div className="flex flex-col gap-1">
                        <p className="text-[14px] font-semibold text-text-primary">No projects configured</p>
                        <p className="text-[12px] text-text-muted max-w-[280px]">Add a workspace project to begin categorizing hourly sessions.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-border-subtle rounded-lg divide-y divide-border-subtle">
                      {projects.map((project) => {
                        const isArchived = project.archived || project.status === "archived";
                        const clientName = clients.find((c) => c.id === project.clientId)?.name;
                        return (
                          <div 
                            key={project.id}
                            className="flex items-center justify-between px-md py-sm hover:bg-surface-mid transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", colorDot(project.color))} />
                              <div className="flex flex-col">
                                <span className={cn("text-[14px] font-semibold text-text-primary", isArchived && "text-text-muted line-through")}>
                                  {project.name}
                                </span>
                                {clientName && <span className="text-[11px] text-text-muted">Client: {clientName}</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {isArchived ? (
                                <>
                                  <Badge variant="raised">Archived</Badge>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => restoreProject(project.id)}
                                    title="Restore"
                                    className="text-success"
                                  >
                                    <ArrowClockwise size={14} />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => handleEditProject(project)}
                                    title="Edit"
                                  >
                                    <PencilSimple size={14} />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => archiveProject(project.id)}
                                    title="Archive"
                                  >
                                    <Archive size={14} />
                                  </Button>
                                </>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setDeleteTargetProject(project)}
                                title="Delete"
                                className="text-error"
                              >
                                <Trash size={14} />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ─── Clients Tab ─── */}
            {activeTab === "clients" && (
              <div className="flex flex-col gap-lg animate-fade-up">
                <section className="rounded-xl p-xl border" style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}>
                  <div className="flex items-center justify-between mb-lg">
                    <div>
                      <h2 className="text-[17px] font-semibold tracking-[-0.012em] text-text-primary mb-1">Clients & Billing</h2>
                      <p className="text-[13px] text-text-muted">Manage target client profiles, hourly rates, and communication accounts.</p>
                    </div>
                    <Button variant="primary" size="sm" onClick={handleOpenAddClient} className="gap-1.5">
                      <Plus size={14} /> New Client
                    </Button>
                  </div>

                  {clients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-xl bg-surface rounded-lg text-center gap-md border border-dashed border-border">
                      <Briefcase size={32} className="text-text-faint" />
                      <div className="flex flex-col gap-1">
                        <p className="text-[14px] font-semibold text-text-primary">No client accounts saved</p>
                        <p className="text-[12px] text-text-muted max-w-[280px]">Add clients to set billable hourly rates for project workspaces.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-border-subtle rounded-lg divide-y divide-border-subtle">
                      {clients.map((client) => (
                        <div 
                          key={client.id}
                          className="flex items-center justify-between px-md py-sm hover:bg-surface-mid transition-colors"
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-semibold text-text-primary">{client.name}</span>
                              {client.company && (
                                <span className="text-[11px] bg-surface-mid text-text-secondary px-1.5 py-0.5 rounded">
                                  {client.company}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[12px] text-text-muted">
                              <span>Rate: ${client.hourlyRate}/hr</span>
                              {client.email && <span>• {client.email}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleOpenEditClient(client)}
                              title="Edit Client"
                            >
                              <PencilSimple size={14} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setDeleteTargetClient(client)}
                              title="Delete Client"
                              className="text-error"
                            >
                              <Trash size={14} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ─── Data Management Tab ─── */}
            {activeTab === "data" && (
              <div className="flex flex-col gap-lg animate-fade-up">
                {/* Export Details */}
                <section className="rounded-xl p-xl border" style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}>
                  <h2 className="text-[17px] font-semibold tracking-[-0.012em] text-text-primary mb-1">Backup Workspace Data</h2>
                  <p className="text-[13px] text-text-muted mb-lg">Export your projects, logged Pomodoro sessions, tasks, and settings to a JSON file.</p>
                  
                  <div className="flex flex-col gap-md max-w-md">
                    <p className="text-[13px] leading-relaxed text-text-secondary">
                      This will download a complete representation of your workspace. Keep this backup secure since it contains client billing profiles, active email IDs, and project notes.
                    </p>
                    <Button variant="primary" size="sm" onClick={handleExportData} className="w-fit gap-2">
                      <Download size={14} /> Export Backup
                    </Button>
                  </div>
                </section>

                {/* Reset Workspace */}
                <section className="rounded-xl p-xl border border-error/20" style={{ background: "var(--surface-raised)" }}>
                  <h2 className="text-[17px] font-semibold tracking-[-0.012em] text-error mb-1">Clear Application Cache</h2>
                  <p className="text-[13px] text-text-muted mb-lg">Purge local state storage indices to solve syncing anomalies.</p>
                  
                  <div className="flex flex-col gap-md max-w-md">
                    <p className="text-[13px] leading-relaxed text-text-secondary">
                      Clearing store cache removes offline session cache stored in browser local storage. This will NOT delete tasks, clients, or projects on the Supabase database. The workspace state will re-sync cleanly upon application reload.
                    </p>
                    <Button variant="secondary" size="sm" onClick={handleResetCache} className="w-fit text-error border-error/20 hover:bg-error/10">
                      Clear Cache
                    </Button>
                  </div>
                </section>
              </div>
            )}

            {/* ─── Mascot & Pet Tab ─── */}
            {activeTab === "pet" && (() => {
              const activeMascot = preferences?.activeMascot || "kettle";
              const customMascotSpritesheet = preferences?.customMascotSpritesheet || "assets/spritesheet.orig.webp";
              const customMascotWidth = preferences?.customMascotWidth ?? 192;
              const customMascotHeight = preferences?.customMascotHeight ?? 208;
              const customMascotCols = preferences?.customMascotCols ?? 8;
              const customMascotRows = preferences?.customMascotRows ?? 9;
              const customMascotScale = preferences?.customMascotScale ?? 0.58;
              const mascotMappings = preferences?.mascotMappings || {
                idle: "waiting",
                hover: "waving",
                dragLeft: "running_left",
                dragRight: "running_right",
                complete: "jumping",
                toggle: "review",
              };
              const mascotFps = preferences?.mascotFps || {
                idle: 5,
                waving: 6,
                jumping: 10,
                waiting: 4,
                review: 5,
                running_left: 10,
                running_right: 9,
              };

              return (
                <div className="flex flex-col gap-lg animate-fade-up">
                  {/* Reset Mascot Settings */}
                  <section className="rounded-xl p-md border border-border-subtle flex items-center justify-between gap-md" style={{ background: "var(--surface-raised)" }}>
                    <div>
                      <p className="text-[14px] font-semibold text-text-primary">Reset to Defaults</p>
                      <p className="text-[12px] text-text-muted">Restore all mascot configuration back to the original Kettle defaults.</p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setPreferences({
                        activeMascot: "kettle",
                        mascotMappings: {
                          idle: "waiting",
                          hover: "waving",
                          dragLeft: "running_left",
                          dragRight: "running_right",
                          complete: "jumping",
                          toggle: "review",
                        },
                        mascotFps: {
                          idle: 5,
                          waving: 6,
                          jumping: 10,
                          waiting: 4,
                          review: 5,
                          running_left: 10,
                          running_right: 9,
                        },
                      })}
                    >
                      <ArrowClockwise size={13} className="mr-1" /> Reset Mascot
                    </Button>
                  </section>

                  {/* Mascot Selection */}
                  <section className="rounded-xl p-xl border" style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}>
                    <h2 className="text-[17px] font-semibold tracking-[-0.012em] text-text-primary mb-1">Mascot Selection</h2>
                    <p className="text-[13px] text-text-muted mb-lg">Select and swap the active mascot companion displayed on your screen.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md max-w-3xl">
                      <button
                        type="button"
                        onClick={() => setPreferences({ activeMascot: "kettle" })}
                        className={cn(
                          "relative flex flex-col gap-3 rounded-xl p-md text-left transition-all border-2",
                          activeMascot === "kettle"
                            ? "border-accent bg-surface-mid ring-2 ring-accent/15"
                            : "border-border-subtle bg-surface hover:border-border"
                        )}
                      >
                        <div className="h-20 w-full rounded bg-[#08090a] border border-[#2a2b2c] p-3 flex items-center justify-center overflow-hidden">
                          <span className="text-[32px]">🫖</span>
                        </div>
                        <span className="text-[13px] font-semibold text-text-primary">Kettle Mascot (Default)</span>
                        <p className="text-[11px] text-text-muted">The original tea kettle mascot that whistles and moves around your desktop.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreferences({ activeMascot: "sprite2" })}
                        className={cn(
                          "relative flex flex-col gap-3 rounded-xl p-md text-left transition-all border-2",
                          activeMascot === "sprite2"
                            ? "border-accent bg-surface-mid ring-2 ring-accent/15"
                            : "border-border-subtle bg-surface hover:border-border"
                        )}
                      >
                        <div className="h-20 w-full rounded bg-[#08090a] border border-[#2a2b2c] p-3 flex items-center justify-center overflow-hidden">
                          <span className="text-[32px]">🧑‍💻</span>
                        </div>
                        <span className="text-[13px] font-semibold text-text-primary">Companion Mascot</span>
                        <p className="text-[11px] text-text-muted">A friendly desk companion that types while you focus, waves hello, and celebrates finished sessions.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreferences({ activeMascot: "custom" })}
                        className={cn(
                          "relative flex flex-col gap-3 rounded-xl p-md text-left transition-all border-2",
                          activeMascot === "custom"
                            ? "border-accent bg-surface-mid ring-2 ring-accent/15"
                            : "border-border-subtle bg-surface hover:border-border"
                        )}
                      >
                        <div className="h-20 w-full rounded bg-[#08090a] border border-[#2a2b2c] p-3 flex items-center justify-center overflow-hidden">
                          <span className="text-[32px]">👾</span>
                        </div>
                        <span className="text-[13px] font-semibold text-text-primary">Custom Mascot Slot</span>
                        <p className="text-[11px] text-text-muted">Load a custom spritesheet, specify cells layout, and customize animations.</p>
                      </button>
                    </div>
                  </section>

                  {/* Custom Mascot Configuration */}
                  {activeMascot === "custom" && (
                    <section className="rounded-xl p-xl border" style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}>
                      <h3 className="text-[15px] font-semibold text-text-primary mb-1">Custom Mascot Config</h3>
                      <p className="text-[12px] text-text-muted mb-md">Point to your spritesheet image file and configure the cell dimensions.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-md max-w-xl">
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <label className="text-[11px] font-semibold text-text-secondary">Spritesheet Path / URL</label>
                          <Input
                            type="text"
                            value={customMascotSpritesheet}
                            onChange={(e) => setPreferences({ customMascotSpritesheet: e.target.value })}
                            className="bg-surface-mid border-border-subtle text-[13px]"
                            placeholder="assets/spritesheet.orig.webp"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold text-text-secondary">Cell Width (px)</label>
                          <Input
                            type="number"
                            value={customMascotWidth}
                            onChange={(e) => setPreferences({ customMascotWidth: Number(e.target.value) })}
                            className="bg-surface-mid border-border-subtle text-[13px]"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold text-text-secondary">Cell Height (px)</label>
                          <Input
                            type="number"
                            value={customMascotHeight}
                            onChange={(e) => setPreferences({ customMascotHeight: Number(e.target.value) })}
                            className="bg-surface-mid border-border-subtle text-[13px]"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold text-text-secondary">Columns count</label>
                          <Input
                            type="number"
                            value={customMascotCols}
                            onChange={(e) => setPreferences({ customMascotCols: Number(e.target.value) })}
                            className="bg-surface-mid border-border-subtle text-[13px]"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold text-text-secondary">Rows count</label>
                          <Input
                            type="number"
                            value={customMascotRows}
                            onChange={(e) => setPreferences({ customMascotRows: Number(e.target.value) })}
                            className="bg-surface-mid border-border-subtle text-[13px]"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold text-text-secondary">Mascot Scale</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={customMascotScale}
                            onChange={(e) => setPreferences({ customMascotScale: Number(e.target.value) })}
                            className="bg-surface-mid border-border-subtle text-[13px]"
                          />
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Action & Animation Bindings */}
                  <section className="rounded-xl p-xl border" style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}>
                    <h2 className="text-[17px] font-semibold tracking-[-0.012em] text-text-primary mb-1">Action & Animation Bindings</h2>
                    <p className="text-[13px] text-text-muted mb-lg">Bind application triggers to specific mascot animations.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md max-w-xl">
                      {[
                        { label: "Mascot Idle", key: "idle" },
                        { label: "Hover Mascot", key: "hover" },
                        { label: "Dragging Left", key: "dragLeft" },
                        { label: "Dragging Right", key: "dragRight" },
                        { label: "Complete Task", key: "complete" },
                        { label: "Timer Open/Close", key: "toggle" }
                      ].map((item) => {
                        const animKey = item.key as keyof typeof mascotMappings;
                        return (
                          <div key={item.key} className="flex flex-col gap-1.5">
                            <label className="text-[12px] font-semibold text-text-secondary">{item.label}</label>
                            <select
                              value={mascotMappings[animKey]}
                              onChange={(e) => setPreferences({
                                mascotMappings: {
                                  ...mascotMappings,
                                  [animKey]: e.target.value
                                }
                              })}
                              className="flex w-full h-9 rounded-lg bg-surface-mid border border-border-subtle px-3 text-[13px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
                            >
                              <option value="idle">Idle (row 0)</option>
                              <option value="working">Working (row 1)</option>
                              <option value="running_left">Running Left (row 2)</option>
                              <option value="waving">Waving (row 3)</option>
                              <option value="jumping">Jumping (row 4)</option>
                              <option value="failed">Failed (row 5)</option>
                              <option value="waiting">Waiting (row 6)</option>
                              <option value="review">Review (row 7)</option>
                              <option value="sitting">Sitting (row 5 col 6)</option>
                              <option value="running_right">Running Right (row 8)</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Animation Speed */}
                  <section className="rounded-xl p-xl border" style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}>
                    <h2 className="text-[17px] font-semibold tracking-[-0.012em] text-text-primary mb-1">Animation Speed (FPS)</h2>
                    <p className="text-[13px] text-text-muted mb-lg">Fine-tune the playback speed of individual animation sequences.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg max-w-xl">
                      {[
                        { label: "Idle Speed", key: "idle", default: 5 },
                        { label: "Waving Speed", key: "waving", default: 6 },
                        { label: "Jumping Speed", key: "jumping", default: 10 },
                        { label: "Waiting Speed", key: "waiting", default: 4 },
                        { label: "Review Speed", key: "review", default: 5 },
                        { label: "Running Left Speed", key: "running_left", default: 10 },
                        { label: "Running Right Speed", key: "running_right", default: 9 }
                      ].map((item) => {
                        const fpsKey = item.key as keyof typeof mascotFps;
                        const val = mascotFps[fpsKey];
                        const speedLabel = val <= 5 ? "Slow" : val <= 12 ? "Normal" : val <= 20 ? "Fast" : "Very Fast";
                        return (
                          <div key={item.key} className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[12px] font-semibold text-text-secondary">{item.label}</label>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-text-faint">{speedLabel}</span>
                                <span className="text-[12px] text-accent font-semibold">{val} fps</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-text-faint w-6 shrink-0">1</span>
                              <input
                                type="range"
                                min="1"
                                max="30"
                                value={val}
                                onChange={(e) => setPreferences({
                                  mascotFps: {
                                    ...mascotFps,
                                    [fpsKey]: Number(e.target.value)
                                  }
                                })}
                                className="flex-1 accent-accent h-1 bg-surface-mid rounded-lg appearance-none cursor-pointer"
                              />
                              <span className="text-[10px] text-text-faint w-6 shrink-0 text-right">30</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              );
            })()}
          </div>
        </div>
      </PageContent>

      {/* ─── Client Modal Form ─── */}
      <Modal 
        open={openClientForm} 
        onClose={() => setOpenClientForm(false)} 
        title={editingClient ? "Edit Client Profile" : "Add New Client"}
      >
        <form onSubmit={handleSaveClient} className="flex flex-col gap-md">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="clientName" className="text-[12px] font-semibold text-text-secondary">Client Name *</label>
            <Input
              id="clientName"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Acme Corp"
              required
              disabled={clientFormLoading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="clientRate" className="text-[12px] font-semibold text-text-secondary">Hourly Rate ($) *</label>
            <Input
              id="clientRate"
              type="number"
              min="0"
              value={clientHourlyRate}
              onChange={(e) => setClientHourlyRate(Number(e.target.value))}
              placeholder="120"
              required
              disabled={clientFormLoading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="clientCompany" className="text-[12px] font-semibold text-text-secondary">Company Name</label>
            <Input
              id="clientCompany"
              type="text"
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
              placeholder="Acme Inc."
              disabled={clientFormLoading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="clientEmail" className="text-[12px] font-semibold text-text-secondary">Client Email</label>
            <Input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="billing@acme.com"
              disabled={clientFormLoading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="clientPhone" className="text-[12px] font-semibold text-text-secondary">Client Phone</label>
            <Input
              id="clientPhone"
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              disabled={clientFormLoading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="clientNotes" className="text-[12px] font-semibold text-text-secondary">Billing Notes / Terms</label>
            <textarea
              id="clientNotes"
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              placeholder="Net 30 terms, sends monthly invoices"
              className="flex w-full min-h-[72px] rounded-lg bg-surface-mid px-3 py-2 text-[14px] text-text-primary font-sans border-0 outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:bg-surface-raised transition-all resize-none"
              disabled={clientFormLoading}
            />
          </div>

          <div className="flex justify-end gap-sm mt-lg">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpenClientForm(false)} disabled={clientFormLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={clientFormLoading}>
              {clientFormLoading ? "Saving..." : editingClient ? "Update Client" : "Add Client"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Add/Edit Project Modals ─── */}
      <AddProjectModal open={openAddProject} onClose={() => setOpenAddProject(false)} />
      <EditProjectModal
        open={openEditProject}
        project={editingProject}
        onClose={() => {
          setOpenEditProject(false);
          setEditingProject(undefined);
        }}
      />

      {/* ─── Project Delete Confirm ─── */}
      <ConfirmDialog
        open={deleteTargetProject !== null}
        title="Delete Project?"
        description={`This will permanently delete "${deleteTargetProject?.name || "this project"}". This action cannot be undone.`}
        pending={projectDeleting}
        onClose={() => setDeleteTargetProject(null)}
        onConfirm={handleDeleteProjectConfirm}
      />

      {/* ─── Client Delete Confirm ─── */}
      <ConfirmDialog
        open={deleteTargetClient !== null}
        title="Delete Client Profile?"
        description={`This will permanently delete the client "${deleteTargetClient?.name || "this client"}". Projects and tasks linking to this client will lose billing metrics.`}
        pending={clientDeleting}
        onClose={() => setDeleteTargetClient(null)}
        onConfirm={handleDeleteClientConfirm}
      />
    </PageLayout>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}
