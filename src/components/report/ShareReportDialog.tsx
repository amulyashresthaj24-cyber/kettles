"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CheckCircle, Link, Lock, ShareNetwork, Trash } from "@/components/ui/icon";
import { useNotification } from "@/components/ui/notification";
import { useApp } from "@/lib/store-supabase";
import { cn } from "@/lib/utils";
import { getAppOrigin } from "@/lib/supabase";
import type { ReportFilterState } from "@/components/report/ReportFilterBar";
import type { Client, Project } from "@/lib/types";
import {
  defaultShareOptions,
  type ReportShare,
  type ShareDisclosureOptions,
} from "@/lib/report/share-types";

type Tab = "create" | "manage";
type ExpiryChoice = "never" | "7" | "30" | "90";

interface ShareReportDialogProps {
  open: boolean;
  onClose: () => void;
  filters: ReportFilterState;
  /** Stable period key matching the report view, e.g. "2026-07". */
  periodKey: string;
  periodLabel: string;
  projects: Project[];
  clients: Client[];
  /** Builds the authenticated self-use filter URL (not a public share). */
  getInternalFilterUrl: () => string;
}

function expiryMs(choice: ExpiryChoice): number | null {
  if (choice === "never") return null;
  const days = Number(choice);
  return Date.now() + days * 86_400_000;
}

function relativeTime(ms: number | null): string {
  if (!ms) return "Never viewed";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function filterSummary(
  filters: ReportFilterState,
  projects: Project[],
  clients: Client[]
): string[] {
  const chips: string[] = [];
  if (filters.clientId) {
    chips.push(clients.find((c) => c.id === filters.clientId)?.name ?? "Client");
  }
  if (filters.projectId) {
    chips.push(projects.find((p) => p.id === filters.projectId)?.name ?? "Project");
  }
  if (filters.tag) chips.push(`#${filters.tag}`);
  if (filters.billable !== "all") {
    chips.push(filters.billable === "billable" ? "Billable" : "Non-billable");
  }
  if (chips.length === 0) chips.push("All time tracked");
  return chips;
}

export function ShareReportDialog({
  open,
  onClose,
  filters,
  periodKey,
  periodLabel,
  projects,
  clients,
  getInternalFilterUrl,
}: ShareReportDialogProps) {
  const { notify } = useNotification();
  const reportShares = useApp((s) => s.reportShares);
  const reportSharesLoaded = useApp((s) => s.reportSharesLoaded);
  const loadReportShares = useApp((s) => s.loadReportShares);
  const createReportShare = useApp((s) => s.createReportShare);
  const updateReportShare = useApp((s) => s.updateReportShare);
  const revokeReportShare = useApp((s) => s.revokeReportShare);
  const rotateReportShareToken = useApp((s) => s.rotateReportShareToken);
  const deleteReportShare = useApp((s) => s.deleteReportShare);
  const loadSessions = useApp((s) => s.loadSessions);

  const [tab, setTab] = useState<Tab>("create");
  const [name, setName] = useState("Client report");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [expiry, setExpiry] = useState<ExpiryChoice>("never");
  const [options, setOptions] = useState<ShareDisclosureOptions>(() =>
    defaultShareOptions(filters.periodMode)
  );
  const [busy, setBusy] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab("create");
    setCreatedUrl(null);
    setPassword("");
    setOptions(defaultShareOptions(filters.periodMode, periodKey));
    const projectName = filters.projectId
      ? projects.find((p) => p.id === filters.projectId)?.name
      : null;
    const clientName = filters.clientId
      ? clients.find((c) => c.id === filters.clientId)?.name
      : null;
    setName(projectName || clientName ? `${projectName || clientName} report` : "Client report");
    // Push any pending local edits to Supabase before the owner creates a link.
    (async () => {
      try {
        const { getSyncEngine } = await import("@/lib/sync-engine");
        await getSyncEngine().flush();
        await loadSessions();
      } catch {
        /* non-fatal — create will flush again */
      }
      loadReportShares().catch(() => {
        notify({ title: "Could not load shares", tone: "error" });
      });
    })();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const chips = filterSummary(filters, projects, clients);

  const handleCreate = async () => {
    setBusy(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const result = await createReportShare({
        name: name.trim() || "Client report",
        displayName: displayName.trim() || undefined,
        filters: {
          projectId: filters.projectId,
          clientId: filters.clientId,
          tag: filters.tag,
          billable: filters.billable,
        },
        options: {
          ...options,
          defaultPeriodMode: filters.periodMode,
          defaultPeriodKey: periodKey,
        },
        timezone,
        password: password.trim() || undefined,
        expiresAt: expiryMs(expiry),
      });
      const base =
        result.url || `${getAppOrigin()}/share?t=${encodeURIComponent(result.token)}`;
      const shareUrl = (() => {
        try {
          const u = new URL(base);
          u.searchParams.set("mode", filters.periodMode);
          u.searchParams.set("key", periodKey);
          return u.toString();
        } catch {
          return `${base}&mode=${filters.periodMode}&key=${encodeURIComponent(periodKey)}`;
        }
      })();
      setCreatedUrl(shareUrl);
      await navigator.clipboard.writeText(shareUrl);
      notify({
        title: "Share link created",
        description: "Link copied. This is the only time the full URL is shown.",
        tone: "success",
      });
      setPassword("");
    } catch (err) {
      notify({
        title: "Could not create share",
        description: err instanceof Error ? err.message : "Try again",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const copyInternal = async () => {
    try {
      await navigator.clipboard.writeText(getInternalFilterUrl());
      notify({
        title: "Internal link copied",
        description: "Only works when signed in to your account.",
        tone: "success",
      });
    } catch {
      notify({ title: "Copy failed", tone: "error" });
    }
  };

  const handleRotate = async (share: ReportShare) => {
    setBusy(true);
    try {
      const result = await rotateReportShareToken(share.id);
      const url = result.url || `${getAppOrigin()}/share?t=${encodeURIComponent(result.token)}`;
      await navigator.clipboard.writeText(url);
      notify({
        title: "Link replaced",
        description: "New link copied. The old link no longer works.",
        tone: "success",
      });
    } catch (err) {
      notify({
        title: "Replace failed",
        description: err instanceof Error ? err.message : "Try again",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Share report" className="max-w-lg">
      <div className="flex flex-col gap-4">
        <div className="flex gap-1 rounded-md border border-border bg-surface-mid/40 p-0.5">
          {([
            { id: "create" as const, label: "Create link" },
            { id: "manage" as const, label: "Manage" },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 rounded px-3 py-1.5 text-[13px] font-medium transition-colors",
                tab === t.id
                  ? "bg-surface-raised text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "create" && (
          <div className="flex flex-col gap-4">
            {createdUrl ? (
              <div className="rounded-lg border border-success/30 bg-success/10 p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-success text-[13px] font-medium">
                  <CheckCircle size={16} />
                  Link ready — copied to clipboard
                </div>
                <code className="text-[12px] text-text-secondary break-all">{createdUrl}</code>
                <p className="text-[11px] text-text-faint">
                  This full URL is shown only once. Use Replace link later if you lose it.
                </p>
                <Button size="sm" variant="secondary" onClick={() => setCreatedUrl(null)}>
                  Create another
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[11px] bg-surface-mid text-text-secondary border border-border-subtle">
                    {periodLabel}
                  </span>
                  {chips.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded-md text-[11px] bg-accent/10 text-accent border border-accent/20"
                    >
                      {c}
                    </span>
                  ))}
                </div>

                <Field label="Report name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface-mid/40 px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent"
                    maxLength={120}
                  />
                </Field>

                <Field label="Display name (optional)" hint='Shown as "Shared by …". Leave blank to hide.'>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface-mid/40 px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent"
                    placeholder="Acme Studio"
                    maxLength={80}
                  />
                </Field>

                <div className="flex flex-col gap-2">
                  <span className="text-[12px] font-medium text-text-secondary">What clients can see</span>
                  {(
                    [
                      ["showEarnings", "Earnings & rates"],
                      ["showTaskTitles", "Task names"],
                      ["showNotes", "Session notes"],
                      ["allowExport", "Download timesheet"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-[13px] text-text-secondary">
                      <input
                        type="checkbox"
                        checked={options[key]}
                        onChange={(e) => setOptions((o) => ({ ...o, [key]: e.target.checked }))}
                        className="rounded border-border"
                      />
                      {label}
                    </label>
                  ))}
                </div>

                <Field label="Password (optional)">
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-md border border-border bg-surface-mid/40 pl-9 pr-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent"
                      placeholder="Leave blank for link-only access"
                      maxLength={128}
                      autoComplete="new-password"
                    />
                  </div>
                </Field>

                <Field label="Expires">
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["never", "Never"],
                        ["7", "7 days"],
                        ["30", "30 days"],
                        ["90", "90 days"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setExpiry(id)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[12px] border transition-colors",
                          expiry === id
                            ? "border-accent bg-accent-dim text-text-primary"
                            : "border-border text-text-muted hover:text-text-secondary"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="primary"
                    className="gap-1.5"
                    disabled={busy}
                    onClick={handleCreate}
                  >
                    <ShareNetwork size={14} />
                    {busy ? "Creating…" : "Create & copy link"}
                  </Button>
                  <Button size="sm" variant="secondary" className="gap-1.5" onClick={copyInternal}>
                    <Link size={14} />
                    Copy internal filter URL
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "manage" && (
          <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto">
            {!reportSharesLoaded && (
              <p className="text-[13px] text-text-muted">Loading shares…</p>
            )}
            {reportSharesLoaded && reportShares.length === 0 && (
              <p className="text-[13px] text-text-muted">No share links yet.</p>
            )}
            {reportShares.map((share) => {
              const revoked = !!share.revokedAt;
              const expired = !!share.expiresAt && share.expiresAt < Date.now();
              const status = revoked ? "Revoked" : expired ? "Expired" : "Live";
              return (
                <div
                  key={share.id}
                  className="rounded-lg border border-border-subtle p-3 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-text-primary truncate">
                        {share.name}
                      </div>
                      <div className="text-[11px] text-text-faint">
                        …{share.tokenPrefix}
                        {share.passwordProtected ? " · Password" : ""}
                        {" · "}
                        Seen {share.viewCount} time{share.viewCount !== 1 ? "s" : ""}
                        {" · "}
                        {relativeTime(share.lastViewedAt)}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-md",
                        status === "Live"
                          ? "bg-success/15 text-success"
                          : "bg-surface-mid text-text-muted"
                      )}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {!revoked && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => handleRotate(share)}
                      >
                        Replace link
                      </Button>
                    )}
                    {!revoked && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={async () => {
                          try {
                            await revokeReportShare(share.id);
                            notify({ title: "Link revoked", tone: "success" });
                          } catch (err) {
                            notify({
                              title: "Revoke failed",
                              description: err instanceof Error ? err.message : "",
                              tone: "error",
                            });
                          }
                        }}
                      >
                        Revoke
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-error"
                      disabled={busy}
                      onClick={async () => {
                        try {
                          await deleteReportShare(share.id);
                          notify({ title: "Share deleted", tone: "success" });
                        } catch (err) {
                          notify({
                            title: "Delete failed",
                            description: err instanceof Error ? err.message : "",
                            tone: "error",
                          });
                        }
                      }}
                    >
                      <Trash size={14} />
                    </Button>
                    {share.options && (
                      <button
                        type="button"
                        className="text-[11px] text-text-faint hover:text-text-secondary ml-auto"
                        onClick={async () => {
                          try {
                            await updateReportShare(share.id, {
                              options: {
                                ...share.options,
                                allowExport: !share.options.allowExport,
                              },
                            });
                          } catch {
                            /* ignore */
                          }
                        }}
                      >
                        Export: {share.options.allowExport ? "on" : "off"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-text-secondary">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-text-faint">{hint}</span>}
    </label>
  );
}
