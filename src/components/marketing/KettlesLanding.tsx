"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HeroVisuals } from "@/components/marketing/MockComponents";
import { WorkflowPreview } from "@/components/marketing/ProductSections";
import {
  ArrowRight,
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
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform duration-200 group-hover:translate-x-0.5 shrink-0 ${big ? "h-4.5 w-4.5" : "h-4 w-4"}`}>
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
        className={`transform transition-transform duration-200 group-hover:translate-x-1 group-hover:translate-y-0.5 shrink-0 ${big ? "h-5 w-5" : "h-4 w-4"}`}
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
            Continue in the app —{" "}
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

    // streak
    const streak = $("#k-streak");
    if (streak)
      once(
        streak,
        () => {
          if (reduce) return (streak.textContent = "12");
          let n = 0;
          const id = ivl(() => {
            n++;
            streak.textContent = String(n);
            if (n >= 12) clearInterval(id);
          }, 70);
        },
        0.6
      );

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

    return () => {
      cleanups.forEach((f) => f());
      timers.forEach((id) => clearInterval(id));
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  const faqs = [
    ["Is it task-linked or just a stopwatch?", "Task-linked. You pick a task first, and the time you brew is sealed to it — that's what makes your weekly report accurate enough to invoice without second-guessing."],
    ["Does the timer survive a tab close?", "Yes. Brews are saved to the cloud, so closing a tab, refreshing, or switching devices doesn't lose a second. Your timer keeps running where it left off."],
    ["Which platforms are supported?", "Kettles runs in the browser, plus native macOS and Windows apps with a floating always-on-top mini-timer. A browser extension keeps everything in sync."],
    ["Can I export for invoicing?", "Every weekly report exports to PDF or CSV in one click — hours broken down per client, ready to attach to an invoice or send straight to a client."],
    ["Is my data private?", "Completely. Kettles never takes screenshots, logs keystrokes, or scores your productivity. It records the hours you choose to brew — nothing else."],
  ];

  return (
    <div ref={rootRef} className="kettles min-h-[100dvh]">
      {/* ===================== NAV ===================== */}
      <header
        id="k-nav"
        className="fixed inset-x-0 top-0 z-50 border-b border-[var(--k-line)] bg-[color:rgba(8,9,10,0.8)] backdrop-blur-md transition-transform duration-300 ease-[var(--k-ease)] [&.k-nav-hide]:-translate-y-[100%]"
      >
        <div className="mx-auto flex h-[64px] max-w-[1240px] items-center justify-between px-6">
          <Link href="#top" aria-label="Kettles home" className="group inline-flex items-center">
            <Wordmark className="h-[54px] w-auto text-[var(--k-ink)]" />
          </Link>
          <nav className="mx-auto hidden items-center gap-0.5 md:flex" aria-label="Primary">
            {[
              ["Features", "#features"],
              ["How it works", "#how"],
              ["Reviews", "#reviews"],
              ["Pricing", "#pricing"],
            ].map(([l, h]) => (
              <Link key={h} href={h} className="rounded-lg px-3 py-2 text-[14.5px] font-[450] text-[var(--k-muted)] transition-[background-color,color,transform] duration-200 ease-out hover:bg-[var(--k-card2)] hover:text-[var(--k-ink)] active:scale-95">
                {l}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="hidden text-[14px] font-[450] text-[var(--k-ink2)] transition hover:text-[var(--k-accent2)] sm:block">
              Sign in
            </Link>
            <PrimaryBtn href="/auth" magnet>
              Start free
            </PrimaryBtn>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ===================== HERO (Centered layout + flanking visual cards) ===================== */}
        <section className="relative mx-auto flex flex-col items-center justify-center px-6 pb-20 pt-[150px] text-center w-full max-w-[1240px]">
          <div className="k-reveal mb-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-3.5 py-1.5 text-[12px] font-semibold text-[var(--k-ink2)]">
              Trusted by 10k+ Freelancers
            </span>
          </div>
          <h1 className="k-reveal text-[clamp(44px,6.5vw,76px)] font-bold leading-[1.01] tracking-[-0.04em] max-w-[20ch]">
            Time tracking that does <br className="hidden sm:inline" />
            <span className="text-[var(--k-ink-blue)]">the remembering for you.</span>
          </h1>
          <p className="k-reveal mt-6 max-w-[50ch] text-[clamp(17px,1.5vw,20px)] leading-[1.5] text-[var(--k-muted)]">
            Pick a task, hit start — every minute locks to the work. <br className="hidden sm:block" />
            Your weekly report stays accurate and invoice-ready, automatically.
          </p>
          <div className="k-reveal mt-8 flex flex-col items-center gap-3">
            <PrimaryBtn href="/auth" big magnet>
              Start free
            </PrimaryBtn>
            <span className="text-[13px] text-[var(--k-faint)]">No card required · free to start</span>
          </div>

          {/* Centered Visual Flanking Cards Wrapper */}
          <div className="k-reveal w-full flex justify-center mt-12">
            <HeroVisuals />
          </div>
        </section>




        {/* ===================== HOW IT WORKS (rail, no cards) ===================== */}
        <section id="how" className="border-y border-[var(--k-line)] bg-[var(--k-bg2)] py-[120px]">
          <div className="mx-auto max-w-[1180px] px-6">
            <div className="k-reveal mx-auto max-w-[740px] text-center">
              <Eyebrow>The ritual</Eyebrow>
              <h2 className="mt-5 text-[clamp(28px,3.4vw,42px)] font-semibold tracking-[-0.03em]">Three steps. One honest record.</h2>
              <p className="mx-auto mt-5 max-w-[56ch] text-[18px] text-[var(--k-muted)]">
                No stopwatch guesswork. Pick the task, let the kettle boil, and the time locks itself to the work.
              </p>
            </div>
            <div id="k-flow" className="relative mt-16">
              <div className="absolute left-[8%] right-[8%] top-[27px] hidden h-0.5 overflow-hidden rounded bg-[var(--k-line2)] md:block">
                <i id="k-railFill" className="k-rail-fill block h-full bg-[var(--k-accent)]" />
              </div>
              <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
                {[
                  ["Pick a task", "Choose what you're working on. The timer attaches to that task — not a blank stopwatch."],
                  ["The kettle boils", "The timer runs and steam builds. Close the tab, switch devices — the brew keeps going in the cloud."],
                  ["Time locks to the task", "When the brew is done, the minutes seal to the task. No guessing, no backfilling, no rounding up."],
                ].map(([t, d], i) => (
                  <div key={t} data-step className="group relative px-2 text-center [&.k-step-on_.k-num]:scale-105 [&.k-step-on_.k-num]:border-[var(--k-accent)] [&.k-step-on_.k-num]:bg-[var(--k-accent)] [&.k-step-on_.k-num]:text-white [&.k-step-on_.k-num]:shadow-[0_14px_30px_-14px_rgba(0,102,255,0.55)]">
                    <div className="k-num k-mono relative z-[2] mx-auto grid h-[54px] w-[54px] place-items-center rounded-2xl border border-[var(--k-line2)] bg-[var(--k-card2)] text-[19px] font-medium text-[var(--k-faint)] transition-all duration-500">
                      {i + 1}
                    </div>
                    <h3 className="mt-5 text-[19px] font-semibold tracking-[-0.02em]">{t}</h3>
                    <p className="mx-auto mt-2 max-w-[30ch] text-[14.5px] text-[var(--k-muted)]">{d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===================== PROBLEM (asymmetric, line-grouped) ===================== */}
        <section className="mx-auto max-w-[1180px] px-6 py-[120px]">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="k-reveal lg:col-span-5">
              <Eyebrow>The cold cup</Eyebrow>
              <h2 className="mt-5 text-[clamp(28px,3.4vw,42px)] font-semibold leading-[1.05] tracking-[-0.03em]">
                Your logged hours don&apos;t match your real work.
              </h2>
              <p className="mt-5 max-w-[46ch] text-[18px] leading-relaxed text-[var(--k-muted)]">
                Guessed timesheets quietly cost you money and trust. Kettles fixes the leak at the source — no boxes, just an honest record.
              </p>
            </div>
            <div className="k-stagger divide-y divide-[var(--k-line)] lg:col-span-7">
              {[
                [Coins, "Underbilling", "Forgotten minutes are unpaid minutes. The work happened — your invoice never saw it.", "var(--k-c3)"],
                [WarningOctagon, "The distraction tax", "You worked all day — where did it go? A guessed timesheet is a story, not a record.", "var(--k-c5)"],
                [X, "Broken self-trust", "If the log lies, you stop trusting it — and a tool you don't trust is one you stop opening.", "var(--k-accent2)"],
              ].map(([Ic, t, d, col]) => {
                const Icon = Ic as typeof Coins;
                return (
                  <div key={t as string} className="group flex items-start gap-5 py-7 transition-transform hover:translate-x-1">
                    <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl border" style={{ color: col as string, borderColor: "color-mix(in srgb, currentColor 22%, transparent)", background: "color-mix(in srgb, currentColor 10%, transparent)" }}>
                      <Icon size={22} />
                    </span>
                    <div>
                      <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{t as string}</h3>
                      <p className="mt-1.5 max-w-[52ch] text-[15px] text-[var(--k-muted)]">{d as string}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================== FEATURES (4-levels Analytics Style) ===================== */}
        <section id="features" className="k-texture relative overflow-hidden border-y border-[var(--k-line)] bg-[var(--k-bg)] py-[140px]">
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
        <section className="border-y border-[var(--k-line)] bg-[var(--k-bg2)] py-[120px]">
          <div className="mx-auto max-w-[1180px] px-6">
            <div className="k-reveal mx-auto max-w-[740px] text-center">
              <Eyebrow>The companion</Eyebrow>
              <h2 className="mt-5 text-[clamp(28px,3.4vw,42px)] font-semibold tracking-[-0.03em]">You&apos;re not focusing alone.</h2>
              <p className="mx-auto mt-5 max-w-[58ch] text-[18px] text-[var(--k-muted)]">
                Your kettle stays warm while you work, whistles when a brew is done, and wanders off when you go cold. Keep your streak — keep the kettle on.
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

            <div className="mt-10 flex justify-center">
              <div className="k-reveal inline-flex items-center gap-2.5 rounded-full border border-[var(--k-tint2)] bg-[var(--k-card)] px-5 py-2.5 text-[15px] font-semibold">
                <Fire size={16} weight="fill" className="text-[var(--k-accent2)]" />
                <span id="k-streak" className="k-mono text-[var(--k-steam)]">0</span>-day streak
              </div>
            </div>
          </div>
        </section>

        {/* ===================== TRUST BADGE STRIP (slim) ===================== */}
        <section id="security" className="border-y border-[var(--k-line)] bg-[var(--k-bg2)] py-12">
          <div className="mx-auto max-w-[1180px] px-6 text-center">
            <p className="k-reveal text-[15px] text-[var(--k-muted)]">
              <span className="font-semibold text-[var(--k-ink)]">No screenshots. No keystroke spying. No productivity scores.</span> Just an accurate record you own.
            </p>
            <div className="k-reveal mt-6 flex flex-wrap justify-center gap-3">
              {[[SealCheck, "SOC 2 Type II"], [ShieldCheck, "GDPR compliant"], [LockKey, "256-bit encryption"], [EyeSlash, "Zero surveillance"]].map(([Ic, t]) => {
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

        {/* ===================== TESTIMONIALS (vertical kinetic columns) ===================== */}
        <section id="reviews" className="mx-auto max-w-[1180px] px-6 py-[120px]">
          <div className="k-reveal mx-auto max-w-[740px] text-center">
            <Eyebrow>Wall of love</Eyebrow>
            <h2 className="mt-5 text-[clamp(28px,3.4vw,42px)] font-semibold tracking-[-0.03em]">Freelancers who finally trust their timesheet.</h2>
          </div>
          <div className="k-reveal mt-14 grid max-h-[640px] grid-cols-1 gap-5 overflow-hidden [mask-image:linear-gradient(180deg,transparent,#000_10%,#000_90%,transparent)] md:grid-cols-3">
            {[
              [
                ["I used to round my hours and quietly lose money every month. Now the brew is the invoice.", "Mara Alvarez", "Brand designer", "c3"],
                ["My last two clients didn't question a single line on the invoice. That's never happened.", "Theo Bell", "Motion designer", "c4"],
                ["The little kettle is genuinely delightful — and the numbers underneath are dead accurate.", "Lukas Berg", "Illustrator", "c3"],
              ],
              [
                ["The timer survives a tab close, which sounds boring until you've lost an afternoon of work.", "Devin Tran", "Full-stack dev", "c2"],
                ["The per-client breakdown at the end of the week is just there. No spreadsheet wrangling.", "Ana Costa", "Consultant", "c5"],
                ["Invoicing went from a dreaded Friday ritual to a two-minute export. Worth it alone.", "Nadia Hassan", "Copywriter", "c4"],
              ],
              [
                ["It's the only tracker that doesn't make me feel watched. I put the kettle on and write.", "Rosa Kim", "Freelance writer", "c1"],
                ["Gentle whistles instead of alarms changed how my whole day feels. Calmer, and I bill more.", "Sam Ortega", "iOS developer", "c2"],
                ["Switched from three tools to one. Tasks, timer, and billing finally agree with each other.", "Priya Nair", "Studio owner", "c1"],
              ],
            ].map((col, ci) => (
              <div key={ci} className="k-vcol overflow-hidden">
                <div className="k-vtrack flex flex-col gap-5" style={{ ["--dur" as string]: `${34 + ci * 6}s` }}>
                  {[...col, ...col].map((q, qi) => (
                    <Testimonial key={qi} quote={q[0]} name={q[1]} role={q[2]} color={q[3]} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===================== PRICING (asymmetric band) ===================== */}
        <section id="pricing" className="mx-auto max-w-[1180px] px-6 py-[88px]">
          <div className="k-reveal overflow-hidden rounded-[28px] border border-[var(--k-line2)] bg-[var(--k-card)]">
            <div className="grid grid-cols-1 items-center gap-10 p-10 md:grid-cols-12 md:p-14">
              <div className="md:col-span-7">
                <Eyebrow>Pricing</Eyebrow>
                <h2 className="mt-5 text-[clamp(28px,3.4vw,40px)] font-semibold tracking-[-0.03em]">Start free. Brew on.</h2>
                <p className="mt-4 max-w-[52ch] text-[18px] text-[var(--k-muted)]">
                  Track your first client and the whole ritual at no cost. Upgrade when your roster grows.
                </p>
                <div className="mt-6">
                  <PrimaryBtn href="/auth" big magnet>
                    Start free
                  </PrimaryBtn>
                </div>
              </div>
              <div className="md:col-span-5 md:border-l md:border-[var(--k-line2)] md:pl-12">
                <div className="flex items-baseline gap-2">
                  <span className="k-mono text-[56px] font-medium tracking-[-0.03em]">$0</span>
                  <span className="text-[15px] text-[var(--k-muted)]">to start</span>
                </div>
                <p className="mt-1 text-[15px] text-[var(--k-muted)]">Pro from $8/mo when you add clients.</p>
                <p className="mt-5 text-[13px] text-[var(--k-faint)]">No card required · cancel anytime</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== FAQ ===================== */}
        <section id="faq" className="border-y border-[var(--k-line)] bg-[var(--k-bg2)] py-[120px]">
          <div className="mx-auto max-w-[1180px] px-6">
            <div className="k-reveal mx-auto max-w-[740px] text-center">
              <Eyebrow>Questions</Eyebrow>
              <h2 className="mt-5 text-[clamp(28px,3.4vw,42px)] font-semibold tracking-[-0.03em]">Good to know.</h2>
            </div>
            <div className="k-reveal mx-auto mt-12 max-w-[760px]">
              {faqs.map(([q, a], i) => {
                const open = faqOpen === i;
                return (
                  <div key={q} className="border-b border-[var(--k-line)]">
                    <button onClick={() => setFaqOpen(open ? null : i)} aria-expanded={open} className="flex w-full items-center justify-between gap-5 py-6 text-left text-[17.5px] font-[550] text-[var(--k-ink)] transition-transform duration-200 active:scale-[0.99]">
                      {q}
                      <span className={`grid h-[22px] w-[22px] flex-none place-items-center rounded-md text-[var(--k-accent2)] transition-[transform,background-color] duration-200 ease-[var(--k-ease)] ${open ? "rotate-45 bg-[var(--k-tint)]" : "bg-[var(--k-card2)]"}`}>
                        <Plus size={14} weight="bold" />
                      </span>
                    </button>
                    <div className="grid transition-[grid-template-rows] duration-300 ease-[var(--k-ease)]" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
                      <div className="overflow-hidden">
                        <p className="max-w-[64ch] pb-6 text-[15.5px] text-[var(--k-muted)]">{a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================== FINAL CTA (Redesigned with mock modal + spotlight) ===================== */}
        <section id="download" className="k-spotlight-bg border-t border-[var(--k-line)] bg-gradient-to-b from-[var(--k-bg)] to-[var(--k-bg2)] px-6 py-[120px] text-center overflow-hidden">
          <div className="mx-auto max-w-[1180px] flex flex-col items-center relative z-10">
            <div className="k-reveal mb-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-3.5 py-1.5 text-[12px] font-semibold text-[var(--k-ink2)]">
                Start Tracking Today
              </span>
            </div>
            
            <h2 className="k-reveal text-[clamp(34px,4.6vw,56px)] font-bold tracking-[-0.035em] text-white">
              The kettle&apos;s ready when you are.
            </h2>
            <p className="k-reveal mx-auto mt-4 max-w-[48ch] text-[18px] text-[var(--k-muted)]">
              Drop your email and pick up in the app — every minute from here brews into a record you can bill.
            </p>

            {/* Keep the email capture functional */}
            <div className="k-reveal mt-10 w-full max-w-[460px]">
              <EmailCapture />
            </div>

            {/* Bottom 3 Features list row */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left w-full max-w-[1000px] pt-12 border-t border-white/5">
              <div className="flex gap-4">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-[var(--k-line2)] bg-[var(--k-card)] text-[var(--k-accent2)]">
                  <Globe size={20} />
                </span>
                <div>
                  <h4 className="text-[15px] font-semibold text-white">Client Ledger</h4>
                  <p className="mt-1.5 text-[13px] text-[var(--k-muted)]">Every session resolves to a specific client profile automatically, ready to invoice.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-[var(--k-line2)] bg-[var(--k-card)] text-[var(--k-accent2)]">
                  <Lock size={20} />
                </span>
                <div>
                  <h4 className="text-[15px] font-semibold text-white">Focus Blocks</h4>
                  <p className="mt-1.5 text-[13px] text-[var(--k-muted)]">Lock focus periods with customized durations (Pomodoro brews) and custom notes.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-[var(--k-line2)] bg-[var(--k-card)] text-[var(--k-accent2)]">
                  <User size={20} />
                </span>
                <div>
                  <h4 className="text-[15px] font-semibold text-white">Workspaces</h4>
                  <p className="mt-1.5 text-[13px] text-[var(--k-muted)]">Work seamlessly across multiple teams, switching profiles in one click.</p>
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>


      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-[var(--k-line)] bg-[var(--k-bg2)] px-6 pb-9 pt-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid grid-cols-2 gap-9 md:grid-cols-[1.5fr_repeat(4,1fr)]">
            <div className="col-span-2 md:col-span-1">
              <Wordmark className="h-6 w-auto text-[var(--k-ink)]" />
              <p className="mt-4 max-w-[28ch] text-[14px] text-[var(--k-muted)]">Task-linked time tracking, made for focused work.</p>
            </div>
            {[
              ["Product", [["Features", "#features"], ["How it works", "#how"], ["Pricing", "#pricing"], ["Download", "#download"]]],
              ["Resources", [["Blog", "#"], ["Deep-work guide", "#"], ["FAQ", "#faq"], ["Help center", "#"]]],
              ["Company", [["About", "#"], ["Mission", "#"], ["Contact", "#"]]],
              ["Legal", [["Privacy", "#"], ["Terms", "#"], ["Security", "#security"]]],
            ].map(([h, links]) => (
              <div key={h as string}>
                <h5 className="mb-4 text-[12.5px] font-semibold text-[var(--k-ink)]">{h as string}</h5>
                {(links as [string, string][]).map(([l, href]) => (
                  <Link key={l} href={href} className="block w-fit py-1.5 text-[14px] text-[var(--k-muted)] transition hover:text-[var(--k-accent2)]">
                    {l}
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-13 flex flex-wrap items-center justify-between gap-5 border-t border-[var(--k-line)] pt-6">
            <p className="text-[13px] text-[var(--k-faint)]">© 2026 Kettles. Made for focused work.</p>
            <div className="flex gap-2">
              {["X", "GitHub", "LinkedIn"].map((s) => (
                <Link key={s} href="#" aria-label={s} className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--k-line2)] bg-[var(--k-card)] text-[var(--k-muted)] transition hover:-translate-y-0.5 hover:text-[var(--k-ink)]">
                  <span className="text-[11px] font-semibold">{s[0]}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ===================== CINEMATIC FOOTER REVEAL ===================== */}
      <section className="k-cinematic-container">
        <div id="k-cinematic-portal" className="k-cinematic-portal">
          <div className="k-cinematic-image-wrapper">
            <Image
              id="k-cinematic-image"
              src="/images/footer.png"
              alt="Kettles Cinematic Brand Logo"
              width={1920}
              height={480}
              priority
              className="k-cinematic-image"
            />
          </div>
          <div className="k-cinematic-overlay" />
        </div>
      </section>
    </div>
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

export default KettlesLanding;
