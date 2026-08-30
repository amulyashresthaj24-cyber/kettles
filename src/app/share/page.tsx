"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CaretLeft,
  CaretRight,
  Clock,
  CurrencyDollar,
  Download,
  Lock,
  Robot,
  ArrowClockwise,
  ShareNetwork,
  TrendUp,
} from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useNotification } from "@/components/ui/notification";
import { KettleLoader } from "@/components/KettleLoader";
import { KpiCard } from "@/components/report/KpiCard";
import { ReportCard, ReportEmptyState } from "@/components/report/ReportCard";
import { ProjectsTable } from "@/components/report/ProjectsTable";
import { TimeLogTable } from "@/components/report/TimeLogTable";
import { TimeSeriesChart } from "@/components/report/charts/TimeSeriesChart";
import { DistributionDonut } from "@/components/report/charts/DistributionDonut";
import { formatCurrency, formatDuration } from "@/lib/format";
import { buildReportData } from "@/lib/report/data";
import type { DateRange } from "@/lib/report-dates";
import {
  currentPeriodKey,
  shiftPeriodKey,
} from "@/lib/report/share-period";
import type {
  PublicSharedReport,
  SharePeriodMode,
} from "@/lib/report/share-types";
import { SharedReportError } from "@/lib/report/share-types";
import { fetchSharedReport } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type LiveState = "loading" | "live" | "refreshing" | "stale" | "offline" | "password" | "error";
type Tab = "overview" | "projects" | "logs";

const TOKEN_KEY = "flowmate-share-token";
/** Legacy key. The password is held in memory only now; this just clears it. */
const LEGACY_PASS_KEY = "flowmate-share-password";
const VIEWER_KEY = "flowmate-share-viewer";
/** Live refresh cadence — short enough to feel transparent for clients. */
const POLL_MS = 15_000;

function getOrCreateViewerSessionId(): string {
  try {
    const existing = sessionStorage.getItem(VIEWER_KEY);
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(VIEWER_KEY, id);
    return id;
  } catch {
    return `v-${Date.now()}`;
  }
}

function scrubTokenFromUrl(token: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    const url = new URL(window.location.href);
    url.searchParams.delete("t");
    window.history.replaceState({}, "", url.pathname + (url.search || ""));
  } catch {
    /* ignore */
  }
}

function readStoredToken(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("t");
    if (fromQuery) {
      scrubTokenFromUrl(fromQuery);
      return fromQuery;
    }
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export default function SharePage() {
  const { notify } = useNotification();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [periodMode, setPeriodMode] = useState<SharePeriodMode>("month");
  const [periodKey, setPeriodKey] = useState("");
  const [report, setReport] = useState<PublicSharedReport | null>(null);
  const [liveState, setLiveState] = useState<LiveState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);
  const backoffRef = useRef(POLL_MS);
  const alignedDefaultRef = useRef(false);
  const hasReportRef = useRef(false);
  const liveStateRef = useRef<LiveState>("loading");
  const errorCodeRef = useRef<string | null>(null);
  const viewerSessionId = useMemo(() => getOrCreateViewerSessionId(), []);
  const [clock, setClock] = useState(0);

  useEffect(() => {
    liveStateRef.current = liveState;
  }, [liveState]);
  useEffect(() => {
    errorCodeRef.current = errorCode;
  }, [errorCode]);

  // Keep "Updated Xs ago" fresh without refetching
  useEffect(() => {
    if (!lastUpdatedAt) return;
    const id = window.setInterval(() => setClock((n) => n + 1), 5_000);
    return () => clearInterval(id);
  }, [lastUpdatedAt]);

  useEffect(() => {
    const t = readStoredToken();
    setToken(t);
    // The share password is never written to storage — it unlocks a client's
    // billing figures, and the report only needs it for the lifetime of the
    // view. Clear anything an earlier build left behind.
    try {
      sessionStorage.removeItem(LEGACY_PASS_KEY);
    } catch {
      /* ignore */
    }
    // noindex / no-referrer for this public page
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    const referrer = document.createElement("meta");
    referrer.name = "referrer";
    referrer.content = "no-referrer";
    document.head.appendChild(referrer);
    return () => {
      robots.remove();
      referrer.remove();
    };
  }, []);

  const load = useCallback(
    async (opts?: { silent?: boolean; passwordOverride?: string }) => {
      if (!token || !periodKey) return;
      const reqId = ++reqIdRef.current;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      if (!opts?.silent) {
        setLiveState((s) => (s === "password" ? s : hasReportRef.current ? "refreshing" : "loading"));
      } else if (hasReportRef.current) {
        setLiveState("refreshing");
      }

      try {
        const data = await fetchSharedReport({
          token,
          password: (opts?.passwordOverride ?? password) || undefined,
          periodMode,
          periodKey,
          viewerSessionId,
        });
        if (reqId !== reqIdRef.current) return;
        hasReportRef.current = true;
        setReport(data);
        setLastUpdatedAt(Date.now());
        setLiveState("live");
        setErrorMessage(null);
        setErrorCode(null);
        backoffRef.current = POLL_MS;
      } catch (err) {
        if (reqId !== reqIdRef.current) return;
        if (err instanceof SharedReportError) {
          setErrorCode(err.code);
          if (err.code === "password_required" || err.code === "wrong_password") {
            setLiveState("password");
            setErrorMessage(err.code === "wrong_password" ? "Incorrect password" : null);
            return;
          }
          if (err.code === "unavailable") {
            setLiveState("error");
            setErrorMessage("This share link is unavailable.");
            return;
          }
          if (err.code === "rate_limited") {
            setLiveState("error");
            setErrorMessage("Too many attempts. Try again later.");
            backoffRef.current = Math.min(backoffRef.current * 2, 5 * 60_000);
            return;
          }
          setLiveState(hasReportRef.current ? "stale" : "error");
          setErrorMessage(err.message);
          return;
        }
        setLiveState(hasReportRef.current ? "offline" : "error");
        setErrorMessage(err instanceof Error ? err.message : "Could not load report");
        backoffRef.current = Math.min(backoffRef.current * 2, 5 * 60_000);
      }
    },
    [token, periodKey, periodMode, password, viewerSessionId]
  );

  // Initialize period from URL (?mode=&key=) or guess current month until share meta loads
  useEffect(() => {
    if (!token) {
      setLiveState("error");
      setErrorMessage("Missing share link.");
      return;
    }
    if (!periodKey) {
      try {
        const params = new URLSearchParams(window.location.search);
        const modeParam = params.get("mode");
        const keyParam = params.get("key");
        if (
          (modeParam === "week" || modeParam === "month" || modeParam === "year") &&
          keyParam
        ) {
          setPeriodMode(modeParam);
          setPeriodKey(keyParam);
          return;
        }
      } catch {
        /* ignore */
      }
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      setPeriodMode("month");
      setPeriodKey(currentPeriodKey("month", tz));
    }
  }, [token, periodKey]);

  useEffect(() => {
    if (!token || !periodKey) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, periodKey, periodMode, password]);

  // After first successful load, align to the owner's pinned period once
  useEffect(() => {
    if (!report || alignedDefaultRef.current) return;
    alignedDefaultRef.current = true;
    const preferredMode = report.share.defaultPeriodMode;
    const preferredKey =
      report.share.defaultPeriodKey ||
      report.share.options?.defaultPeriodKey ||
      currentPeriodKey(preferredMode, report.share.timezone);
    if (preferredMode !== periodMode || preferredKey !== periodKey) {
      setPeriodMode(preferredMode);
      setPeriodKey(preferredKey);
    }
  }, [report, periodMode, periodKey]);

  // Polling — do not depend on liveState (refreshing↔live was resetting the timer)
  useEffect(() => {
    if (!token || !periodKey) return;

    const canPoll = () => {
      const s = liveStateRef.current;
      if (s === "password" || s === "error" || s === "loading") return false;
      if (errorCodeRef.current === "unavailable") return false;
      return true;
    };

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (!canPoll()) return;
      load({ silent: true });
    };

    const id = window.setInterval(tick, POLL_MS);
    const onFocus = () => tick();
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [token, periodKey, load]);

  const submitPassword = () => {
    setPassword(passwordInput);
    setPasswordInput("");
  };

  const data = useMemo(() => {
    if (!report) return null;
    const range: DateRange = {
      start: new Date(report.range.startMs),
      end: new Date(report.range.endMs),
      label: report.range.label,
      key: report.range.key,
    };
    return buildReportData(
      {
        sessions: report.source.sessions as any,
        projects: report.source.projects as any,
        tasks: report.source.tasks as any,
        clients: report.source.clients as any,
      },
      {
        range,
        projectId: null,
        clientId: null,
        tag: null,
        billable: "all",
      }
    );
  }, [report]);

  const showEarnings = report?.share.options.showEarnings !== false;
  const allowExport = report?.share.options.allowExport === true;

  const navigate = (delta: number) => {
    if (!report) return;
    const next = shiftPeriodKey(periodMode, periodKey, delta, report.share.timezone);
    if (next) setPeriodKey(next);
  };

  const changeMode = (mode: SharePeriodMode) => {
    const tz = report?.share.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    setPeriodMode(mode);
    setPeriodKey(currentPeriodKey(mode, tz));
  };

  if (liveState === "password") {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-surface-raised p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-text-primary">
            <Lock size={18} />
            <h1 className="text-[17px] font-semibold">Password required</h1>
          </div>
          <p className="text-[13px] text-text-muted">Enter the password to view this report.</p>
          {errorMessage && <p className="text-[12px] text-error">{errorMessage}</p>}
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitPassword()}
            className="w-full rounded-md border border-border bg-surface-mid/40 px-3 py-2 text-[13px] outline-none focus:border-accent"
            placeholder="Password"
            autoFocus
            autoComplete="current-password"
          />
          <Button variant="primary" size="sm" onClick={submitPassword}>
            View report
          </Button>
        </div>
      </div>
    );
  }

  if (liveState === "error" && !report) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center flex flex-col gap-3">
          <ShareNetwork size={28} className="mx-auto text-text-faint" />
          <h1 className="text-[18px] font-semibold text-text-primary">Link unavailable</h1>
          <p className="text-[13px] text-text-muted">{errorMessage}</p>
          <Button size="sm" variant="secondary" onClick={() => load()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!report || !data) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <KettleLoader message="Loading shared report…" />
      </div>
    );
  }

  const totals = data.totals;
  const updatedLabel = (() => {
    // `clock` bumps every 5s so this label stays accurate between polls
    if (lastUpdatedAt == null || clock < 0) return "";
    const ageSec = Math.max(0, Math.round((Date.now() - lastUpdatedAt) / 1000));
    return ageSec < 5 ? "Updated just now" : `Updated ${Math.max(1, ageSec)}s ago`;
  })();

  return (
    <div className="min-h-screen bg-base text-text-primary">
      <header className="border-b border-border-subtle px-4 sm:px-8 py-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold tracking-wide text-accent uppercase">Kettles</span>
              <LiveBadge state={liveState} label={updatedLabel} />
            </div>
            <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.02em] truncate">
              {report.share.name}
            </h1>
            {report.share.displayName && (
              <p className="text-[13px] text-text-muted">Shared by {report.share.displayName}</p>
            )}
          </div>
          {allowExport && (
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={async () => {
                try {
                  const { exportExcel } = await import("@/lib/report/export-excel");
                  const result = await exportExcel(data, { scope: "timesheet" });
                  if (!result.ok) {
                    if (result.cancelled) {
                      notify({ title: "Export cancelled", description: "No file was saved.", tone: "info" });
                    } else {
                      notify({ title: "Download failed", description: result.error, tone: "error" });
                    }
                    return;
                  }
                  notify({
                    title: result.method === "picker" ? "Timesheet saved" : "Download started",
                    description:
                      result.method === "picker"
                        ? `Saved ${result.filename}`
                        : `${result.filename} — check your Downloads folder.`,
                    tone: "success",
                  });
                } catch (err) {
                  notify({
                    title: "Download failed",
                    description: err instanceof Error ? err.message : "Could not export timesheet.",
                    tone: "error",
                  });
                }
              }}
            >
              <Download size={14} />
              Timesheet
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            disabled={liveState === "refreshing" || liveState === "loading"}
            onClick={() => load({ silent: false })}
          >
            <ArrowClockwise size={14} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            {(["week", "month", "year"] as SharePeriodMode[]).map((m) => (
              <button
                key={m}
                onClick={() => changeMode(m)}
                className={cn(
                  "px-3 py-1.5 text-[12px] capitalize",
                  periodMode === m ? "bg-surface-mid text-text-primary" : "text-text-muted"
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button className="px-2 py-1.5 text-text-muted hover:text-text-primary" onClick={() => navigate(-1)}>
              <CaretLeft size={14} />
            </button>
            <span className="px-3 py-1.5 text-[13px] font-medium border-x border-border min-w-[120px] text-center">
              {report.range.label}
            </span>
            <button className="px-2 py-1.5 text-text-muted hover:text-text-primary" onClick={() => navigate(1)}>
              <CaretRight size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(report.share.filterLabels).map(([k, v]) => (
              <span
                key={k}
                className="px-2 py-0.5 rounded-md text-[11px] bg-surface-mid text-text-secondary border border-border-subtle"
              >
                {v}
              </span>
            ))}
          </div>
        </div>

        <nav className="flex gap-3 border-b border-border-subtle -mb-[1px]">
          {(
            [
              ["overview", "Overview"],
              ["projects", "Projects"],
              ["logs", "Time Logs"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "px-1 py-2 text-[13px] font-medium relative",
                tab === id ? "text-text-primary" : "text-text-muted"
              )}
            >
              {label}
              {tab === id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-t-full" />
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="px-4 sm:px-8 py-5 flex flex-col gap-4 max-w-6xl mx-auto w-full">
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <KpiCard
                icon={<Clock size={14} className="text-text-faint" />}
                label="Total Hours"
                value={totals.totalSeconds > 0 ? formatDuration(totals.totalSeconds) : "–"}
                sub={`${totals.activeDays} active day${totals.activeDays !== 1 ? "s" : ""}`}
              />
              <KpiCard
                icon={<CurrencyDollar size={14} className="text-success" />}
                label="Billable Hours"
                value={totals.billableSeconds > 0 ? formatDuration(totals.billableSeconds) : "–"}
                sub={totals.billablePct > 0 ? `${totals.billablePct.toFixed(0)}% of total` : "No billable time"}
                highlight={totals.billableSeconds > 0}
              />
              {showEarnings && (
                <KpiCard
                  icon={<TrendUp size={14} className="text-accent" />}
                  label="Earnings"
                  value={totals.earningsCents > 0 ? formatCurrency(totals.earningsCents) : "–"}
                  sub={totals.earningsCents > 0 ? `${formatDuration(totals.billableSeconds)} billed` : ""}
                />
              )}
              <KpiCard
                icon={<Clock size={14} className="text-text-faint" />}
                label="Sessions"
                value={String(totals.sessionCount)}
                sub={`${totals.tasksCompleted} tasks completed`}
              />
              {/* Only present when the owner opted into the split — the payload
                  carries no agent segments otherwise, so this stays hidden. */}
              {totals.agentSeconds > 0 && (
                <KpiCard
                  icon={<Robot size={14} className="text-accent" />}
                  label="AI-Assisted"
                  value={formatDuration(totals.agentSeconds)}
                  sub={`${totals.agentPct.toFixed(0)}% of total · ${formatDuration(totals.soloSeconds)} solo`}
                />
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
              <ReportCard title={`Tracked time by ${data.seriesUnit}`}>
                <TimeSeriesChart data={data.series} />
              </ReportCard>
              <ReportCard title="Project distribution">
                <DistributionDonut
                  data={data.projects.map((p) => ({
                    id: p.id,
                    name: p.name,
                    seconds: p.seconds,
                    color: p.color,
                  }))}
                  totalSeconds={totals.totalSeconds}
                />
              </ReportCard>
            </div>
          </>
        )}

        {tab === "projects" && (
          <ReportCard title="Project and task breakdown" flush>
            {data.projects.length === 0 ? (
              <ReportEmptyState message="No sessions logged for this period." />
            ) : (
              <ProjectsTable projects={data.projects} totals={totals} groupByClient={false} />
            )}
          </ReportCard>
        )}

        {tab === "logs" && (
          <ReportCard flush>
            <TimeLogTable
              logs={data.timeLog}
              totalSeconds={totals.totalSeconds}
              totalEarningsCents={showEarnings ? totals.earningsCents : 0}
              groupByDay
            />
          </ReportCard>
        )}
      </main>
    </div>
  );
}

function LiveBadge({ state, label }: { state: LiveState; label: string }) {
  const text =
    state === "live"
      ? "Live"
      : state === "refreshing"
        ? "Refreshing"
        : state === "stale"
          ? "Stale"
          : state === "offline"
            ? "Offline"
            : "…";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          state === "live" && "bg-success animate-pulse",
          state === "refreshing" && "bg-accent animate-pulse",
          state === "stale" && "bg-[var(--warning)]",
          state === "offline" && "bg-text-faint",
          state === "loading" && "bg-text-faint"
        )}
      />
      {text}
      {label && state === "live" ? ` · ${label}` : ""}
    </span>
  );
}
