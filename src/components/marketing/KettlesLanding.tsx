"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HeroVisuals } from "@/components/marketing/MockComponents";
import { WorkflowPreview } from "@/components/marketing/ProductSections";
import { LandingPet } from "@/components/marketing/LandingPet";
import { PetShowcase } from "@/components/marketing/PetShowcase";
import {
  FocusRingArt,
  HeroBackdrop,
  SectionDivider,
  SteamMotif,
  TaskStackArt,
} from "@/components/marketing/art";
import { BeamsBackground } from "@/components/ui/beams-background";
import DisplayCards from "@/components/ui/display-cards";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowsClockwise,
  CalendarBlank,
  Check,
  Coins,
  EyeSlash,
  Fire,
  Globe,
  Lock,
  LockKey,
  Plus,
  SealCheck,
  ShieldCheck,
  User,
  WarningOctagon,
  X,
  DownloadSimple,
} from "@phosphor-icons/react";
import "./landing.css";

/* ============================================================================
   Kettles landing — full Tailwind rebuild from the Claude Design handoff.
   Dark, flat, single electric-blue accent (brand-locked). Asymmetric layouts,
   bento with perpetual CSS micro-loops, scroll choreography via one mount
   effect (CSS + tiny JS only, no animation library). Tokens live in landing.css
   under .kettles so the app theme is untouched.
   ========================================================================== */

const DOT: Record<string, string> = {
  c1: "var(--k-c1)",
  c2: "var(--k-c2)",
  c3: "var(--k-c3)",
  c4: "var(--k-c4)",
  c5: "var(--k-c5)",
};

// ----- kettle mascot -------------------------------------------------------
function Kettle({
  size = 96,
  tone = "steam",
  steam = true,
  lost = false,
}: {
  size?: number;
  tone?: "steam" | "accent";
  steam?: boolean;
  lost?: boolean;
}) {
  const body = tone === "accent" ? "#0066ff" : "#85c2ff";
  const spout = tone === "accent" ? "#5b5bf5" : "#3385ff";
  return (
    <div className={`relative inline-flex flex-col items-center ${lost ? "k-lost grayscale-[.55] brightness-90" : ""}`}>
      {lost && (
        <span className="k-qmark absolute -right-1.5 -top-1.5 text-[26px] font-bold text-[var(--k-accent2)]">?</span>
      )}
      {steam && !lost && (
        <svg className="k-steam -mb-1.5" width={size * 0.42} height={size * 0.38} viewBox="0 0 44 40" fill="none" aria-hidden>
          <path className="s1" d="M13 38 C9 29 18 24 13 15 C10 8 13 3 13 3" stroke="#85c2ff" strokeWidth="2.6" strokeLinecap="round" />
          <path className="s2" d="M24 38 C29 29 20 24 24 15 C28 8 24 3 24 3" stroke="#85c2ff" strokeWidth="2.6" strokeLinecap="round" />
          <path className="s3" d="M34 38 C30 30 38 24 34 16 C31 9 34 4 34 4" stroke="#85c2ff" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      )}
      <svg className="k-pot" width={size} height={size} viewBox="22 17 85 86" fill="none" aria-hidden>
        <rect fill={body} x="40.28" y="8.04" width="20.92" height="48.34" transform="translate(82.95 -18.53) rotate(90)" />
        <rect fill={body} x="40.28" y="49.87" width="20.92" height="48.34" transform="translate(124.78 23.31) rotate(90)" />
        <rect fill={body} x="43.95" y="67.12" width="13.57" height="48.34" transform="translate(142.03 40.56) rotate(90)" />
        <polygon fill={spout} points="26.93 63.59 53.62 42.67 101.96 42.67 101.96 63.59 26.93 63.59" />
      </svg>
    </div>
  );
}

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 384.43 119.83" className={className} role="img" aria-label="Kettles">
      <g>
        <rect fill="var(--k-steam)" x="48.83" y="16.27" width="17.77" height="41.08" transform="translate(94.53 -20.91) rotate(90)" />
        <rect fill="var(--k-steam)" x="48.83" y="51.82" width="17.77" height="41.08" transform="translate(130.08 14.64) rotate(90)" />
        <rect fill="var(--k-steam)" x="51.95" y="66.48" width="11.53" height="41.08" transform="translate(144.74 29.3) rotate(90)" />
        <polygon fill="var(--k-accent2)" points="37.49 63.48 60.17 45.7 101.25 45.7 101.25 63.48 37.49 63.48" />
      </g>
      <g fill="currentColor">
        <path d="M151.04,55.64l17.37-20.01h-15.11l-15.77,18.56v-18.56h-12.86v46.38h12.86v-12.05l4.64-5.17h.13l11.26,17.22h15.77l-18.29-26.37Z" />
        <path d="M200.67,68.96v-.63c0-2.69-.22-4.96-.66-6.78-2.54-9.63-8.47-14.45-17.76-14.45-5.21.09-9.59,1.85-13.11,5.31-3.54,3.45-5.3,7.74-5.3,12.83,0,4.4,1.67,8.46,5.04,12.19,3.35,3.71,8.16,5.58,14.43,5.58,6.74,0,12.3-3.86,16.71-11.6v-.13h-11.94c-1.41,1.76-2.89,2.66-4.43,2.66h-.47c-1.16,0-2.41-.35-3.7-1.03-1.39-.69-2.45-1.97-3.19-3.82v-.13h24.39ZM176.16,61.13c.73-2.69,2.89-4.04,6.49-4.04,1.26,0,2.5.31,3.71.92,1.32,1.09,1.98,2.1,1.98,3.02v.09h-12.19Z" />
        <path d="M226.51,57.56v-9.35h-9.91v-12.26h-13.24v12.26h-3.35v9.35h3.35v6.43c0,8.19,2.83,13.67,8.52,16.43,3.08,1.06,6.18,1.59,9.26,1.59h5.37v-9.1c-4.89-.25-7.69-.9-8.46-1.97-.97-1.34-1.45-2.77-1.45-4.3v-5.21l-5.48-3.86h15.39Z" />
        <path d="M254.73,48.21h-9.9v-12.26h-13.26v12.26h-3.35v9.35h3.35v6.43c0,8.19,2.83,13.67,8.52,16.43,3.1,1.06,6.18,1.59,9.28,1.59h5.36v-9.1c-4.87-.25-7.69-.9-8.44-1.97-.97-1.34-1.45-2.77-1.45-4.3v-5.24l-5.45-3.83h15.34v-9.35Z" />
        <path d="M258.05,35.63v46.38h13.26v-46.38h-13.26Z" />
        <path d="M310.33,68.96v-.63c0-2.69-.22-4.96-.66-6.78-2.54-9.63-8.46-14.45-17.76-14.45-5.21.09-9.59,1.85-13.11,5.31-3.54,3.45-5.3,7.74-5.3,12.83,0,4.4,1.67,8.46,5.04,12.19,3.35,3.71,8.16,5.58,14.45,5.58,6.72,0,12.3-3.86,16.69-11.6v-.13h-11.92c-1.42,1.76-2.91,2.66-4.45,2.66h-.46c-1.17,0-2.41-.35-3.71-1.03-1.39-.69-2.45-1.97-3.19-3.82v-.13h24.39ZM285.81,61.13c.73-2.69,2.89-4.04,6.49-4.04,1.26,0,2.5.31,3.71.92,1.32,1.09,2,2.1,2,3.02v.09h-12.2Z" />
        <path d="M339.25,64.71c-1.63-1.5-4.96-2.94-10.01-4.3-3.52-.78-5.3-1.53-5.3-2.26.25-1.15,1.04-1.72,2.39-1.72h.82c1.48,0,3.3.31,5.48.92l4.54,1.26c2.89-5.08,4.33-7.74,4.33-7.96-4.92-2.64-9.76-3.96-14.53-3.96h-1.56c-.92,0-2.08.09-3.48.26-7.27,1.69-10.91,5.53-10.91,11.52,0,1.81.47,3.54,1.39,5.17,1.54,2.48,4.89,4.39,10.01,5.77,4.65.88,6.99,1.94,6.99,3.17,0,.88-.98,1.34-2.95,1.34h-.82c-3.79,0-7.55-1-11.28-2.99h-.13c-.13.03-1.76,2.5-4.9,7.43v.13c5.21,3.45,10.95,5.17,17.19,5.17h1c1,0,2.3-.09,3.91-.26,7.27-1.53,10.91-5.37,10.91-11.52,0-2.98-1.03-5.37-3.08-7.16Z" />
      </g>
    </svg>
  );
}

// ----- shared atoms --------------------------------------------------------
function Eyebrow(_props: { children: React.ReactNode }) {
  return null;
}

function PrimaryBtn({ href, children, magnet = false, big = false, solid = false, id }: { href: string; children: React.ReactNode; magnet?: boolean; big?: boolean; solid?: boolean; id?: string }) {
  if (solid) {
    return (
      <Link
        id={id}
        href={href}
        data-magnet={magnet ? "" : undefined}
        className={`k-press ${magnet ? "k-magnet" : ""} group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--k-accent)] font-semibold text-white shadow-[0_14px_30px_-14px_rgba(0,102,255,0.55)] hover:bg-[var(--k-accent-h)] transition-all duration-200 whitespace-nowrap shrink-0 ${big ? "px-7 py-3.5 text-[16px]" : "px-5 py-2.5 text-[14px]"}`}
      >
        <span>{children}</span>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform duration-200 group-hover:translate-x-1 shrink-0 ${big ? "h-4.5 w-4.5" : "h-4 w-4"}`}>
          <path d="M13.75 8.125L17.5 11.875L13.75 15.625" />
          <path d="M2.5 4.375C2.5 6.36412 3.29018 8.27178 4.6967 9.6783C6.10322 11.0848 8.01088 11.875 10 11.875H17.5" />
        </svg>
      </Link>
    );
  }
  return (
    <Link
      id={id}
      href={href}
      data-magnet={magnet ? "" : undefined}
      className={`k-press ${magnet ? "k-magnet" : ""} group inline-flex items-center justify-center gap-1.5 font-semibold text-[var(--k-accent2)] hover:text-[var(--k-accent)] transition-all duration-200 whitespace-nowrap shrink-0 ${big ? "text-[18px] py-1" : "text-[14.5px] py-1"}`}
    >
      <span>{children}</span>
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transform transition-transform duration-200 group-hover:translate-x-1 shrink-0 ${big ? "h-5 w-5" : "h-4 w-4"}`}
      >
        <path d="M13.75 8.125L17.5 11.875L13.75 15.625" />
        <path d="M2.5 4.375C2.5 6.36412 3.29018 8.27178 4.6967 9.6783C6.10322 11.0848 8.01088 11.875 10 11.875H17.5" />
      </svg>
    </Link>
  );
}

// ----- email capture (interaction states) ----------------------------------
function EmailCapture() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "loading" | "done">("idle");
  const [msg, setMsg] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "loading") return;
    const trimmed = email.trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!ok) {
      setState("error");
      setMsg("That email doesn't look right yet.");
      return;
    }
    setState("loading");
    setMsg("");
    // Hand the captured email to the real signup flow.
    router.push(`/auth?email=${encodeURIComponent(trimmed)}`);
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="mx-auto flex max-w-[440px] items-center gap-3 rounded-2xl border border-[color:rgba(16,185,129,0.28)] bg-[color:rgba(16,185,129,0.1)] px-5 py-4 text-left">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--k-ok)] text-white">
          <Check size={18} weight="bold" />
        </span>
        <div>
          <p className="text-[14px] font-medium text-[var(--k-ink)]">Kettle&apos;s warming up.</p>
          <p className="text-[13px] text-[var(--k-muted)]">
            Continue in the app to{" "}
            <Link href={`/auth?email=${encodeURIComponent(email.trim())}`} className="text-[var(--k-accent2)] underline-offset-2 hover:underline">
              finish signing up
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto flex w-full max-w-[460px] flex-col gap-2 text-left">
      <div className="flex flex-col gap-1.5 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="cta-email" className="sr-only">
            Work email
          </label>
          <input
            id="cta-email"
            type="email"
            inputMode="email"
            placeholder="you@studio.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state === "error") setState("idle");
            }}
            aria-invalid={state === "error"}
            className={`h-12 w-full rounded-full border bg-[var(--k-card2)] px-4 text-[15px] text-[var(--k-ink)] outline-none transition placeholder:text-[var(--k-faint)] ${
              state === "error" ? "border-[var(--k-c3)]" : "border-[var(--k-line2)] focus:border-[var(--k-accent2)]"
            }`}
          />
        </div>
        <button
          type="submit"
          className="k-press inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--k-accent)] px-6 text-[15px] font-medium text-white shadow-[0_14px_30px_-14px_rgba(0,102,255,0.55)] hover:bg-[var(--k-accent-h)] hover:-translate-y-0.5 transition-transform"
        >
          {state === "loading" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <>
              Start free <ArrowRight size={16} weight="bold" />
            </>
          )}
        </button>
      </div>
      <p className={`min-h-[18px] px-1 text-[13px] ${state === "error" ? "text-[var(--k-c3)]" : "text-[var(--k-faint)]"}`}>
        {state === "error" ? msg : "Free to start · no card required."}
      </p>
    </form>
  );
}

// ===========================================================================
export function KettlesLanding() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = matchMedia("(pointer:fine)").matches;
    const $ = <T extends Element = Element>(s: string) => root.querySelector(s) as T | null;
    const $$ = <T extends Element = Element>(s: string) => Array.from(root.querySelectorAll(s)) as T[];

    const cleanups: Array<() => void> = [];
    const on = (t: Window | Element, e: string, fn: EventListener, o?: AddEventListenerOptions) => {
      t.addEventListener(e, fn, o);
      cleanups.push(() => t.removeEventListener(e, fn, o));
    };
    const timers: number[] = [];
    const ivl = (fn: () => void, ms: number) => {
      const id = window.setInterval(fn, ms);
      timers.push(id);
      return id;
    };
    const observers: IntersectionObserver[] = [];

    // reveals
    $$(".k-stagger").forEach((g) =>
      Array.from(g.children).forEach((c, i) => (c as HTMLElement).style.setProperty("--i", String(i)))
    );
    const revs = $$(".k-reveal, .k-stagger");
    if (reduce) revs.forEach((e) => e.classList.add("k-in"));
    else {
      const ro = new IntersectionObserver(
        (ents) =>
          ents.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("k-in");
              ro.unobserve(e.target);
            }
          }),
        { threshold: 0.14, rootMargin: "0px 0px -7% 0px" }
      );
      observers.push(ro);
      revs.forEach((e) => ro.observe(e));
    }

    const once = (el: Element | null, cb: () => void, th = 0.4) => {
      if (!el) return;
      if (reduce) return cb();
      const o = new IntersectionObserver(
        (e) =>
          e.forEach((x) => {
            if (x.isIntersecting) {
              cb();
              o.unobserve(x.target);
            }
          }),
        { threshold: th }
      );
      observers.push(o);
      o.observe(el);
    };

    // nav hide / shadow
    const nav = $("#k-nav");
    let lastY = 0;
    const navScroll = () => {
      const y = scrollY;
      if (!nav) return;
      nav.classList.toggle("k-nav-solid", y > 16);
      if (y > 420 && y > lastY + 4) nav.classList.add("k-nav-hide");
      else if (y < lastY - 4 || y < 420) nav.classList.remove("k-nav-hide");
      lastY = y;
    };
    on(window, "scroll", navScroll, { passive: true });
    navScroll();

    // count-ups
    const countUp = (node: HTMLElement) => {
      const t = parseFloat(node.dataset.count || "0");
      const dec = parseInt(node.dataset.decimals || "0", 10);
      if (reduce) return (node.textContent = t.toFixed(dec));
      const s = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - s) / 1300);
        node.textContent = (t * (1 - Math.pow(1 - p, 3))).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick);
        else node.textContent = t.toFixed(dec);
      };
      requestAnimationFrame(tick);
    };
    $$<HTMLElement>("[data-count]").forEach((n) => once(n, () => countUp(n), 0.6));

    // hero live timer
    const heroTimer = $("#k-heroTimer");
    const heroMeter = $<HTMLElement>("#k-heroMeter");
    if (heroTimer) {
      let s = 848;
      const paint = () => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        heroTimer.textContent = `${m < 10 ? "0" : ""}${m}:${sec < 10 ? "0" : ""}${sec}`;
        if (heroMeter) heroMeter.style.width = Math.min(100, (s / 1500) * 100) + "%";
      };
      paint();
      if (!reduce) ivl(() => (s++, paint()), 1000);
    }

    // benefit countdown
    const bt = $("#k-benefitTimer");
    if (bt && !reduce)
      once(
        bt,
        () => {
          let s = 24 * 60;
          ivl(() => {
            s = s <= 0 ? 24 * 60 : s - 1;
            const m = Math.floor(s / 60);
            const sec = s % 60;
            bt.textContent = `${m < 10 ? "0" : ""}${m}:${sec < 10 ? "0" : ""}${sec}`;
          }, 1000);
        },
        0.5
      );

    // report bars + count
    once($("#k-report"), () => {
      $$<HTMLElement>("#k-report [data-w]").forEach((b) => requestAnimationFrame(() => (b.style.width = b.dataset.w || "")));
    }, 0.3);
    once($("#k-barset"), () => {
      $$<HTMLElement>("#k-barset [data-h]").forEach((b) => (b.style.height = b.dataset.h || ""));
    }, 0.4);

    // kanban auto-glide
    const kanban = $("#k-kanban");
    if (kanban && !reduce)
      once(
        kanban,
        () => {
          const card = kanban.querySelector("[data-card]");
          const cols = Array.from(kanban.querySelectorAll("[data-col]"));
          let i = 0;
          ivl(() => {
            i = (i + 1) % cols.length;
            if (!card) return;
            card.classList.add("ring-1", "ring-[var(--k-tint2)]", "scale-[1.03]");
            cols[i].appendChild(card);
            window.setTimeout(() => card.classList.remove("ring-1", "ring-[var(--k-tint2)]", "scale-[1.03]"), 480);
          }, 2200);
        },
        0.3
      );

    // workflow stepper
    const flow = $("#k-flow");
    const fill = $<HTMLElement>("#k-railFill");
    const steps = $$("[data-step]");
    if (flow) {
      if (reduce) {
        steps.forEach((s) => s.classList.add("k-step-on"));
        if (fill) fill.style.width = "100%";
      } else {
        let t = false;
        const upd = () => {
          const r = flow.getBoundingClientRect();
          let p = (innerHeight * 0.7 - r.top) / (r.height * 0.7);
          p = Math.max(0, Math.min(1, p));
          const active = Math.min(steps.length, Math.floor(p * steps.length + 0.15));
          steps.forEach((s, i) => s.classList.toggle("k-step-on", i < Math.max(1, active)));
          if (fill) fill.style.width = p * 100 + "%";
          t = false;
        };
        on(window, "scroll", () => {
          if (!t) {
            t = true;
            requestAnimationFrame(upd);
          }
        }, { passive: true });
        upd();
      }
    }


    // parallax benefit visuals
    if (!reduce) {
      const px = $$("[data-parallax]");
      let t = false;
      const fx = () => {
        px.forEach((el) => {
          const r = el.getBoundingClientRect();
          const off = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
          const inner = el.querySelector("[data-parallax-inner]") as HTMLElement | null;
          if (inner) inner.style.transform = `translateY(${off * -20}px)`;
        });
        t = false;
      };
      on(window, "scroll", () => {
        if (!t) {
          t = true;
          requestAnimationFrame(fx);
        }
      }, { passive: true });
      fx();
    }

    // magnetic buttons
    if (fine && !reduce) {
      $$<HTMLElement>("[data-magnet]").forEach((b) => {
        const move = (ev: Event) => {
          const e = ev as MouseEvent;
          const r = b.getBoundingClientRect();
          b.style.setProperty("--mx", String((e.clientX - (r.left + r.width / 2)) * 0.25));
          b.style.setProperty("--my", String((e.clientY - (r.top + r.height / 2)) * 0.3));
        };
        const leave = () => {
          b.style.setProperty("--mx", "0");
          b.style.setProperty("--my", "0");
        };
        on(b, "mousemove", move);
        on(b, "mouseleave", leave);
      });
    }

    // final steam intensify near CTA
    const finalSteam = $("#k-finalSteam");
    const finalCta = $("#k-finalCta");
    const finalSec = $("#download");
    if (finalSteam && finalCta && finalSec && fine && !reduce) {
      const paths = Array.from(finalSteam.querySelectorAll("path")) as SVGPathElement[];
      on(finalSec, "mousemove", ((ev: Event) => {
        const e = ev as MouseEvent;
        const r = finalCta.getBoundingClientRect();
        const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
        const k = Math.max(0, 1 - d / 360);
        paths.forEach((p) => (p.style.strokeWidth = 2.8 + k * 1.8 + "px"));
      }) as EventListener);
      on(finalSec, "mouseleave", () => paths.forEach((p) => (p.style.strokeWidth = "")));
    }

    // Cinematic footer scroll zoom / clip effect
    const cfPortal = $("#k-cinematic-portal") as HTMLElement | null;
    const cfImg = $("#k-cinematic-image") as HTMLElement | null;
    if (cfPortal && cfImg && !reduce) {
      const handleCfScroll = () => {
        const rect = cfPortal.getBoundingClientRect();
        const winH = window.innerHeight;
        
        // Budget-aware scroll reveal since it's the absolute end element
        const docH = document.documentElement.scrollHeight;
        const scrollY = window.scrollY;
        const maxScroll = docH - winH;
        const portalTopFromBottom = winH - rect.top;
        const scrollRemaining = maxScroll - scrollY;

        let progress = 0;
        if (portalTopFromBottom > 0) {
          if (scrollRemaining <= 1) {
            progress = 1;
          } else {
            progress = portalTopFromBottom / (portalTopFromBottom + scrollRemaining);
            progress = Math.max(0, Math.min(1, progress));
          }
        }

        // Only clip/animate vertically, leave width 100%
        const insetY = Math.max(0, 15 - progress * 15); // 15% down to exactly 0%
        const imgScale = 1.15 - progress * 0.15;         // 1.15 down to exactly 1.0

        cfPortal.style.clipPath = `inset(0% 0% ${insetY}% 0%)`;
        cfImg.style.transform = `scale(${imgScale})`;
      };
      on(window, "scroll", handleCfScroll, { passive: true });
      handleCfScroll();
    }

    // kinetic scroll stream animation on the big "KETTLES" text in the footer
    const footerSec = $("#k-textured-footer") as HTMLElement | null;
    const footerText = $("#k-footer-big-text") as HTMLElement | null;
    if (footerSec && footerText && !reduce) {
      const letters = Array.from(footerText.children) as HTMLElement[];
      const handleFooterTextScroll = () => {
        const rect = footerSec.getBoundingClientRect();
        const winH = window.innerHeight;
        
        // Calculate visibility ratio
        const visibleAmt = winH - rect.top;
        if (visibleAmt > 0) {
          const totalDistance = rect.height + 150;
          const progress = Math.max(0, Math.min(1, visibleAmt / totalDistance));
          
          letters.forEach((letter, i) => {
            const invProgress = 1 - progress;
            // horizontal offset: staggering left-to-right drift
            const tx = invProgress * (80 + i * 20);
            // movie trailer effect: scale(1.08) -> scale(1.0)
            const scale = 1.0 + invProgress * 0.08;
            
            letter.style.transform = `translate3d(${tx}px, 0, 0) scale(${scale})`;
            letter.style.opacity = String(0.1 + progress * 0.9);
            letter.style.filter = `blur(${invProgress * 12}px)`;
          });
        }
      };
      on(window, "scroll", handleFooterTextScroll, { passive: true });
      handleFooterTextScroll();
    }

    return () => {
      cleanups.forEach((f) => f());
      timers.forEach((id) => clearInterval(id));
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  const faqs = [
    ["Is it task-linked or just a stopwatch?", "Task-linked. You pick a task first, and the time you brew is sealed to it. That's what makes your weekly report accurate enough to invoice without second-guessing."],
    ["Does the timer survive a tab close?", "Yes. Brews are saved to the cloud, so closing a tab, refreshing, or switching devices doesn't lose a second. Your timer keeps running where it left off."],
    ["Which platforms are supported?", "Kettles runs in the browser, plus native macOS and Windows apps with a floating always-on-top mini-timer. A browser extension keeps everything in sync."],
    ["Can I export for invoicing?", "Every weekly report exports to PDF or CSV in one click, with hours broken down per client, ready to attach to an invoice or send straight to a client."],
    ["Is my data private?", "Completely. Kettles never takes screenshots, logs keystrokes, or scores your productivity. It records the hours you choose to brew, and nothing else."],
  ];

  return (
    <BeamsBackground ref={rootRef} className="kettles min-h-[100dvh] bg-transparent" intensity="strong">
      {/* ===================== NAV ===================== */}
      <header
        id="k-nav"
        className="fixed top-0 left-1/2 -translate-x-1/2 z-50 transition-transform duration-300 ease-[var(--k-ease)] [&.k-nav-hide]:-translate-y-[110%] w-full md:w-auto px-4 md:px-0 pt-0 md:pt-0"
      >
        {/* Nav pill stays dark in both themes — a deliberate high-contrast
            floating bar over the light page (see design ref). */}
        <div className="relative mx-auto bg-[var(--k-bg2)] text-white h-[58px] rounded-b-2xl md:rounded-b-[24px] flex items-center justify-between px-6 gap-8 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.45)] border-x border-b border-white/15 md:min-w-[720px] lg:min-w-[840px]">
          {/* Left inverse corner */}
          <div
            className="hidden md:block w-6 h-6 absolute top-0 right-full pointer-events-none"
            style={{ background: "radial-gradient(circle at left bottom, transparent 23px, rgba(255,255,255,0.15) 23px, rgba(255,255,255,0.15) 24px, var(--k-bg2) 24px)" }}
          />

          {/* Right inverse corner */}
          <div
            className="hidden md:block w-6 h-6 absolute top-0 left-full pointer-events-none"
            style={{ background: "radial-gradient(circle at right bottom, transparent 23px, rgba(255,255,255,0.15) 23px, rgba(255,255,255,0.15) 24px, var(--k-bg2) 24px)" }}
          />

          {/* Logo / Link */}
          <Link href="#top" aria-label="Kettles home" className="group inline-flex items-center">
            <Wordmark className="h-[42px] w-auto text-white" />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-1.5 md:flex" aria-label="Primary">
            {[
              ["Features", "#features"],
              ["How it works", "#how"],
              ["Reviews", "#reviews"],
              ["Pricing", "#pricing"],
              ["FAQ", "#faq"],
            ].map(([l, h]) => (
              <Link 
                key={h} 
                href={h} 
                className="px-3 py-1.5 text-[14px] font-medium text-neutral-400 hover:text-white transition-colors duration-200 rounded-md hover:bg-white/5 active:scale-95"
              >
                {l}
              </Link>
            ))}
          </nav>

          {/* Actions / Buttons */}
          <div className="flex items-center gap-4">
            <Link
              href="/auth"
              className="hidden text-[14px] font-medium text-neutral-400 hover:text-white transition-colors sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/auth"
              className="bg-white text-black font-semibold rounded-full px-4 py-2 text-[13px] flex items-center gap-1.5 hover:bg-neutral-100 active:scale-95 transition-all shadow-sm shrink-0"
            >
              <span>Use now</span>
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[15px] w-[15px] transition-transform duration-200 group-hover:translate-x-1 shrink-0 -translate-y-[0.5px]"
              >
                <path d="M13.75 8.125L17.5 11.875L13.75 15.625" />
                <path d="M2.5 4.375C2.5 6.36412 3.29018 8.27178 4.6967 9.6783C6.10322 11.0848 8.01088 11.875 10 11.875H17.5" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ===================== HERO (Centered layout + flanking visual cards) ===================== */}
        <section className="relative isolate z-10 mx-auto flex min-h-[100dvh] flex-col items-center justify-between px-6 pb-0 pt-[120px] text-center w-full max-w-[1240px] overflow-x-clip">
          <HeroBackdrop className="k-hero-backdrop pointer-events-none absolute inset-y-0 left-1/2 z-0 h-full w-screen max-w-[100vw] -translate-x-1/2" />
          {/* Text + CTA group (pinned toward the top, vertically centered in the remaining space) */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
            <h1 className="k-reveal text-[clamp(44px,6.5vw,76px)] font-bold leading-[1.01] tracking-[-0.04em] max-w-[20ch]">
              Time tracking that does <br className="hidden sm:inline" />
              the remembering for you.
            </h1>
            <p className="k-reveal mt-6 max-w-[50ch] text-[clamp(17px,1.5vw,20px)] leading-[1.5] text-[var(--k-muted)]">
              Pick a task, hit start. Every minute locks to the work. <br className="hidden sm:block" />
              Your weekly report stays accurate and invoice-ready, automatically.
            </p>
            <div className="k-reveal mt-8 flex flex-col items-center gap-3">
              <PrimaryBtn href="/auth" big magnet>
                Start free
              </PrimaryBtn>
              <span className="text-[13px] text-[var(--k-faint)]">No card required · free to start</span>
            </div>
          </div>

          {/* Visual flanking cards — anchored to the hero bottom so the next
              section's overlap stays consistent across viewport heights. */}
          <div className="k-reveal relative z-10 mt-12 flex w-full justify-center">
            <HeroVisuals />
            <div className="pointer-events-none absolute bottom-4 right-[clamp(0rem,4vw,3.5rem)] z-20">
              <SteamMotif className="k-hero-steam pointer-events-none absolute -right-5 bottom-12 z-0 h-24 w-auto" />
              <LandingPet scale={0.58} className="pointer-events-auto relative z-10" />
            </div>
          </div>
        </section>




        {/* ===================== HOW IT WORKS (Bento Grid) ===================== */}
        <section id="how" className="relative z-20 -mt-10 py-[120px] bg-[var(--k-bg)] border-t border-[var(--k-line)]">
          <div className="mx-auto max-w-[1180px] px-6">
            <div className="k-reveal text-left mb-12">
              <h2 className="text-[clamp(32px,3.8vw,48px)] font-bold tracking-[-0.03em] text-[var(--k-ink)]">Three steps. One honest record.</h2>
              <p className="mt-4 text-[17px] leading-relaxed text-[var(--k-muted)] max-w-[56ch]">
                No stopwatch guesswork. Pick the task, let the kettle boil, and the time locks itself to the work.
              </p>
            </div>
            
            <div className="k-reveal grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Pick a task */}
              <div className="group relative rounded-3xl border border-[var(--k-hairline)] bg-[var(--k-surface-soft)] overflow-hidden hover:border-[var(--k-hairline2)] transition-colors p-1">
                <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-gradient-to-br from-[#3385ff]/20 via-[#0066ff]/10 to-transparent blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative h-full flex flex-col justify-between bg-[var(--k-surface)]/60 rounded-[22px] p-6 backdrop-blur-md border border-[var(--k-hairline)] min-h-[340px]">
                  <TaskStackArt className="k-step-art pointer-events-none absolute -right-10 -top-7 z-0 w-[min(16rem,78%)]" />
                  <div className="relative z-10 h-40 w-full flex items-center justify-center">
                    {/* Floating Cards Graphic */}
                    <div className="relative w-40 h-32">
                      <div className="absolute top-4 left-0 w-24 h-28 rounded-xl border border-white/10 bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] transform -rotate-6 shadow-2xl transition-transform duration-500 group-hover:-rotate-12 group-hover:-translate-x-2 flex flex-col gap-2 p-3">
                        <div className="w-10 h-1 rounded-full bg-white/20" />
                        <div className="w-16 h-1 rounded-full bg-white/10" />
                        <div className="w-12 h-1 rounded-full bg-white/10" />
                      </div>
                      <div className="absolute top-0 left-8 w-28 h-32 rounded-xl border border-white/10 bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] shadow-2xl transition-transform duration-500 group-hover:translate-x-2 group-hover:-translate-y-2 flex flex-col items-center p-3 relative overflow-hidden">
                        <div className="w-16 h-1.5 rounded-full bg-white/20 mb-2 mt-2 self-start" />
                        <div className="w-full flex-1 border border-white/10 rounded-lg mt-1 relative overflow-hidden flex items-end">
                           <svg viewBox="0 0 100 50" className="w-full h-full opacity-30 text-white" preserveAspectRatio="none">
                             <path d="M0,50 Q25,20 50,40 T100,10 L100,50 Z" fill="currentColor"/>
                           </svg>
                        </div>
                        {/* Glowing Planet */}
                        <div className="absolute -bottom-2 -right-2 w-16 h-16 rounded-full bg-gradient-to-tr from-[#0066ff] to-[#3385ff] shadow-[0_0_30px_rgba(0,102,255,0.6)] flex flex-col items-center justify-center overflow-hidden">
                          {/* Stripes on planet */}
                          <div className="w-full h-1.5 bg-white/20 transform rotate-12 mb-1.5" />
                          <div className="w-full h-1 bg-white/20 transform rotate-12" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col gap-2 relative z-10">
                    <h3 className="text-[20px] font-semibold text-[var(--k-ink)] tracking-[-0.02em]">Pick a task</h3>
                    <p className="text-[14.5px] text-[var(--k-muted)] leading-relaxed pr-6">Choose what you&apos;re working on. The timer attaches to that task, not a blank stopwatch.</p>
                  </div>
                </div>
              </div>

              {/* Card 2: The kettle boils */}
              <div className="group relative rounded-3xl border border-[var(--k-hairline)] bg-[var(--k-surface-soft)] overflow-hidden hover:border-[var(--k-hairline2)] transition-colors p-1">
                <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-gradient-to-br from-[#3385ff]/20 via-[#0066ff]/10 to-transparent blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative h-full flex flex-col justify-between bg-[var(--k-surface)]/60 rounded-[22px] p-6 backdrop-blur-md border border-[var(--k-hairline)] min-h-[340px]">
                  <FocusRingArt className="k-step-art pointer-events-none absolute -right-8 -top-7 z-0 w-[min(15rem,76%)]" />
                  <div className="relative z-10 h-40 w-full flex items-center justify-center">
                    {/* Clock Graphic */}
                    <div className="relative w-28 h-28 rounded-full border border-white/10 bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] shadow-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                      {/* Inner ring */}
                      <div className="absolute inset-2 rounded-full border border-white/5" />
                      
                      {/* Tick marks */}
                      <div className="absolute top-3 w-1 h-1.5 bg-white/20 rounded-full" />
                      <div className="absolute bottom-3 w-1 h-1.5 bg-white/20 rounded-full" />
                      <div className="absolute left-3 w-1.5 h-1 bg-white/20 rounded-full" />
                      <div className="absolute right-3 w-1.5 h-1 bg-white/20 rounded-full" />

                      {/* Hour hand */}
                      <div className="absolute inset-0 rotate-45 transition-transform duration-1000 ease-out group-hover:rotate-[405deg]">
                        <div className="absolute bottom-1/2 left-1/2 -translate-x-1/2 w-1.5 h-6 bg-white/30 rounded-full origin-bottom translate-y-[1px]" />
                      </div>

                      {/* Minute hand */}
                      <div className="absolute inset-0 transition-transform duration-[1500ms] ease-out group-hover:rotate-[1080deg]">
                        <div className="absolute bottom-1/2 left-1/2 -translate-x-1/2 w-1 h-10 bg-gradient-to-t from-[#0066ff] to-[#3385ff] shadow-[0_0_12px_rgba(51,133,255,0.6)] rounded-full origin-bottom translate-y-[1px]" />
                      </div>

                      {/* Center dot */}
                      <div className="w-2.5 h-2.5 rounded-full bg-[#0066ff] shadow-[0_0_10px_rgba(51,133,255,0.8)] z-10" />
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col gap-2 relative z-10">
                    <h3 className="text-[20px] font-semibold text-[var(--k-ink)] tracking-[-0.02em]">The timer runs</h3>
                    <p className="text-[14.5px] text-[var(--k-muted)] leading-relaxed pr-6">Watch your focus session count down. Close the app, switch devices. Your progress keeps ticking in the cloud.</p>
                  </div>
                </div>
              </div>

              {/* Card 3: Time locks to the task */}
              <div className="group relative rounded-3xl border border-[var(--k-hairline)] bg-[var(--k-surface-soft)] overflow-hidden hover:border-[var(--k-hairline2)] transition-colors p-1">
                <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-gradient-to-br from-[#3385ff]/20 via-[#0066ff]/10 to-transparent blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative h-full flex flex-col justify-between bg-[var(--k-surface)]/60 rounded-[22px] p-6 backdrop-blur-md border border-[var(--k-hairline)] min-h-[340px]">
                  
                  <div className="relative h-40 w-full flex items-center justify-center">
                    {/* Sleek Progress/Pill Graphic */}
                    <div className="relative w-48 h-16 rounded-full border border-white/10 bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] shadow-2xl backdrop-blur-md flex items-center px-3 transition-transform duration-500 group-hover:scale-105">
                      <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[#0066ff] to-[#3385ff] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,102,255,0.4)] overflow-hidden">
                        <Check size={16} weight="bold" className="text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.6)] absolute transition-all duration-300 group-hover:opacity-0 group-hover:scale-75" />
                        <Lock size={15} weight="bold" className="text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.6)] absolute opacity-0 scale-75 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100" />
                      </div>
                      <div className="ml-3 w-28 h-6 rounded-full bg-[#0a0a0a] border border-black shadow-inner flex items-center px-1">
                        <div className="h-4 w-2/3 bg-gradient-to-r from-[#0066ff] to-[#3385ff] rounded-full shadow-[0_0_10px_rgba(51,133,255,0.4)] transition-all duration-500 ease-out group-hover:w-[92%]" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col gap-2 relative z-10">
                    <h3 className="text-[20px] font-semibold text-[var(--k-ink)] tracking-[-0.02em]">Time locks to the task</h3>
                    <p className="text-[14.5px] text-[var(--k-muted)] leading-relaxed pr-6">When the brew is done, the minutes seal to the task. No guessing, no backfilling, no rounding up.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== PROBLEM (editorial, all cards legible) ===================== */}
        <section className="mx-auto max-w-[1180px] px-6 py-[120px]">
          <div className="grid w-full grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="k-reveal lg:col-span-5">
              <h2 className="text-[clamp(32px,3.8vw,48px)] font-bold leading-[1.05] tracking-[-0.03em]">
                Your logged hours don&apos;t match your real work.
              </h2>
              <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-[var(--k-muted)]">
                Guessed timesheets quietly cost you money and trust. Kettles fixes the leak at the source. No boxes, just an honest record.
              </p>
            </div>

            <div className="k-reveal flex min-h-[22rem] items-center justify-center lg:col-span-7 lg:justify-end lg:pr-2">
              <DisplayCards
                cards={[
                  {
                    icon: <Coins size={20} weight="bold" />,
                    title: "Underbilling",
                    description: "Forgotten minutes are unpaid minutes.",
                    accent: "var(--k-c3)",
                  },
                  {
                    icon: <WarningOctagon size={20} weight="bold" />,
                    title: "The distraction tax",
                    description: "A guessed timesheet is a story, not a record.",
                    accent: "var(--k-c5)",
                  },
                  {
                    icon: <X size={20} weight="bold" />,
                    title: "Broken self-trust",
                    description: "A log you don't trust is one you stop opening.",
                    accent: "var(--k-accent2)",
                  },
                ]}
              />
            </div>
          </div>
        </section>

        {/* ===================== FEATURES (4-levels Analytics Style) ===================== */}
        <section id="features" className="k-texture relative overflow-hidden border-y border-[var(--k-line)] bg-[var(--k-bg)] py-[120px]">
          <SectionDivider className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[clamp(3.5rem,8vw,7rem)] w-full opacity-60" />
          {/* concentric-ring backdrop */}
          <Image
            src="/images/bg-circle.png"
            alt=""
            aria-hidden
            width={1440}
            height={1440}
            priority={false}
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 w-[min(1650px,125vw)] max-w-none -translate-x-1/2 -translate-y-1/2 select-none opacity-80 [mask-image:radial-gradient(circle_at_center,#000_42%,transparent_78%)]"
          />
          <div className="relative z-10">
            <WorkflowPreview />
          </div>
        </section>

        {/* ===================== COMPANION (asymmetric focal + states) ===================== */}
        <section className="relative z-10 border-y border-[var(--k-line)] bg-[var(--k-bg2)] py-[120px]">
          <div className="mx-auto max-w-[1180px] px-6">
            <div className="k-reveal mx-auto max-w-[740px] text-center">
              <Eyebrow>The companion</Eyebrow>
              <h2 className="mt-5 text-[clamp(32px,3.8vw,48px)] font-bold tracking-[-0.03em]">You&apos;re not focusing alone.</h2>
              <p className="mx-auto mt-5 max-w-[56ch] text-[17px] leading-relaxed text-[var(--k-muted)]">
                Your kettle stays warm while you work, whistles when a brew is done, and wanders off when you go cold. Keep your streak. Keep the kettle on.
              </p>
            </div>
            <div className="mt-14 grid grid-cols-1 gap-[18px] lg:grid-cols-12">
              {/* focal */}
              <article className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-[var(--k-line)] bg-[var(--k-card)] p-10 lg:col-span-6 lg:row-span-2 lg:min-h-[420px]">
                <div className="flex flex-1 items-center justify-center py-6">
                  <Kettle size={140} />
                </div>
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--k-line2)] bg-[var(--k-bg2)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--k-ink2)]">Brewing</span>
                  <h3 className="mt-3 text-[22px] font-semibold tracking-[-0.02em]">Steaming along</h3>
                  <p className="mt-1.5 max-w-[40ch] text-[15px] text-[var(--k-muted)]">While you focus, it stays warm and whistles the moment the brew is done.</p>
                </div>
              </article>

              <CompanionState tone="idle" pill="Idle" title="Taking a breather" desc="On a break, it cools down quietly. No alarms, no nagging." />
              <CompanionState tone="lost" pill="Lost" title="Gone cold" desc="Go quiet too long and it wanders off. Start a brew and it comes right back." />
            </div>
          </div>
        </section>

        {/* ===================== DESKTOP PET OVERLAY SHOWCASE ===================== */}
        <PetShowcase />

        {/* ===================== TRUST BADGE STRIP (slim) ===================== */}
        <section id="security" className="relative z-10 border-y border-[var(--k-line)] bg-[var(--k-bg2)] py-16">
          <div className="mx-auto max-w-[1180px] px-6 text-center">
            <p className="k-reveal text-[15px] text-[var(--k-muted)]">
              <span className="font-semibold text-[var(--k-ink)]">No screenshots. No keystroke spying. No productivity scores.</span> Just an accurate record you own.
            </p>
            <div className="k-reveal mt-6 flex flex-wrap justify-center gap-3">
              {[[EyeSlash, "No screenshots"], [LockKey, "Encrypted in transit"], [ShieldCheck, "You own your data"], [SealCheck, "No productivity scores"]].map(([Ic, t]) => {
                const Icon = Ic as typeof SealCheck;
                return (
                  <span key={t as string} className="inline-flex items-center gap-2.5 rounded-full border border-[var(--k-line2)] bg-[var(--k-card)] px-4 py-2.5 text-[13.5px] font-medium text-[var(--k-ink2)]">
                    <Icon size={18} className="text-[var(--k-accent2)]" /> {t as string}
                  </span>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================== TESTIMONIALS (Bento Grid) & PRICING ===================== */}
        <section id="reviews" className="relative overflow-hidden border-y border-[var(--k-line)] py-[120px]">
          {/* no section bg — let the fixed beam backdrop show through (parallax) */}
          <div className="relative z-10 mx-auto max-w-[1180px] px-6 flex flex-col gap-6">
            <div className="k-reveal mx-auto max-w-[740px] text-center mb-10">
              <h2 className="text-[clamp(32px,3.8vw,48px)] font-bold tracking-[-0.035em] text-[var(--k-ink)]">People love using Kettles.</h2>
              <p className="mt-4 text-[17px] text-[var(--k-muted)] mx-auto leading-relaxed max-w-[56ch]">
                Built for freelancers and small teams who bill real hours, not guessed ones.
              </p>
            </div>

            <div className="k-reveal grid grid-cols-1 md:grid-cols-12 gap-6 w-full items-stretch">
              {/* Left Card: Quote */}
              <div className="md:col-span-7 group relative rounded-3xl border border-[var(--k-hairline)] bg-[var(--k-surface-soft)] overflow-hidden hover:border-[var(--k-hairline2)] transition-colors p-1 min-h-[440px]">
                <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-br from-[#3385ff]/10 via-[#0066ff]/5 to-transparent blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-tl from-[#3385ff]/10 via-[#0066ff]/5 to-transparent blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="relative h-full flex flex-col justify-between bg-[var(--k-surface)]/60 rounded-[22px] p-8 md:p-12 backdrop-blur-md border border-[var(--k-hairline)] shadow-2xl">
                  <div className="flex justify-center w-full relative z-10">
                    <div className="relative w-16 h-16 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] shadow-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-105 group-hover:-translate-y-1">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" aria-hidden>
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </div>
                  </div>

                  <div className="my-8 text-center relative z-10">
                    <p className="text-[22px] md:text-[26px] lg:text-[30px] font-semibold leading-snug tracking-tight text-[var(--k-ink)] max-w-[20ch] mx-auto">
                      &ldquo;Once you experience using Kettles to track your work, there is no going back.&rdquo;
                    </p>
                  </div>

                  <div className="flex justify-center relative z-10">
                    <div className="flex items-center gap-3 bg-[var(--k-surface-soft)] border border-[var(--k-hairline2)] px-4 py-2 rounded-full backdrop-blur-md transition-transform duration-300 group-hover:scale-105 group-hover:bg-[var(--k-tint)] group-hover:border-[var(--k-line3)]">
                      <div className="h-8 w-8 rounded-full bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] border border-white/10 flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm">
                        SS
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[13px] font-semibold text-[var(--k-ink)] leading-tight">Samreshan Sahani</span>
                        <span className="text-[11px] text-[var(--k-muted)] leading-none mt-0.5">Creative Director</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column — honest product highlights (no unbacked ratings) */}
              <div className="md:col-span-5 flex flex-col gap-6 justify-between">
                <div className="group relative rounded-3xl border border-[var(--k-hairline)] bg-[var(--k-surface-soft)] overflow-hidden hover:border-[var(--k-hairline2)] transition-colors p-1 flex-1 min-h-[208px]">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-gradient-to-br from-[#3385ff]/20 via-[#0066ff]/10 to-transparent blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <div className="relative h-full flex flex-col items-center justify-center bg-[var(--k-surface)]/60 rounded-[22px] p-6 backdrop-blur-md border border-[var(--k-hairline)] overflow-hidden text-center gap-3">
                    <div className="relative flex items-center justify-center w-14 h-14 rounded-full border border-white/10 bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] shadow-xl transition-transform duration-500 group-hover:scale-105 group-hover:-translate-y-1">
                      <Fire size={22} className="text-white" weight="fill" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-semibold text-[var(--k-ink)] tracking-tight">Task-linked by default</h4>
                      <p className="text-[12px] text-[var(--k-muted)] mt-1.5 leading-relaxed max-w-[200px]">
                        Every brew attaches to a task, so the weekly report is ready to bill without reconstruction.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="group relative rounded-3xl border border-[var(--k-hairline)] bg-[var(--k-surface-soft)] overflow-hidden hover:border-[var(--k-hairline2)] transition-colors p-1 flex-1 min-h-[208px]">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-gradient-to-br from-[#3385ff]/10 via-[#0066ff]/5 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <div className="relative h-full flex flex-col items-center justify-center bg-[var(--k-surface)]/60 rounded-[22px] p-6 backdrop-blur-md border border-[var(--k-hairline)] overflow-hidden text-center gap-4">
                    <div className="relative flex items-center justify-center w-14 h-14 rounded-full border border-white/10 bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] shadow-xl transition-transform duration-500 group-hover:scale-105 group-hover:-translate-y-1">
                      <ArrowsClockwise size={22} className="text-white" weight="bold" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-semibold text-[var(--k-ink)] tracking-tight">Survives tab closes</h4>
                      <p className="text-[12px] text-[var(--k-muted)] mt-1.5 leading-relaxed max-w-[200px]">
                        Sessions sync to the cloud. Close the browser, switch devices — the brew keeps ticking.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Integrated Pricing Card (Same border/gradient styling to fit Bento visual theme) */}
            <div id="pricing" className="k-reveal overflow-hidden rounded-3xl border border-[var(--k-hairline2)] bg-gradient-to-br from-[var(--k-card2)] to-[var(--k-card)] shadow-2xl transition-all duration-300 hover:border-[var(--k-line3)] mt-2">
              <div className="grid grid-cols-1 items-center gap-10 p-10 md:grid-cols-12 md:p-12">
                <div className="md:col-span-7">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#3385ff] mb-2 block">Pricing</span>
                  <h3 className="text-[clamp(24px,3vw,36px)] font-bold tracking-[-0.035em] text-[var(--k-ink)] leading-tight">Start free. Brew on.</h3>
                  <p className="mt-3.5 max-w-[52ch] text-[16px] leading-relaxed text-[var(--k-muted)]">
                    Track every client and the whole ritual at no cost while Kettles is in beta.
                  </p>
                  <div className="mt-5">
                    <PrimaryBtn href="/auth" big magnet>
                      Start free
                    </PrimaryBtn>
                  </div>
                </div>
                <div className="md:col-span-5 md:border-l md:border-[var(--k-hairline2)] md:pl-12">
                  <div className="flex items-baseline gap-2">
                    <span className="k-mono text-[52px] font-semibold tracking-[-0.035em] text-[var(--k-ink)]">$0</span>
                    <span className="text-[14px] text-[var(--k-muted)]">in beta</span>
                  </div>
                  <p className="mt-1 text-[14px] text-[var(--k-muted)]">No client limits, no feature gates.</p>
                  <p className="mt-5 text-[12px] text-[var(--k-faint)]">No card required · no trial clock</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ===================== FAQ ===================== */}
        <section id="faq" className="relative z-10 border-t border-[var(--k-line)] bg-[var(--k-bg2)] py-[120px]">
          <div className="mx-auto max-w-[720px] px-6">
            <div className="k-reveal text-center">
              <Eyebrow>FAQ</Eyebrow>
              <h2 className="mt-5 text-[clamp(28px,3.4vw,40px)] font-bold tracking-[-0.03em] text-[var(--k-ink)]">
                Questions, answered.
              </h2>
              <p className="mx-auto mt-4 max-w-[48ch] text-[16px] leading-relaxed text-[var(--k-muted)]">
                Straight answers about task-linked time, sync, and privacy.
              </p>
            </div>
            <div className="k-reveal mt-12 flex flex-col gap-3">
              {faqs.map(([q, a], i) => {
                const open = faqOpen === i;
                return (
                  <div
                    key={q}
                    className="overflow-hidden rounded-2xl border border-[var(--k-line)] bg-[var(--k-card)] transition-colors hover:border-[var(--k-line2)]"
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setFaqOpen(open ? null : i)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--k-ink)]">{q}</span>
                      <span
                        className={`grid h-7 w-7 flex-none place-items-center rounded-full border border-[var(--k-line2)] text-[var(--k-muted)] transition-transform duration-200 ${open ? "rotate-45 bg-[var(--k-tint)] text-[var(--k-accent2)]" : ""}`}
                        aria-hidden
                      >
                        <Plus size={14} weight="bold" />
                      </span>
                    </button>
                    {open && (
                      <div className="border-t border-[var(--k-line)] px-5 pb-5 pt-3">
                        <p className="text-[14.5px] leading-relaxed text-[var(--k-muted)]">{a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================== FINAL CTA (Redesigned with mock modal + spotlight) ===================== */}
        <section id="download" className="border-t border-[var(--k-line)] bg-[var(--k-bg)] px-6 py-[120px] text-center overflow-hidden">
          <div className="mx-auto max-w-[1180px] flex flex-col items-center relative z-10">
            
            <h2 className="k-reveal text-[clamp(32px,3.8vw,48px)] font-bold tracking-[-0.03em] text-[var(--k-ink)]">
              The kettle&apos;s ready when you are.
            </h2>
            <p className="k-reveal mx-auto mt-4 max-w-[56ch] text-[17px] leading-relaxed text-[var(--k-muted)]">
              Drop your email and pick up in the app. Every minute from here brews into a record you can bill.
            </p>

            {/* Keep the email capture functional */}
            <div className="k-reveal mt-10 w-full max-w-[460px]">
              <EmailCapture />
            </div>



          </div>
        </section>
      </main>


      {/* ===================== FOOTER ===================== */}
      <footer className="relative z-10 border-t border-[var(--k-line)] px-6 pb-12 pt-20" style={{ backgroundColor: 'var(--k-bg)' }}>
        <div className="mx-auto max-w-[1180px]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
            
            {/* Studio Branding Card */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-8 group relative rounded-3xl border border-[var(--k-hairline)] bg-[var(--k-surface-soft)]/20 p-8 backdrop-blur-md overflow-hidden min-h-[220px] transition-all duration-300 hover:border-[var(--k-hairline2)] hover:bg-[var(--k-surface-soft)]/30">
              {/* Subtle background glow */}
              <div className="absolute -top-20 -left-20 w-48 h-48 rounded-full bg-gradient-to-br from-[#3385ff]/10 to-transparent blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="relative z-10">
                <Wordmark className="h-7 w-auto text-[var(--k-ink)]" />
                <p className="mt-4 max-w-[28ch] text-[14px] leading-relaxed text-[var(--k-muted)] font-medium">
                  Task-linked time tracking, made for focused work.
                </p>
              </div>
              <div className="relative z-10">
                <PrimaryBtn href="/auth">Start free</PrimaryBtn>
              </div>
            </div>

            {/* Navigation Link Columns — only real in-page / app destinations */}
            <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-8">
              {[
                ["Product", [["Features", "#features"], ["How it works", "#how"], ["Pricing", "#pricing"], ["Download", "#download"]]],
                ["Explore", [["Reviews", "#reviews"], ["FAQ", "#faq"], ["Security", "#security"], ["Companion", "#desktop-pet"]]],
                ["Account", [["Sign in", "/auth"], ["Start free", "/auth"]]],
              ].map(([h, links]) => (
                <div key={h as string}>
                  <h5 className="mb-4 text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--k-muted)]">{h as string}</h5>
                  {(links as [string, string][]).map(([l, href]) => (
                    <Link key={l} href={href} className="block w-fit py-1.5 text-[13.5px] font-medium text-[var(--k-faint)] transition duration-200 hover:text-[var(--k-ink)]">
                      {l}
                    </Link>
                  ))}
                </div>
              ))}
            </div>

          </div>

          {/* Bottom Copyright Area */}
          <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--k-hairline)] pt-8">
            <p className="text-[13px] text-[var(--k-faint)] font-medium">© 2026 Kettles. Made for focused work.</p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12.5px] text-[var(--k-faint)] font-medium">
              <Link href="#security" className="hover:text-[var(--k-ink)] transition">Privacy principles</Link>
              <span className="opacity-30" aria-hidden>•</span>
              <Link href="#faq" className="hover:text-[var(--k-ink)] transition">FAQ</Link>
            </div>
          </div>

        </div>
      </footer>

      {/* ===================== TEXTURED GRADIENT FOOTER ===================== */}
      <section id="k-textured-footer" className="relative h-[400px] w-full overflow-hidden bg-[var(--k-bg)]">
        {/* Blue Bottom Glow */}
        <div className="k-tf-glow absolute -bottom-[40%] left-1/2 h-[80%] w-[100%] max-w-[1200px] -translate-x-1/2 rounded-[100%] bg-blue-600/40 blur-[100px]" />
        <div className="k-tf-glow absolute -bottom-[20%] left-1/2 h-[50%] w-[60%] max-w-[800px] -translate-x-1/2 rounded-[100%] bg-blue-500/60 blur-[80px]" />

        {/* Big Studio Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 pt-10">
           <span id="k-footer-big-text" className="text-[clamp(80px,20vw,360px)] font-black leading-none tracking-[-0.05em] text-white mix-blend-overlay opacity-90 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] whitespace-nowrap select-none">
             {Array.from("KETTLES").map((char, index) => (
               <span
                 key={index}
                 className="inline-block will-change-transform"
               >
                 {char}
               </span>
             ))}
           </span>
        </div>

        {/* Vertical Columns */}
        <div className="absolute inset-0 mx-auto grid max-w-[1180px] grid-cols-5 px-6">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className={`h-full w-full border-r border-dashed border-[var(--k-hairline2)] ${i === 0 ? 'border-l' : ''}`}
            />
          ))}
        </div>

        {/* Grain Texture Overlay */}
        <div
          className="k-tf-grain pointer-events-none absolute inset-0 z-10 opacity-[0.15] mix-blend-overlay"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
        />
        
        {/* Top Fade to blend with the footer above */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[var(--k-bg)] to-transparent" />
      </section>
    </BeamsBackground>
  );
}

function CompanionState({ tone, pill, title, desc }: { tone: "idle" | "lost"; pill: string; title: string; desc: string }) {
  return (
    <article className="flex items-center gap-5 rounded-[24px] border border-[var(--k-line)] bg-[var(--k-card)] p-7 lg:col-span-6">
      <div className="grid h-24 w-24 flex-none place-items-center">
        <Kettle size={84} steam={false} lost={tone === "lost"} />
      </div>
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--k-line2)] bg-[var(--k-bg2)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--k-ink2)]">{pill}</span>
        <h3 className="mt-3 text-[19px] font-semibold tracking-[-0.02em]">{title}</h3>
        <p className="mt-1.5 max-w-[34ch] text-[14.5px] text-[var(--k-muted)]">{desc}</p>
      </div>
    </article>
  );
}

function Testimonial({ quote, name, role, color }: { quote: string; name: string; role: string; color: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  return (
    <div className="rounded-[18px] border border-[var(--k-line)] bg-[var(--k-card)] p-6">
      <div className="mb-3.5 flex gap-0.5 text-[#f5a623]">
        {[...Array(5)].map((_, i) => (
          <svg key={i} viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M12 2l3 7h7l-5.5 4 2 7L12 17l-6.5 4 2-7L2 9h7z" />
          </svg>
        ))}
      </div>
      <p className="text-[15px] leading-relaxed text-[var(--k-ink2)]">&ldquo;{quote}&rdquo;</p>
      <div className="mt-4 flex items-center gap-3">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-full text-[13px] font-semibold text-white" style={{ background: DOT[color] }}>
          {initials}
        </span>
        <div>
          <div className="text-[13.5px] font-semibold">{name}</div>
          <div className="text-[12.5px] text-[var(--k-faint)]">{role}</div>
        </div>
      </div>
    </div>
  );
}

function LaurelBadge({ label, subLabel, rank }: { label: string; subLabel?: string; rank?: string }) {
  return (
    <div className="flex flex-col items-center text-center opacity-20 select-none pointer-events-none scale-90">
      <div className="relative flex items-center justify-center w-24 h-24">
        {/* Laurel Wreath */}
        <svg className="absolute inset-0 w-full h-full text-white/40 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all duration-500" viewBox="0 0 100 100" fill="none" stroke="currentColor">
          {/* Left arc */}
          <path d="M 35 75 A 22 25 0 0 1 35 25" strokeWidth="1.5" strokeLinecap="round" />
          {/* Left Leaves */}
          <path d="M 32 72 Q 24 70 26 63 Q 32 66 33 70" fill="currentColor" />
          <path d="M 28 60 Q 20 56 24 49 Q 30 52 30 57" fill="currentColor" />
          <path d="M 28 46 Q 21 40 26 33 Q 31 37 30 43" fill="currentColor" />
          <path d="M 32 32 Q 28 24 35 20 Q 37 27 34 31" fill="currentColor" />
          
          {/* Right arc */}
          <path d="M 65 75 A 22 25 0 0 0 65 25" strokeWidth="1.5" strokeLinecap="round" />
          {/* Right Leaves */}
          <path d="M 68 72 Q 76 70 74 63 Q 68 66 67 70" fill="currentColor" />
          <path d="M 72 60 Q 80 56 76 49 Q 70 52 70 57" fill="currentColor" />
          <path d="M 72 46 Q 79 40 74 33 Q 69 37 70 43" fill="currentColor" />
          <path d="M 68 32 Q 72 24 65 20 Q 63 27 66 31" fill="currentColor" />
        </svg>
        {/* Rank & label inside */}
        <div className="z-10 flex flex-col items-center justify-center mt-[-4px]">
          <span className="text-[10px] font-bold tracking-wider uppercase opacity-90 max-w-[60px] leading-none text-center text-white drop-shadow-md">{label}</span>
          {subLabel && (
            <span className="text-[9px] font-bold uppercase opacity-80 text-white/80 leading-none mt-0.5 drop-shadow-sm">{subLabel}</span>
          )}
          {rank && (
            <span className="text-lg font-extrabold mt-1 text-white leading-none">{rank}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function G2Badge() {
  return (
    <div className="relative flex flex-col items-center justify-between bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] text-white rounded-xl w-[135px] h-[175px] p-3.5 shadow-[0_0_30px_rgba(0,102,255,0.3)] border border-white/10 select-none">
      {/* G2 Logo at top */}
      <div className="flex items-center justify-center w-7 h-7 bg-gradient-to-br from-[#0066ff] to-[#3385ff] shadow-[0_0_10px_rgba(51,133,255,0.5)] rounded-md text-white font-extrabold text-base">
        G
      </div>
      
      {/* Title */}
      <div className="text-center mt-1 flex flex-col">
        <span className="text-[12px] font-extrabold text-white leading-none drop-shadow-md">Highest User</span>
        <span className="text-[12px] font-extrabold text-white leading-tight drop-shadow-md">Adoption</span>
      </div>
      
      {/* Blue Ribbon Banner */}
      <div className="relative w-[118%] bg-[#0047b3] border-y border-white/10 text-white text-[9px] font-bold uppercase tracking-wider py-1.5 text-center my-1.5 shadow-md">
        SUMMER
        {/* Ribbon ears/tails under the main fold */}
        <div className="absolute left-0 bottom-[-4px] border-t-[4px] border-t-[#002b6b] border-l-[4px] border-l-transparent"></div>
        <div className="absolute right-0 bottom-[-4px] border-t-[4px] border-t-[#002b6b] border-r-[4px] border-r-transparent"></div>
      </div>
      
      {/* Year */}
      <div className="text-[16px] font-extrabold text-white tracking-tight leading-none drop-shadow-md">
        2026
      </div>
    </div>
  );
}

function FadedG2Badge({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-between bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] text-white rounded-lg w-[105px] h-[140px] p-2.5 shadow-lg border border-white/10 select-none">
      {/* G2 Logo at top */}
      <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-[#0066ff] to-[#3385ff] shadow-[0_0_8px_rgba(51,133,255,0.4)] rounded-md text-white font-bold text-xs">
        G
      </div>
      
      {/* Title */}
      <div className="text-[10px] font-extrabold text-white leading-none text-center">
        {title}
      </div>
      {/* Sub */}
      <div className="text-[8px] font-extrabold text-white/60 uppercase tracking-tight text-center leading-none mt-0.5">
        {sub}
      </div>
      
      {/* Ribbon */}
      <div className="w-[115%] bg-[#0047b3] border-y border-white/10 text-white text-[8px] font-black uppercase py-1 text-center my-1 leading-normal">
        SUMMER
      </div>
      
      {/* Year */}
      <div className="text-[12px] font-black text-white leading-none">
        2026
      </div>
    </div>
  );
}

export default KettlesLanding;

