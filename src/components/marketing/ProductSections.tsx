"use client";

/* ============================================================================
   Product sections — extracted from the "4-levels" Figma design system and
   rebuilt with REAL Flowmate dashboard elements (StatCard, Today's Tasks,
   Project breakdown, Work Log). Card radius / shadow / bg / chips / icons all
   pulled into the .kettles token language so the marketing page shows the
   actual app, not generic mocks.
   Design-system constants (from 4-levels): card radius 20, header chip +
   export affordance, 1px hairline border, deep diffusion shadow, mono numerals.
   ========================================================================== */

import Image from "next/image";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { CalendarGridArt, ReportSparkArt } from "@/components/marketing/art";
import {
  CaretRight,
  Export,
  ChartBar,
  CheckCircle,
  Clock,
  CurrencyDollar,
  CalendarBlank,
  Timer,
  ShieldCheck,
  ArrowsClockwise,
  Plus,
  ArrowUpRight,
} from "@phosphor-icons/react";

const DOT: Record<string, string> = {
  c1: "var(--k-c1)",
  c2: "var(--k-c2)",
  c3: "var(--k-c3)",
  c4: "var(--k-c4)",
  c5: "var(--k-c5)",
};

/* ---------- reusable chip (the 4-levels pill language) -------------------- */
export function Chip({
  children,
  tone = "neutral",
  dot,
  className = "",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "ok" | "warn";
  dot?: boolean;
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-[var(--k-line2)] bg-[var(--k-card2)] text-[var(--k-ink2)]",
    accent: "border-[var(--k-tint2)] bg-[var(--k-tint)] text-[var(--k-accent2)]",
    ok: "border-[color:rgba(16,185,129,0.22)] bg-[color:rgba(16,185,129,0.1)] text-[var(--k-ok)]",
    warn: "border-[color:rgba(245,158,11,0.22)] bg-[color:rgba(245,158,11,0.1)] text-[var(--k-c5)]",
  };
  const dotColor: Record<string, string> = {
    neutral: "var(--k-muted)",
    accent: "var(--k-accent2)",
    ok: "var(--k-ok)",
    warn: "var(--k-c5)",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${tones[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor[tone] }} />}
      {children}
    </span>
  );
}

/* ---------- card shell matching the 4-levels feature panel ---------------- */
function FeatureCard({
  className = "",
  icon,
  title,
  badge,
  children,
}: {
  className?: string;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`k-glass-card k-interactive-card flex flex-col p-6 ${className}`}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-[var(--k-ink)]">
          <span className="text-[var(--k-accent2)] k-pulse-icon">{icon}</span>
          <h3 className="text-[15px] font-semibold text-[#e2e4e9]">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-[6px] border border-[var(--k-line2)] px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--k-muted)]">
            {badge ?? "Last Month"} <CaretRight size={10} className="rotate-90" />
          </span>
          <span className="grid h-[28px] w-[28px] place-items-center rounded-[6px] border border-[var(--k-line2)] text-[var(--k-muted)]">
            <Export size={12} weight="bold" />
          </span>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/* =========================================================================
   DEEP-DIVE — the four 4-levels feature blocks, adapted to Flowmate semantics
   Conversion Tracking → Billable Ledger (table + status chips)
   Spam & Bot Filtering → Privacy Shield (reassuring area line)
   A/B Split Testing → Smart Estimates (variant rows)
   Realtime Events → Live Sessions (event feed + rising line)
   ========================================================================= */
export function DeepDiveFeatures() {
  return (
    <section className="mx-auto max-w-[1240px] px-6 py-[120px]">
      <div className="k-reveal mx-auto mb-16 max-w-[740px] text-center">
        <Chip tone="accent" dot className="mb-5">
          Under the hood
        </Chip>
        <h2 className="text-[clamp(28px,3.4vw,42px)] font-semibold tracking-[-0.03em] text-[var(--k-ink)]">
          Four levels of an honest record.
        </h2>
        <p className="mx-auto mt-5 max-w-[56ch] text-[18px] text-[var(--k-muted)]">
          From a single brew to an invoice-ready ledger — every layer is built to be accurate, private, and yours.
        </p>
      </div>

      <div className="k-reveal grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 1 — Billable Ledger (Conversion Tracking) */}
        <FeatureCard icon={<CurrencyDollar size={16} />} title="Billable Ledger" badge="This Week">
          <div className="overflow-hidden rounded-xl border border-[var(--k-line2)]">
            <div className="grid grid-cols-[1.6fr_0.8fr_0.9fr] gap-2 border-b border-[var(--k-line2)] bg-[var(--k-card2)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--k-faint)]">
              <span>Client</span>
              <span className="text-right">Hours</span>
              <span className="text-right">Status</span>
            </div>
            {[
              ["Northwind", "c2", "13.2", "Invoiced", "ok"],
              ["Harbor Co.", "c1", "9.8", "Pending", "warn"],
              ["Lumen", "c3", "8.0", "Invoiced", "ok"],
              ["Field Notes", "c4", "7.5", "Pending", "warn"],
            ].map(([n, c, h, status, tone]) => (
              <div
                key={n}
                className="grid grid-cols-[1.6fr_0.8fr_0.9fr] items-center gap-2 border-b border-[var(--k-line)] px-4 py-3 text-[13px] last:border-0 k-hover-row transition-all duration-200"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: DOT[c] }} />
                  <span className="font-medium text-[var(--k-ink)]">{n}</span>
                </div>
                <span className="k-mono text-right text-[var(--k-ink)]">{h}</span>
                <span className="flex justify-end">
                  <Chip tone={tone as "ok" | "warn"}>{status}</Chip>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-baseline justify-between">
            <span className="text-[13px] text-[var(--k-muted)]">Ready to invoice</span>
            <span className="k-mono text-[24px] font-medium tracking-[-0.02em] text-[var(--k-ink)] k-glow-text">$3,840.00</span>
          </div>
        </FeatureCard>

        {/* 2 — Privacy Shield (Spam & Bot Filtering) */}
        <FeatureCard icon={<ShieldCheck size={16} />} title="Privacy Shield" badge="Always on">
          <p className="mb-4 text-[13px] text-[var(--k-muted)]">
            Zero screenshots, zero keystroke logs. Only the time you choose to brew.
          </p>
          <div className="relative h-[150px] w-full overflow-hidden rounded-xl border border-[var(--k-line2)] bg-[var(--k-card2)] p-4">
            <svg viewBox="0 0 320 110" className="h-full w-full k-wave-svg" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="pv-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--k-accent)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--k-accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 78 C 40 70, 60 60, 90 64 S 150 40, 180 46 S 240 22, 270 30 S 310 18, 320 22 L320 110 L0 110 Z"
                fill="url(#pv-area)"
              />
              <path
                d="M0 78 C 40 70, 60 60, 90 64 S 150 40, 180 46 S 240 22, 270 30 S 310 18, 320 22"
                fill="none"
                stroke="var(--k-accent2)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute right-3 top-3">
              <Chip tone="ok" dot>
                Blocked 0 trackers
              </Chip>
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip>256-bit AES</Chip>
            <Chip>GDPR</Chip>
            <Chip>SOC 2 Type II</Chip>
          </div>
        </FeatureCard>

        {/* 3 — Smart Estimates (A/B Split Testing) */}
        <FeatureCard icon={<ChartBar size={16} />} title="Smart Estimates" badge="vs. actual">
          <p className="mb-4 text-[13px] text-[var(--k-muted)]">Your guesses, scored against the brew.</p>
          <div className="flex flex-col gap-3">
            {[
              ["Wireframe onboarding", "3.0h est", "2.8h", 93, "ok"],
              ["Pricing copy", "2.0h est", "3.1h", 64, "warn"],
              ["Auth screens", "4.0h est", "3.9h", 97, "ok"],
            ].map(([t, est, act, pct, tone]) => (
              <div key={t as string} className="rounded-xl border border-[var(--k-line2)] bg-[var(--k-card2)] p-3.5 k-hover-row transition-all duration-200">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--k-ink)]">{t}</span>
                  <Chip tone={tone as "ok" | "warn"}>{act} actual</Chip>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--k-bg2)]">
                    <i
                      className="block h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, background: tone === "ok" ? "var(--k-ok)" : "var(--k-c5)" }}
                    />
                  </span>
                  <span className="k-mono w-[64px] flex-none text-right text-[11.5px] text-[var(--k-faint)]">{est}</span>
                </div>
              </div>
            ))}
          </div>
        </FeatureCard>

        {/* 4 — Live Sessions (Realtime Events) */}
        <FeatureCard icon={<ArrowsClockwise size={16} />} title="Live Sessions" badge="Realtime">
          <div className="mb-4 flex items-end gap-3">
            <span className="k-mono text-[28px] font-medium tracking-[-0.02em] text-[var(--k-ink)]">14:08</span>
            <Chip tone="ok" dot className="mb-1.5">
              Syncing across 3 devices
            </Chip>
          </div>
          <div className="flex flex-col gap-2.5">
            {[
              [Timer, "Focus brew started", "Wireframe onboarding", "now", "c4"],
              [CheckCircle, "Brew sealed to task", "Pricing copy · 25m", "2m", "c1"],
              [ArrowsClockwise, "Synced to cloud", "macOS → Web", "5m", "c2"],
              [CalendarBlank, "Break finished", "Back to work", "9m", "c3"],
            ].map(([Ic, t, d, time, c], i) => {
              const Icon = Ic as typeof Timer;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-[var(--k-line)] bg-[var(--k-card2)] px-3.5 py-2.5 k-hover-row transition-all duration-200"
                >
                  <span
                    className="grid h-7 w-7 flex-none place-items-center rounded-lg"
                    style={{ background: "color-mix(in srgb, " + DOT[c as string] + " 16%, transparent)", color: DOT[c as string] }}
                  >
                    <Icon size={14} className="k-pulse-icon" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[var(--k-ink)]">{t as string}</p>
                    <p className="truncate text-[11.5px] text-[var(--k-muted)]">{d as string}</p>
                  </div>
                  <span className="k-mono flex-none text-[11px] text-[var(--k-faint)]">{time as string}</span>
                </div>
              );
            })}
          </div>
        </FeatureCard>
      </div>
    </section>
  );
}

/* =========================================================================
   WORKFLOW PREVIEW — real Flowmate app screenshot (filled data).
   ========================================================================= */
export function WorkflowPreview() {
  return (
    <section className="relative isolate -my-20 overflow-hidden md:-my-32">
      <ReportSparkArt className="k-workflow-art k-workflow-art--report" />
      <CalendarGridArt className="k-workflow-art k-workflow-art--calendar" />
      <div className="relative z-10">
        <ContainerScroll
          titleComponent={
            <div className="mx-auto mb-2 max-w-[740px] px-6 text-center">
              <h2 className="k-reveal text-[clamp(32px,3.8vw,48px)] font-bold tracking-[-0.03em] text-[var(--k-ink)]">
                The whole day, in one calm view.
              </h2>
              <p className="k-reveal mx-auto mt-5 max-w-[56ch] text-[17px] leading-relaxed text-[var(--k-muted)]">
                This is the actual dashboard — tasks, brews, and billing already agreeing with each other.
              </p>
            </div>
          }
        >
          {/* the app — real screenshot, filled data, tilting up as you scroll */}
          <Image
            src="/images/dashboard-shot.png"
            alt="Kettles dashboard — stats, today's tasks, work log, and project breakdown"
            width={2507}
            height={1343}
            className="mx-auto h-full w-full object-cover object-left-top"
            draggable={false}
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 1424px"
          />
        </ContainerScroll>
      </div>
    </section>
  );
}
