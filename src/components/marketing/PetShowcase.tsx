"use client";

import { useState } from "react";
import Image from "next/image";
import { LandingPet, type LandingPetState } from "@/components/marketing/LandingPet";
import { FocusRingArt, SteamMotif } from "@/components/marketing/art";
import {
  Bell,
  ChatTeardropText,
  Cursor,
  Desktop,
  Pause,
  Play,
  Sparkle,
  Check,
} from "@phosphor-icons/react";

interface BehaviorItem {
  id: string;
  label: string;
  state: LandingPetState;
  event: string;
  phase: string;
  trigger: string;
  description: string;
  hasNotify?: boolean;
  hasExtend?: boolean;
}

const BEHAVIORS: BehaviorItem[] = [
  {
    id: "start",
    label: "Focusing",
    state: "working",
    event: "timerStart / timerResume",
    phase: "running",
    trigger: "Timer starts or resumes",
    description: "Settles into a focused working loop without visual distraction while work is underway.",
  },
  {
    id: "pause",
    label: "Paused",
    state: "waiting",
    event: "timerPause / timerBreak",
    phase: "paused",
    trigger: "Timer pauses or enters break",
    description: "Holds a quiet waiting state while the clock rests so you can take a breather.",
  },
  {
    id: "finish",
    label: "Completion",
    state: "jumping",
    event: "timerFinish",
    phase: "finished",
    trigger: "Focus session reaches zero",
    description: "Plays a celebration jump, sends a native desktop notification, and presents extend chips.",
    hasNotify: true,
    hasExtend: true,
  },
  {
    id: "abandon",
    label: "Interrupted",
    state: "failed",
    event: "timerAbandon",
    phase: "idle",
    trigger: "Timer is stopped early",
    description: "Displays a brief failure reaction before recovering back to idle state.",
  },
];

interface QuoteSample {
  kind: "chat" | "break" | "reminder";
  label: string;
  text: string;
  detail: string;
}

const QUOTES: QuoteSample[] = [
  {
    kind: "chat",
    label: "Chat bubble",
    text: "Ready for a 25-minute deep focus block?",
    detail: "Interactive dialog",
  },
  {
    kind: "break",
    label: "Break alert",
    text: "Session finished. Step away and stretch for 5 minutes.",
    detail: "Rest reminder",
  },
  {
    kind: "reminder",
    label: "Task nudge",
    text: "Designing landing page • 12:40 remaining",
    detail: "Focus status",
  },
];

export function PetShowcase() {
  const [activeBehavior, setActiveBehavior] = useState<BehaviorItem>(BEHAVIORS[0]);
  const [activeQuote, setActiveQuote] = useState<QuoteSample>(QUOTES[0]);

  return (
    <section
      id="desktop-pet"
      className="k-texture relative z-10 border-t border-[var(--k-line)] bg-[var(--k-bg)] py-[120px] overflow-hidden"
    >
      <div className="mx-auto max-w-[1180px] px-6">
        {/* Section Header */}
        <div className="k-reveal mx-auto max-w-[760px] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--k-line2)] bg-[var(--k-card)] px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--k-accent2)]">
            <Desktop size={15} weight="bold" />
            Tauri Overlay Window
          </span>
          <h2 className="mt-5 text-[clamp(32px,3.8vw,48px)] font-bold tracking-[-0.03em] text-[var(--k-ink)]">
            An overlay companion on your desktop.
          </h2>
          <p className="mx-auto mt-4 max-w-[58ch] text-[17px] leading-relaxed text-[var(--k-muted)]">
            Flowmate&apos;s pet is an always-on-top overlay window that floats above your editor and design tools.
            It reacts to your timer lifecycle, accepts mouse pokes, and displays quick action chips.
          </p>
        </div>

        {/* Top Grid: Interactive Behavior Explorer + Desktop Traits */}
        <div className="mt-14 grid grid-cols-1 gap-[20px] lg:grid-cols-12">
          {/* Main Behavior Stage */}
          <div className="k-reveal flex flex-col justify-between overflow-hidden rounded-[24px] border border-[var(--k-line)] bg-[var(--k-card)] p-8 lg:col-span-7">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--k-line)] pb-5">
                <div className="flex items-center gap-2">
                  <Sparkle size={18} className="text-[var(--k-accent2)]" weight="bold" />
                  <h3 className="text-[18px] font-semibold text-[var(--k-ink)]">Timer Reactions</h3>
                </div>
                <span className="k-mono text-[12px] font-medium text-[var(--k-faint)]">
                  Event: {activeBehavior.event}
                </span>
              </div>

              {/* Behavior selector tabs */}
              <div className="mt-5 flex flex-wrap gap-2">
                {BEHAVIORS.map((b) => {
                  const isActive = b.id === activeBehavior.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setActiveBehavior(b)}
                      className={`k-press rounded-full px-4 py-2 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? "bg-[var(--k-accent)] text-[var(--k-ink)] shadow-[0_4px_16px_-4px_rgba(0,102,255,0.4)]"
                          : "border border-[var(--k-line2)] bg-[var(--k-bg2)] text-[var(--k-muted)] hover:border-[var(--k-line3)] hover:text-[var(--k-ink)]"
                      }`}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Animation Canvas */}
            <div className="relative my-8 flex min-h-[220px] flex-col items-center justify-center rounded-[16px] border border-[var(--k-line2)] bg-[var(--k-bg2)] p-6">
              <FocusRingArt className="pointer-events-none absolute h-44 w-44 opacity-20" />
              <div className="relative z-10 flex flex-col items-center">
                <LandingPet
                  key={activeBehavior.id}
                  state={activeBehavior.state}
                  interactive={false}
                  loop={true}
                  scale={0.7}
                  className="shrink-0"
                />
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--k-line2)] bg-[var(--k-card)] px-3 py-1 text-[12px] font-medium text-[var(--k-ink2)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--k-accent2)] animate-pulse" />
                  Phase: {activeBehavior.phase}
                </span>
              </div>
            </div>

            {/* Behavior details footer */}
            <div className="rounded-[16px] border border-[var(--k-line)] bg-[var(--k-bg2)] p-5">
              <div className="flex items-center justify-between text-[13px] font-medium text-[var(--k-accent2)]">
                <span>Trigger: {activeBehavior.trigger}</span>
                {activeBehavior.hasNotify && (
                  <span className="inline-flex items-center gap-1 text-[12px] text-[var(--k-ok)]">
                    <Bell size={14} weight="bold" /> Native Desktop Notification
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[14.5px] text-[var(--k-muted)] leading-relaxed">
                {activeBehavior.description}
              </p>

              {/* Extend Chips Preview if finish state */}
              {activeBehavior.hasExtend && (
                <div className="mt-4 border-t border-[var(--k-line)] pt-3">
                  <span className="text-[12px] font-medium text-[var(--k-faint)]">
                    Timer Complete Options (PetSignal.showExtend):
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["+5m", "+10m", "+25m", "Finish"].map((chip) => (
                      <span
                        key={chip}
                        className="rounded-md border border-[var(--k-line2)] bg-[var(--k-card)] px-2.5 py-1 text-[12px] font-medium text-[var(--k-ink2)]"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Desktop Window Capabilities & Poses */}
          <div className="flex flex-col gap-[20px] lg:col-span-5">
            {/* Native Window Traits Card */}
            <div className="k-reveal rounded-[24px] border border-[var(--k-line)] bg-[var(--k-card)] p-7 flex-1">
              <h3 className="text-[18px] font-semibold text-[var(--k-ink)]">Desktop Window Capabilities</h3>
              <p className="mt-2 text-[14.5px] text-[var(--k-muted)] leading-relaxed">
                Integrated directly with the host Tauri process for unobtrusive background operation.
              </p>

              <ul className="mt-6 space-y-4 text-[14px]">
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md border border-[var(--k-line2)] bg-[var(--k-bg2)] p-1.5 text-[var(--k-accent2)] shrink-0">
                    <Desktop size={16} weight="bold" />
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--k-ink)]">Always-On-Top Overlay</span>
                    <p className="text-[13px] text-[var(--k-muted)]">Pins above code editors, terminals, and design tools via petOpen.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md border border-[var(--k-line2)] bg-[var(--k-bg2)] p-1.5 text-[var(--k-accent2)] shrink-0">
                    <Cursor size={16} weight="bold" />
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--k-ink)]">Click-Through Toggle</span>
                    <p className="text-[13px] text-[var(--k-muted)]">Enable petSetClickthrough for zero mouse obstruction while typing.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md border border-[var(--k-line2)] bg-[var(--k-bg2)] p-1.5 text-[var(--k-accent2)] shrink-0">
                    <Sparkle size={16} weight="bold" />
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--k-ink)]">Direct Poke Reactions</span>
                    <p className="text-[13px] text-[var(--k-muted)]">Hover acknowledges, single click waves, and double click jumps.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Pose Artwork Showcase */}
            <div className="k-reveal relative overflow-hidden rounded-[24px] border border-[var(--k-line)] bg-[var(--k-card)] p-6">
              <SteamMotif className="pointer-events-none absolute -right-4 -top-4 h-24 w-auto opacity-15" />
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[var(--k-line2)] bg-[var(--k-bg2)]">
                  <Image
                    src="/pet/poses/you-can-do-it-pose.webp"
                    alt="Pet encouraging pose"
                    width={80}
                    height={80}
                    className="h-full w-full object-contain p-1"
                  />
                </div>
                <div>
                  <span className="text-[12px] font-medium uppercase tracking-wider text-[var(--k-accent2)]">Custom Poses</span>
                  <h4 className="text-[16px] font-semibold text-[var(--k-ink)]">Expressive Companion Poses</h4>
                  <p className="mt-1 text-[13px] text-[var(--k-muted)]">
                    Built-in artwork triggers during milestone achievements and encouraging breaks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Speech Bubbles & Quote System */}
        <div className="k-reveal mt-12 rounded-[24px] border border-[var(--k-line)] bg-[var(--k-card)] p-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--k-line2)] bg-[var(--k-bg2)] px-3 py-1 text-[12.5px] font-medium text-[var(--k-accent2)]">
                <ChatTeardropText size={14} weight="bold" />
                PetSignal.quote &amp; quoteKind
              </div>
              <h3 className="mt-4 text-[22px] font-semibold tracking-[-0.02em] text-[var(--k-ink)]">
                Contextual Speech Bubbles
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--k-muted)]">
                The pet communicates status, break reminders, and task prompts using floating speech bubbles styled by quote kind.
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                {QUOTES.map((q) => {
                  const isSelected = q.kind === activeQuote.kind;
                  return (
                    <button
                      key={q.kind}
                      type="button"
                      onClick={() => setActiveQuote(q)}
                      className={`k-press flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                        isSelected
                          ? "border-[var(--k-accent)] bg-[var(--k-bg2)] shadow-[0_0_12px_-3px_rgba(0,102,255,0.25)]"
                          : "border-[var(--k-line)] bg-[var(--k-card2)] hover:border-[var(--k-line2)]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--k-ink)]">
                          <span>{q.label}</span>
                          <span className="k-mono text-[11px] font-normal text-[var(--k-faint)]">
                            (quoteKind: &quot;{q.kind}&quot;)
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] text-[var(--k-muted)]">{q.detail}</p>
                      </div>
                      {isSelected && <Check size={16} className="text-[var(--k-accent2)]" weight="bold" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Quote Bubble Simulation */}
            <div className="relative flex min-h-[260px] items-center justify-center rounded-[20px] border border-[var(--k-line2)] bg-[var(--k-bg2)] p-8 lg:col-span-7">
              <div className="relative flex flex-col items-center">
                {/* Speech Bubble */}
                <div className="relative mb-4 w-full max-w-[340px] rounded-2xl border border-[var(--k-line2)] bg-[var(--k-card)] p-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[var(--k-line)] pb-2 text-[12px] font-medium text-[var(--k-accent2)]">
                    <span>Flowmate Pet</span>
                    <span className="k-mono uppercase text-[10.5px] text-[var(--k-faint)]">{activeQuote.kind}</span>
                  </div>
                  <p className="mt-2 text-[14.5px] font-medium leading-normal text-[var(--k-ink)]">
                    &quot;{activeQuote.text}&quot;
                  </p>
                  {/* Tail */}
                  <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-r border-b border-[var(--k-line2)] bg-[var(--k-card)]" />
                </div>

                {/* Companion Sprite */}
                <LandingPet
                  state={activeQuote.kind === "break" ? "waiting" : "reading"}
                  interactive={false}
                  loop={true}
                  scale={0.65}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PetShowcase;
