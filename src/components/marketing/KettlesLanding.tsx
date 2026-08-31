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
import {
  ArrowRight,
  ArrowsClockwise,
  Check,
  Coins,
  EyeSlash,
  List,
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

const DOT: Record<string, string> = {
  c1: "var(--k-c1)",
  c2: "var(--k-c2)",
  c3: "var(--k-c3)",
  c4: "var(--k-c4)",
};

const NAV_LINKS: [string, string][] = [
  ["Features", "#features"],
  ["How it works", "#how"],
  ["Reviews", "#reviews"],
  ["Pricing", "#pricing"],
  ["FAQ", "#faq"],
];

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

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform duration-200 group-hover:translate-x-1 ${className}`}>
      <path d="M13.75 8.125L17.5 11.875L13.75 15.625" />
      <path d="M2.5 4.375C2.5 6.36412 3.29018 8.27178 4.6967 9.6783C6.10322 11.0848 8.01088 11.875 10 11.875H17.5" />
    </svg>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="k-eyebrow">{children}</span>;
}

function PrimaryBtn({
  href,
  children,
  magnet = false,
  big = false,
  variant = "solid",
  id,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  magnet?: boolean;
  big?: boolean;
  variant?: "solid" | "ghost" | "text";
  id?: string;
  onClick?: () => void;
}) {
  const size = big ? "px-7 py-3.5 text-[16px]" : "px-5 py-2.5 text-[14px]";
  const arrow = <ArrowIcon className={big ? "h-[18px] w-[18px]" : "h-4 w-4"} />;
  const magnetClass = magnet ? "k-magnet" : "";

  if (variant === "text") {
    return (
      <Link id={id} href={href} data-magnet={magnet ? "" : undefined} onClick={onClick} className={`k-press ${magnetClass} group inline-flex items-center justify-center gap-1.5 font-semibold text-[var(--k-accent2)] hover:text-[var(--k-accent)] transition-colors whitespace-nowrap ${big ? "text-[18px] py-1" : "text-[14.5px] py-1"}`}>
        <span>{children}</span>
        {arrow}
      </Link>
    );
  }

  if (variant === "ghost") {
    return (
      <Link
        id={id}
        href={href}
        data-magnet={magnet ? "" : undefined}
        onClick={onClick}
        className={`k-press ${magnetClass} group inline-flex items-center justify-center gap-2 rounded-full border border-[var(--k-hairline2)] bg-[var(--k-surface-soft)] font-semibold text-[var(--k-ink)] hover:border-[var(--k-line3)] hover:bg-[var(--k-card2)] transition-colors whitespace-nowrap ${size}`}
      >
        <span>{children}</span>
        {arrow}
      </Link>
    );
  }

  return (
    <Link
      id={id}
      href={href}
      data-magnet={magnet ? "" : undefined}
      onClick={onClick}
      className={`k-press k-sheen ${magnetClass} group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--k-accent)] font-semibold text-white shadow-[0_14px_30px_-14px_rgba(0,102,255,0.55)] hover:bg-[var(--k-accent-h)] hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap ${size}`}
    >
      <span>{children}</span>
      {arrow}
    </Link>
  );
}

function Panel({ children, className = "", innerClassName = "" }: { children: React.ReactNode; className?: string; innerClassName?: string }) {
  return (
    <div className={`k-panel group ${className}`}>
      <div className={`pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,var(--k-tint2),transparent_70%)] opacity-40 transition-opacity duration-500 group-hover:opacity-100`} />
      <div className={`k-panel-inner ${innerClassName}`}>{children}</div>
    </div>
  );
}

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
          className="k-press k-sheen inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--k-accent)] px-6 text-[15px] font-semibold text-white shadow-[0_14px_30px_-14px_rgba(0,102,255,0.55)] hover:bg-[var(--k-accent-h)] hover:-translate-y-0.5 transition-transform"
        >
          {state === "loading" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <>
              Start brewing <ArrowRight size={16} weight="bold" />
            </>
          )}
        </button>
      </div>
      <p className={`min-h-[18px] px-1 text-[13px] ${state === "error" ? "text-[var(--k-c3)]" : "text-[var(--k-faint)]"}`}>
        {state === "error" ? msg : "Free while in beta · no card required."}
      </p>
    </form>
  );
}

function CompareCell({ value }: { value: true | false | "partial" }) {
  if (value === true) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--k-tint)] text-[var(--k-accent2)]">
        <Check size={14} weight="bold" />
      </span>
    );
  }
  if (value === "partial") {
    return <span className="text-[13px] font-medium text-[var(--k-muted)]">Partial</span>;
  }
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--k-surface-soft)] text-[var(--k-faint)]">
      <X size={13} weight="bold" />
    </span>
  );
}

export function KettlesLanding() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

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

    const heroTimer = $("#k-heroTimer");
    const heroMeter = $<HTMLElement>("#k-heroMeter");
    if (heroTimer) {
      let s = 25 * 60;
      const paint = () => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        heroTimer.textContent = `${m < 10 ? "0" : ""}${m}:${sec < 10 ? "0" : ""}${sec}`;
        if (heroMeter) heroMeter.style.width = Math.min(100, (s / (25 * 60)) * 100) + "%";
      };
      paint();
      if (!reduce)
        ivl(() => {
          s = s <= 0 ? 25 * 60 : s - 1;
          paint();
        }, 1000);
    }

    once($("#k-report"), () => {
      $$<HTMLElement>("#k-report [data-w]").forEach((b) => requestAnimationFrame(() => (b.style.width = b.dataset.w || "")));
    }, 0.3);
    once($("#k-barset"), () => {
      $$<HTMLElement>("#k-barset [data-h]").forEach((b) => (b.style.height = b.dataset.h || ""));
    }, 0.4);

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

    const footerSec = $("#k-textured-footer") as HTMLElement | null;
    const footerText = $("#k-footer-big-text") as HTMLElement | null;
    if (footerSec && footerText && !reduce) {
      const letters = Array.from(footerText.children) as HTMLElement[];
      const handleFooterTextScroll = () => {
        const rect = footerSec.getBoundingClientRect();
        const winH = window.innerHeight;
        const visibleAmt = winH - rect.top;
        if (visibleAmt > 0) {
          const totalDistance = rect.height + 150;
          const progress = Math.max(0, Math.min(1, visibleAmt / totalDistance));
          letters.forEach((letter, i) => {
            const invProgress = 1 - progress;
            const tx = invProgress * (80 + i * 20);
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
    ["Which platforms are supported?", "Kettles runs in the browser, plus a native Windows desktop app with a floating always-on-top companion. A browser extension keeps everything in sync."],
    ["Can I export for invoicing?", "Every weekly report exports to PDF or CSV in one click, with hours broken down per client, ready to attach to an invoice or send straight to a client."],
    ["Is my data private?", "Yes. Kettles never takes screenshots, logs keystrokes, or scores your productivity. It records the hours you choose to brew, and nothing else. Read the full Privacy Policy for details."],
    ["Why does Kettles request Google account data?", "Only to sign you in. If you use Sign in with Google, we request your basic profile (name and email) to create or open your Kettles account. We do not access Gmail, Drive, Contacts, or other Google services."],
  ];

  const compareRows: [string, true | false | "partial", true | false | "partial", true | false | "partial"][] = [
    ["Task-linked accuracy", true, "partial", false],
    ["Companion that roots for you", true, false, false],
    ["Calm, surveillance-free UX", true, "partial", false],
    ["Per-client billing reports", true, true, false],
    ["Desktop mini-timer", true, "partial", false],
    ["Survives a tab close", true, true, "partial"],
  ];

  return (
    <BeamsBackground ref={rootRef} className="kettles min-h-[100dvh] bg-transparent" intensity="strong">
      <header
        id="k-nav"
        className="fixed top-0 inset-x-0 z-50 w-full px-4 pt-0 transition-transform duration-300 ease-[var(--k-ease)] [&.k-nav-hide]:-translate-y-[110%]"
      >
        <div className="k-nav-shell relative mx-auto flex h-[58px] items-center justify-between gap-6 rounded-b-2xl border-x border-b border-white/15 bg-[var(--k-bg2)] px-5 text-white shadow-[0_12px_30px_-10px_rgba(0,0,0,0.45)] md:min-w-[720px] md:rounded-b-[24px] md:px-6 md:gap-8 lg:min-w-[860px]">
          <div
            className="pointer-events-none absolute top-0 right-full hidden h-6 w-6 md:block"
            style={{ background: "radial-gradient(circle at left bottom, transparent 23px, rgba(255,255,255,0.15) 23px, rgba(255,255,255,0.15) 24px, var(--k-bg2) 24px)" }}
          />
          <div
            className="pointer-events-none absolute top-0 left-full hidden h-6 w-6 md:block"
            style={{ background: "radial-gradient(circle at right bottom, transparent 23px, rgba(255,255,255,0.15) 23px, rgba(255,255,255,0.15) 24px, var(--k-bg2) 24px)" }}
          />

          <Link href="#top" aria-label="Kettles home" className="group inline-flex items-center">
            <Wordmark className="h-[38px] w-auto text-white md:h-[42px]" />
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
            {NAV_LINKS.map(([l, h]) => (
              <Link
                key={h}
                href={h}
                className="rounded-md px-3 py-1.5 text-[14px] font-medium text-white/55 transition-colors duration-200 hover:bg-white/5 hover:text-white"
              >
                {l}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/auth" className="hidden text-[14px] font-medium text-white/55 transition-colors hover:text-white sm:block">
              Sign in
            </Link>
            <Link
              href="/auth"
              className="k-press k-sheen hidden items-center gap-1.5 rounded-full bg-[var(--k-accent)] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(0,102,255,0.7)] hover:bg-[var(--k-accent-h)] sm:inline-flex"
            >
              Start brewing
              <ArrowIcon className="h-[14px] w-[14px]" />
            </Link>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white md:hidden"
              aria-expanded={navOpen}
              aria-controls="k-mobile-nav"
              aria-label={navOpen ? "Close menu" : "Open menu"}
              onClick={() => setNavOpen((v) => !v)}
            >
              {navOpen ? <X size={16} weight="bold" /> : <List size={16} weight="bold" />}
            </button>
          </div>
        </div>
      </header>

      {navOpen && (
        <div
          id="k-mobile-nav"
          className="fixed inset-0 z-[45] flex flex-col px-4 pt-[72px] md:hidden"
          style={{ backgroundColor: "var(--k-bg)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          onClick={() => setNavOpen(false)}
        >
          <nav
            className="mx-auto w-full max-w-[420px] rounded-2xl border border-white/10 bg-[var(--k-bg2)] p-3 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_LINKS.map(([l, h]) => (
              <Link
                key={h}
                href={h}
                onClick={() => setNavOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-[15px] font-medium text-white/70 hover:bg-white/5 hover:text-white"
              >
                {l}
              </Link>
            ))}
            <Link href="/auth" onClick={() => setNavOpen(false)} className="mt-1 block rounded-xl px-3 py-2.5 text-[15px] font-medium text-white/70 hover:bg-white/5 hover:text-white">
              Sign in
            </Link>
            <Link
              href="/auth"
              onClick={() => setNavOpen(false)}
              className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[var(--k-accent)] px-4 py-2.5 text-[14px] font-semibold text-white"
            >
              Start brewing — free
            </Link>
          </nav>
        </div>
      )}

      <main id="top">
        <section className="relative isolate z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1240px] flex-col items-center justify-between overflow-x-clip px-6 pb-0 pt-[120px] text-center">
          <HeroBackdrop className="k-hero-backdrop pointer-events-none absolute inset-y-0 left-1/2 z-0 h-full w-screen max-w-[100vw] -translate-x-1/2" />
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
            <div className="k-reveal">
              <Eyebrow>Task-linked time tracking</Eyebrow>
            </div>
            <h1 className="k-reveal mt-5 max-w-[18ch] text-[clamp(44px,6.6vw,76px)] font-semibold leading-[1.02] tracking-[-0.04em]">
              Put the kettle on. Get to work.
            </h1>
            <p className="k-reveal mt-6 max-w-[52ch] text-[clamp(17px,1.5vw,20px)] leading-[1.55] text-[var(--k-muted)]">
              Task-linked time tracking that turns deep work into a cozy daily ritual — every minute brews into an accurate, billable record.
            </p>
            <div className="k-reveal mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <PrimaryBtn href="/auth" big magnet>
                Start brewing — free
              </PrimaryBtn>
              <PrimaryBtn href="/auth" big variant="ghost">
                Try the web app
              </PrimaryBtn>
            </div>
            <div className="k-reveal mt-5 flex flex-wrap items-center justify-center gap-2 text-[13px] text-[var(--k-faint)]">
              <span className="inline-flex items-center gap-1.5">
                {(["c1", "c2", "c3", "c4"] as const).map((c) => (
                  <i key={c} className="inline-block h-2 w-2 rounded-full" style={{ background: DOT[c] }} />
                ))}
              </span>
              <span>Free in beta · no card · no client limits</span>
            </div>
          </div>

          <div className="k-reveal relative z-10 mt-12 flex w-full justify-center" data-parallax>
            <div data-parallax-inner className="w-full">
              <HeroVisuals />
            </div>
            <div className="pointer-events-none absolute bottom-4 right-[clamp(0rem,4vw,3.5rem)] z-20">
              <SteamMotif className="k-hero-steam pointer-events-none absolute -right-5 bottom-12 z-0 h-24 w-auto" />
              <LandingPet scale={0.58} className="pointer-events-auto relative z-10" />
            </div>
          </div>
        </section>

        <section id="how" className="relative z-20 -mt-10 border-t border-[var(--k-line)] bg-[var(--k-bg)] py-[120px]">
          <div className="mx-auto max-w-[1180px] px-6">
            <div className="k-reveal mb-8 text-left">
              <Eyebrow>The ritual</Eyebrow>
              <h2 className="mt-4 text-[clamp(32px,3.8vw,48px)] font-semibold tracking-[-0.03em] text-[var(--k-ink)]">
                Three steps. One honest record.
              </h2>
              <p className="mt-4 max-w-[56ch] text-[17px] leading-relaxed text-[var(--k-muted)]">
                No stopwatch guesswork. Pick the task, let the kettle boil, and the time locks itself to the work.
              </p>
            </div>

            <div className="k-reveal mb-8 hidden md:block">
              <div className="k-rail">
                <div id="k-railFill" className="k-rail-fill" />
              </div>
            </div>

            <div id="k-flow" className="k-stagger grid grid-cols-1 gap-6 md:grid-cols-3">
              <div data-step>
                <Panel innerClassName="min-h-[340px] justify-between p-6">
                  <span className="k-mono text-[12px] font-medium text-[var(--k-accent2)]">01</span>
                  <TaskStackArt className="k-step-art pointer-events-none absolute -right-10 -top-7 z-0 w-[min(16rem,78%)]" />
                  <div className="relative z-10 flex h-40 w-full items-center justify-center">
                    <div className="relative h-32 w-40">
                      <div className="absolute top-4 left-0 flex h-28 w-24 -rotate-6 flex-col gap-2 rounded-xl border border-white/10 bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] p-3 shadow-2xl transition-transform duration-500 group-hover:-translate-x-2 group-hover:-rotate-12">
                        <div className="h-1 w-10 rounded-full bg-white/20" />
                        <div className="h-1 w-16 rounded-full bg-white/10" />
                        <div className="h-1 w-12 rounded-full bg-white/10" />
                      </div>
                      <div className="absolute top-0 left-8 flex h-32 w-28 flex-col items-center overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] p-3 shadow-2xl transition-transform duration-500 group-hover:-translate-y-2 group-hover:translate-x-2">
                        <div className="mt-2 mb-2 h-1.5 w-16 self-start rounded-full bg-white/20" />
                        <div className="relative mt-1 flex w-full flex-1 items-end overflow-hidden rounded-lg border border-white/10">
                          <svg viewBox="0 0 100 50" className="h-full w-full text-white opacity-30" preserveAspectRatio="none">
                            <path d="M0,50 Q25,20 50,40 T100,10 L100,50 Z" fill="currentColor" />
                          </svg>
                        </div>
                        <div className="absolute -right-2 -bottom-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-[#0066ff] to-[#3385ff] shadow-[0_0_30px_rgba(0,102,255,0.6)]">
                          <div className="mb-1.5 h-1.5 w-full rotate-12 bg-white/20" />
                          <div className="h-1 w-full rotate-12 bg-white/20" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative z-10 mt-6 flex flex-col gap-2">
                    <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--k-ink)]">Pick a task</h3>
                    <p className="pr-4 text-[14.5px] leading-relaxed text-[var(--k-muted)]">Choose what you&apos;re working on. The timer attaches to that task, not a blank stopwatch.</p>
                  </div>
                </Panel>
              </div>

              <div data-step>
                <Panel innerClassName="min-h-[340px] justify-between p-6">
                  <span className="k-mono text-[12px] font-medium text-[var(--k-accent2)]">02</span>
                  <FocusRingArt className="k-step-art pointer-events-none absolute -right-8 -top-7 z-0 w-[min(15rem,76%)]" />
                  <div className="relative z-10 flex h-40 w-full items-center justify-center">
                    <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] shadow-2xl transition-transform duration-500 group-hover:scale-105">
                      <div className="absolute inset-2 rounded-full border border-white/5" />
                      <div className="absolute top-3 h-1.5 w-1 rounded-full bg-white/20" />
                      <div className="absolute bottom-3 h-1.5 w-1 rounded-full bg-white/20" />
                      <div className="absolute left-3 h-1 w-1.5 rounded-full bg-white/20" />
                      <div className="absolute right-3 h-1 w-1.5 rounded-full bg-white/20" />
                      <div className="absolute inset-0 rotate-45 transition-transform duration-1000 ease-out group-hover:rotate-[405deg]">
                        <div className="absolute bottom-1/2 left-1/2 h-6 w-1.5 origin-bottom -translate-x-1/2 translate-y-px rounded-full bg-white/30" />
                      </div>
                      <div className="absolute inset-0 transition-transform duration-[1500ms] ease-out group-hover:rotate-[1080deg]">
                        <div className="absolute bottom-1/2 left-1/2 h-10 w-1 origin-bottom -translate-x-1/2 translate-y-px rounded-full bg-gradient-to-t from-[#0066ff] to-[#3385ff] shadow-[0_0_12px_rgba(51,133,255,0.6)]" />
                      </div>
                      <div className="z-10 h-2.5 w-2.5 rounded-full bg-[#0066ff] shadow-[0_0_10px_rgba(51,133,255,0.8)]" />
                    </div>
                  </div>
                  <div className="relative z-10 mt-6 flex flex-col gap-2">
                    <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--k-ink)]">The kettle boils</h3>
                    <p className="pr-4 text-[14.5px] leading-relaxed text-[var(--k-muted)]">The timer runs and steam builds. Close the app, switch devices — your brew keeps ticking in the cloud.</p>
                  </div>
                </Panel>
              </div>

              <div data-step>
                <Panel innerClassName="min-h-[340px] justify-between p-6">
                  <span className="k-mono text-[12px] font-medium text-[var(--k-accent2)]">03</span>
                  <div className="relative flex h-40 w-full items-center justify-center">
                    <div className="relative flex h-16 w-48 items-center rounded-full border border-white/10 bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] px-3 shadow-2xl transition-transform duration-500 group-hover:scale-105">
                      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#0066ff] to-[#3385ff] shadow-[0_0_15px_rgba(0,102,255,0.4)]">
                        <Check size={16} weight="bold" className="absolute text-white transition-all duration-300 group-hover:scale-75 group-hover:opacity-0" />
                        <Lock size={15} weight="bold" className="absolute scale-75 text-white opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
                      </div>
                      <div className="ml-3 flex h-6 w-28 items-center rounded-full border border-black bg-[#0a0a0a] px-1 shadow-inner">
                        <div className="h-4 w-2/3 rounded-full bg-gradient-to-r from-[#0066ff] to-[#3385ff] shadow-[0_0_10px_rgba(51,133,255,0.4)] transition-all duration-500 ease-out group-hover:w-[92%]" />
                      </div>
                    </div>
                  </div>
                  <div className="relative z-10 mt-6 flex flex-col gap-2">
                    <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--k-ink)]">Time locks to the task</h3>
                    <p className="pr-4 text-[14.5px] leading-relaxed text-[var(--k-muted)]">When the brew is done, the minutes seal to the task. No guessing, no backfilling, no rounding up.</p>
                  </div>
                </Panel>
              </div>
            </div>
          </div>
        </section>

        <section className="k-light-band border-y border-[var(--k-line)] py-[120px]">
          <div className="mx-auto max-w-[1180px] px-6">
            <div className="k-reveal max-w-[640px]">
              <Eyebrow>The cold cup</Eyebrow>
              <h2 className="mt-4 text-[clamp(32px,3.8vw,48px)] font-semibold leading-[1.08] tracking-[-0.03em]">
                Your logged hours don&apos;t match your real work.
              </h2>
              <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-[var(--k-muted)]">
                Guessed timesheets quietly cost you money and trust. Kettles fixes the leak at the source — an honest record, not a story you reconstruct on Friday.
              </p>
            </div>
            <div className="k-stagger mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
              {[
                { icon: Coins, title: "Underbilling", body: "Forgotten minutes are unpaid minutes.", accent: "var(--k-c3)" },
                { icon: WarningOctagon, title: "The distraction tax", body: "You worked all day. Where did it go?", accent: "var(--k-accent2)" },
                { icon: LockKey, title: "Broken self-trust", body: "If the log lies, you stop trusting it.", accent: "var(--k-c1)" },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.title}
                    className="k-prob rounded-[22px] border border-[var(--k-line)] bg-[var(--k-card)] p-7"
                    style={{ "--acc": card.accent } as React.CSSProperties}
                  >
                    <span
                      className="grid h-11 w-11 place-items-center rounded-2xl border"
                      style={{
                        color: card.accent,
                        borderColor: `color-mix(in srgb, ${card.accent} 28%, transparent)`,
                        background: `color-mix(in srgb, ${card.accent} 10%, transparent)`,
                      }}
                    >
                      <Icon size={20} weight="bold" />
                    </span>
                    <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.02em] text-[var(--k-ink)]">{card.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-[var(--k-muted)]">{card.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="features" className="k-texture relative overflow-hidden border-y border-[var(--k-line)] bg-[var(--k-bg)] py-[120px]">
          <SectionDivider className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[clamp(3.5rem,8vw,7rem)] w-full opacity-60" />
          <Image
            src="/images/bg-circle.png"
            alt=""
            aria-hidden
            width={1440}
            height={1440}
            priority={false}
            className="pointer-events-none absolute top-1/2 left-1/2 z-0 w-[min(1650px,125vw)] max-w-none -translate-x-1/2 -translate-y-1/2 select-none opacity-80 [mask-image:radial-gradient(circle_at_center,#000_42%,transparent_78%)]"
          />
          <div className="relative z-10">
            <WorkflowPreview />
          </div>
        </section>

        <section className="relative z-10 border-y border-[var(--k-line)] bg-[var(--k-bg2)] py-[120px]">
          <div className="mx-auto max-w-[1180px] px-6">
            <div className="k-reveal mx-auto max-w-[740px] text-center">
              <Eyebrow>The companion</Eyebrow>
              <h2 className="mt-4 text-[clamp(32px,3.8vw,48px)] font-semibold tracking-[-0.03em]">You&apos;re not focusing alone.</h2>
              <p className="mx-auto mt-5 max-w-[56ch] text-[17px] leading-relaxed text-[var(--k-muted)]">
                Your kettle stays warm while you work, whistles when a brew is done, and wanders off when you go cold. Keep your streak. Keep the kettle on.
              </p>
            </div>
            <div className="mt-14 grid grid-cols-1 gap-[18px] lg:grid-cols-12">
              <article className="k-interactive-card group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-[var(--k-line)] bg-[var(--k-card)] p-10 lg:col-span-6 lg:row-span-2 lg:min-h-[420px]">
                <div className="flex flex-1 items-center justify-center py-6">
                  <Kettle size={140} />
                </div>
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--k-line2)] bg-[var(--k-bg2)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--k-ink2)]">
                    <i className="k-live-dot" /> Brewing
                  </span>
                  <h3 className="mt-3 text-[22px] font-semibold tracking-[-0.02em]">Steaming along</h3>
                  <p className="mt-1.5 max-w-[40ch] text-[15px] text-[var(--k-muted)]">While you focus, it stays warm and whistles the moment the brew is done.</p>
                </div>
              </article>
              <CompanionState tone="idle" pill="Idle" title="Taking a breather" desc="On a break, it cools down quietly. No alarms, no nagging." />
              <CompanionState tone="lost" pill="Lost" title="Gone cold" desc="Go quiet too long and it wanders off. Start a brew and it comes right back." />
            </div>
          </div>
        </section>

        <PetShowcase />

        <section id="ledger" className="relative z-10 border-y border-[var(--k-line)] bg-[var(--k-bg)] py-[120px]">
          <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-6 lg:grid-cols-12">
            <div className="k-reveal lg:col-span-5">
              <Eyebrow>The ledger</Eyebrow>
              <h2 className="mt-4 text-[clamp(32px,3.8vw,48px)] font-semibold tracking-[-0.03em] text-[var(--k-ink)]">
                The source of truth for your income.
              </h2>
              <p className="mt-5 max-w-[48ch] text-[17px] leading-relaxed text-[var(--k-muted)]">
                Every brew rolls up into a weekly report — hours per client, ready to invoice. Export to PDF in one click.
              </p>
              <div className="mt-8">
                <PrimaryBtn href="/auth">See it in the app</PrimaryBtn>
              </div>
            </div>
            <div id="k-report" className="k-reveal lg:col-span-7">
              <div className="overflow-hidden rounded-[24px] border border-[var(--k-hairline2)] bg-[var(--k-card)] p-7 shadow-[0_24px_50px_-28px_rgba(0,0,0,0.55)]">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--k-faint)]">This week</p>
                    <p className="mt-1 text-[15px] font-semibold text-[var(--k-ink)]">Hours by client</p>
                  </div>
                  <span className="rounded-full border border-[var(--k-tint2)] bg-[var(--k-tint)] px-3 py-1 text-[12px] font-medium text-[var(--k-accent2)]">
                    Export PDF
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {[
                    ["Northwind", "c2", "13.2", "92%"],
                    ["Harbor Co.", "c1", "9.8", "68%"],
                    ["Lumen", "c3", "8.0", "56%"],
                    ["Field Notes", "c4", "7.5", "52%"],
                  ].map(([name, c, hours, w]) => (
                    <div key={name}>
                      <div className="mb-1.5 flex items-center justify-between text-[13px]">
                        <span className="inline-flex items-center gap-2 font-medium text-[var(--k-ink)]">
                          <i className="h-2 w-2 rounded-full" style={{ background: DOT[c] }} />
                          {name}
                        </span>
                        <span className="k-mono text-[var(--k-muted)]">{hours}h</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--k-bg2)]">
                        <i data-w={w} className="block h-full rounded-full bg-[var(--k-accent)]" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-baseline justify-between border-t border-[var(--k-hairline)] pt-5">
                  <span className="text-[13px] text-[var(--k-muted)]">Ready to invoice</span>
                  <span className="k-mono text-[28px] font-semibold tracking-[-0.03em] text-[var(--k-ink)]">
                    $<span data-count="3840" data-decimals="0">0</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="k-light-band border-y border-[var(--k-line)] py-[120px]">
          <div className="mx-auto max-w-[1180px] px-6">
            <div className="k-reveal mx-auto max-w-[640px] text-center">
              <Eyebrow>Deep work, calmly</Eyebrow>
              <h2 className="mt-4 text-[clamp(32px,3.8vw,48px)] font-semibold tracking-[-0.03em]">
                Focus that doesn&apos;t burn you out.
              </h2>
              <p className="mx-auto mt-5 max-w-[54ch] text-[17px] leading-relaxed text-[var(--k-muted)]">
                Brews and breaks. Gentle whistles. No red-alert surveillance. A tool that respects your attention.
              </p>
            </div>
            <div className="k-stagger mx-auto mt-12 grid max-w-[960px] grid-cols-1 gap-5 md:grid-cols-3">
              {[
                ["Brews, not marathons", "Focus in 25-minute pours with room to cool off. Session complete is a receipt, not a celebration."],
                ["Gentle, not loud", "A whistle when the kettle's done. No productivity scores, no red dashboards watching you."],
                ["Always yours", "The ledger stays accurate because you chose the task — not because something screened your desktop."],
              ].map(([title, body]) => (
                <article key={title} className="rounded-[22px] border border-[var(--k-line)] bg-[var(--k-card)] p-7">
                  <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--k-ink)]">{title}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--k-muted)]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="security" className="relative z-10 border-y border-[var(--k-line)] bg-[var(--k-bg2)] py-16 md:py-20">
          <div className="mx-auto max-w-[900px] px-6 text-center">
            <p className="k-reveal text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--k-accent2)]">Privacy &amp; account data</p>
            <h2 className="k-reveal mt-3 text-[clamp(26px,3.4vw,40px)] font-semibold tracking-[-0.03em] text-[var(--k-ink)]">
              Why Kettles asks for your account data
            </h2>
            <p className="k-reveal mt-4 text-[16px] leading-relaxed text-[var(--k-muted)]">
              <span className="font-semibold text-[var(--k-ink)]">No screenshots. No keystroke spying. No productivity scores.</span>{" "}
              Just an accurate time record you own.
            </p>

            <div className="k-stagger mt-10 grid gap-4 text-left sm:grid-cols-2">
              <div className="k-interactive-card rounded-2xl border border-[var(--k-line2)] bg-[var(--k-card)] p-5">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--k-line2)] bg-[var(--k-tint)] text-[var(--k-accent2)]">
                  <User size={18} weight="bold" />
                </div>
                <h3 className="text-[15px] font-semibold text-[var(--k-ink)]">Sign-in only</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--k-muted)]">
                  If you sign in with Google, Kettles requests your basic Google profile — name and
                  email — only to create or open your account and keep your workspace secure. We do
                  not read Gmail, Drive, Calendar, Contacts, or other Google services.
                </p>
              </div>
              <div className="k-interactive-card rounded-2xl border border-[var(--k-line2)] bg-[var(--k-card)] p-5">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--k-line2)] bg-[var(--k-tint)] text-[var(--k-accent2)]">
                  <LockKey size={18} weight="bold" />
                </div>
                <h3 className="text-[15px] font-semibold text-[var(--k-ink)]">What we store</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--k-muted)]">
                  Account identity plus the work data you create: clients, projects, tasks, and time
                  sessions. That data powers timers, reports, and billing. We do not sell your
                  personal information or use it for third-party advertising.
                </p>
              </div>
            </div>

            <p className="k-reveal mt-8 text-[14px] leading-relaxed text-[var(--k-muted)]">
              Full details are in our{" "}
              <Link href="/legal/privacy" className="k-link-draw font-semibold text-[var(--k-accent2)]">
                Privacy Policy
              </Link>
              {" "}and{" "}
              <Link href="/legal/terms" className="k-link-draw font-semibold text-[var(--k-accent2)]">
                Terms of Service
              </Link>
              . Both are public — no login required.
            </p>

            <div className="k-reveal mt-8 flex flex-wrap justify-center gap-3">
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

        <section id="reviews" className="relative overflow-hidden border-y border-[var(--k-line)] py-[120px]">
          <div className="relative z-10 mx-auto flex max-w-[1180px] flex-col gap-6 px-6">
            <div className="k-reveal mx-auto mb-6 max-w-[740px] text-center">
              <Eyebrow>From the studio</Eyebrow>
              <h2 className="mt-4 text-[clamp(32px,3.8vw,48px)] font-semibold tracking-[-0.035em] text-[var(--k-ink)]">People love using Kettles.</h2>
              <p className="mx-auto mt-4 max-w-[56ch] text-[17px] leading-relaxed text-[var(--k-muted)]">
                Built for freelancers and small teams who bill real hours, not guessed ones.
              </p>
            </div>

            <div className="k-stagger grid w-full grid-cols-1 items-stretch gap-6 md:grid-cols-12">
              <div className="md:col-span-7">
                <Panel innerClassName="min-h-[440px] justify-between p-8 md:p-12">
                  <div className="relative z-10 flex w-full justify-center">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] shadow-2xl transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-105">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-white" aria-hidden>
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </div>
                  </div>
                  <div className="relative z-10 my-8 text-center">
                    <p className="mx-auto max-w-[22ch] text-[22px] font-semibold leading-snug tracking-tight text-[var(--k-ink)] md:text-[26px] lg:text-[30px]">
                      &ldquo;Once you experience using Kettles to track your work, there is no going back.&rdquo;
                    </p>
                  </div>
                  <div className="relative z-10 flex justify-center">
                    <div className="flex items-center gap-3 rounded-full border border-[var(--k-hairline2)] bg-[var(--k-surface-soft)] px-4 py-2 backdrop-blur-md">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] text-[10px] font-bold text-white uppercase">
                        SS
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[13px] leading-tight font-semibold text-[var(--k-ink)]">Samreshan Sahani</span>
                        <span className="mt-0.5 text-[11px] leading-none text-[var(--k-muted)]">Creative Director</span>
                      </div>
                    </div>
                  </div>
                </Panel>
              </div>

              <div className="flex flex-col justify-between gap-6 md:col-span-5">
                <Panel innerClassName="min-h-[208px] items-center justify-center gap-3 p-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] shadow-xl transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-105">
                    <Check size={22} className="text-white" weight="bold" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold tracking-tight text-[var(--k-ink)]">Task-linked by default</h4>
                    <p className="mt-1.5 max-w-[220px] text-[12.5px] leading-relaxed text-[var(--k-muted)]">
                      Every brew attaches to a task, so the weekly report is ready to bill without reconstruction.
                    </p>
                  </div>
                </Panel>
                <Panel innerClassName="min-h-[208px] items-center justify-center gap-3 p-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,#05080d_0%,#061733_50%,#072a63_100%)] shadow-xl transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-105">
                    <ArrowsClockwise size={22} className="text-white" weight="bold" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold tracking-tight text-[var(--k-ink)]">Survives tab closes</h4>
                    <p className="mt-1.5 max-w-[220px] text-[12.5px] leading-relaxed text-[var(--k-muted)]">
                      Sessions sync to the cloud. Close the browser, switch devices — the brew keeps ticking.
                    </p>
                  </div>
                </Panel>
              </div>
            </div>

            <div id="pricing" className="k-reveal mt-2 overflow-hidden rounded-3xl border border-[var(--k-hairline2)] bg-gradient-to-br from-[var(--k-card2)] to-[var(--k-card)] shadow-2xl">
              <div className="grid grid-cols-1 items-center gap-10 p-10 md:grid-cols-12 md:p-12">
                <div className="md:col-span-7">
                  <Eyebrow>Pricing</Eyebrow>
                  <h3 className="mt-3 text-[clamp(24px,3vw,36px)] font-semibold leading-tight tracking-[-0.035em] text-[var(--k-ink)]">Start free. Brew on.</h3>
                  <p className="mt-3.5 max-w-[52ch] text-[16px] leading-relaxed text-[var(--k-muted)]">
                    Track every client and the whole ritual at no cost while Kettles is in beta. No gates, no trial clock.
                  </p>
                  <div className="mt-6">
                    <PrimaryBtn href="/auth" big magnet>
                      Start brewing — free
                    </PrimaryBtn>
                  </div>
                </div>
                <div className="md:col-span-5 md:border-l md:border-[var(--k-hairline2)] md:pl-12">
                  <div className="flex items-baseline gap-2">
                    <span className="k-mono text-[52px] font-semibold tracking-[-0.035em] text-[var(--k-ink)]">$0</span>
                    <span className="text-[14px] text-[var(--k-muted)]">in beta</span>
                  </div>
                  <p className="mt-1 text-[14px] text-[var(--k-muted)]">No client limits, no feature gates.</p>
                  <p className="mt-5 text-[12px] text-[var(--k-faint)]">No card required · cancel nothing, because nothing is charged</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="compare" className="relative z-10 border-y border-[var(--k-line)] bg-[var(--k-bg2)] py-[120px]">
          <div className="mx-auto max-w-[1180px] px-6">
            <div className="k-reveal mx-auto max-w-[640px] text-center">
              <Eyebrow>Why Kettles</Eyebrow>
              <h2 className="mt-4 text-[clamp(32px,3.8vw,48px)] font-semibold tracking-[-0.03em]">A tracker that isn&apos;t surveillance.</h2>
              <p className="mx-auto mt-4 max-w-[52ch] text-[17px] leading-relaxed text-[var(--k-muted)]">
                Accuracy and warmth in the same product — without a dashboard that watches you work.
              </p>
            </div>
            <div className="k-reveal mt-12 overflow-x-auto rounded-[24px] border border-[var(--k-hairline)] bg-[var(--k-card)]">
              <table className="k-compare w-full min-w-[640px] text-left">
                <thead>
                  <tr className="text-[13px] text-[var(--k-muted)]">
                    <th className="px-6 py-4 font-medium"> </th>
                    <th className="k-compare-hl px-6 py-4 font-semibold text-[var(--k-ink)]">Kettles</th>
                    <th className="px-6 py-4 font-medium">Toggl</th>
                    <th className="px-6 py-4 font-medium">RescueTime</th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map(([label, k, t, r]) => (
                    <tr key={label} className="text-[14px]">
                      <td className="px-6 py-4 font-medium text-[var(--k-ink2)]">{label}</td>
                      <td className="k-compare-hl px-6 py-4"><CompareCell value={k} /></td>
                      <td className="px-6 py-4"><CompareCell value={t} /></td>
                      <td className="px-6 py-4"><CompareCell value={r} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="faq" className="k-light-band relative z-10 border-t border-[var(--k-line)] py-[120px]">
          <div className="mx-auto max-w-[720px] px-6">
            <div className="k-reveal text-center">
              <Eyebrow>FAQ</Eyebrow>
              <h2 className="mt-4 text-[clamp(28px,3.4vw,40px)] font-semibold tracking-[-0.03em] text-[var(--k-ink)]">
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
                    className={`overflow-hidden rounded-2xl border bg-[var(--k-card)] transition-colors ${open ? "border-[var(--k-line2)]" : "border-[var(--k-line)] hover:border-[var(--k-line2)]"}`}
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
                    <div className={`k-faq-body ${open ? "k-open" : ""}`}>
                      <div>
                        <div className="border-t border-[var(--k-line)] px-5 pt-3 pb-5">
                          <p className="text-[14.5px] leading-relaxed text-[var(--k-muted)]">{a}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="download" className="border-t border-[var(--k-line)] bg-[var(--k-bg)] px-6 py-[120px]">
          <div className="relative mx-auto max-w-[1180px] overflow-hidden rounded-[32px] border border-[color-mix(in_srgb,#0066ff_28%,#1e1f20)] k-grad px-6 py-16 text-center md:px-16 md:py-20">
            <div id="k-finalSteam" className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 opacity-70" aria-hidden>
              <Kettle size={88} />
            </div>
            <div className="relative z-10 mx-auto mt-24 flex max-w-[640px] flex-col items-center">
              <h2 className="k-reveal text-[clamp(32px,3.8vw,48px)] font-semibold tracking-[-0.03em] text-white">
                The kettle&apos;s ready when you are.
              </h2>
              <p className="k-reveal mx-auto mt-4 max-w-[48ch] text-[17px] leading-relaxed text-white/70">
                Drop your email and pick up in the app. Every minute from here brews into a record you can bill.
              </p>
              <div id="k-finalCta" className="k-reveal mt-10 w-full max-w-[460px]">
                <EmailCapture />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[var(--k-line)] px-6 pt-20 pb-12" style={{ backgroundColor: "var(--k-bg)" }}>
        <div className="mx-auto max-w-[1180px]">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="group relative flex min-h-[220px] flex-col justify-between gap-8 overflow-hidden rounded-3xl border border-[var(--k-hairline)] bg-[var(--k-surface-soft)]/20 p-8 backdrop-blur-md transition-all duration-300 hover:border-[var(--k-hairline2)] hover:bg-[var(--k-surface-soft)]/30 lg:col-span-4">
              <div className="pointer-events-none absolute -top-20 -left-20 h-48 w-48 rounded-full bg-gradient-to-br from-[#3385ff]/10 to-transparent opacity-50 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative z-10">
                <Wordmark className="h-7 w-auto text-[var(--k-ink)]" />
                <p className="mt-4 max-w-[28ch] text-[14px] leading-relaxed font-medium text-[var(--k-muted)]">
                  Task-linked time tracking, made for focused work.
                </p>
              </div>
              <div className="relative z-10">
                <PrimaryBtn href="/auth">Start brewing — free</PrimaryBtn>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:col-span-8">
              {[
                ["Product", [["Features", "#features"], ["How it works", "#how"], ["Pricing", "#pricing"], ["Download", "#download"]]],
                ["Explore", [["Reviews", "#reviews"], ["Compare", "#compare"], ["FAQ", "#faq"], ["Companion", "#desktop-pet"]]],
                ["Account", [["Sign in", "/auth"], ["Start free", "/auth"], ["Security", "#security"]]],
                ["Legal", [["Privacy", "/legal/privacy"], ["Terms", "/legal/terms"]]],
              ].map(([h, links]) => (
                <div key={h as string}>
                  <h5 className="mb-4 text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--k-muted)]">{h as string}</h5>
                  {(links as [string, string][]).map(([l, href]) => (
                    <Link key={l} href={href} className="k-link-draw block w-fit py-1.5 text-[13.5px] font-medium text-[var(--k-faint)] hover:text-[var(--k-ink)]">
                      {l}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-[var(--k-hairline)] pt-8 sm:flex-row">
            <p className="text-[13px] font-medium text-[var(--k-faint)]">© 2026 Kettles. Made for focused work.</p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12.5px] font-medium text-[var(--k-faint)]">
              <Link href="/legal/privacy" className="k-link-draw hover:text-[var(--k-ink)]">Privacy Policy</Link>
              <span className="opacity-30" aria-hidden>•</span>
              <Link href="/legal/terms" className="k-link-draw hover:text-[var(--k-ink)]">Terms of Service</Link>
              <span className="opacity-30" aria-hidden>•</span>
              <Link href="#faq" className="k-link-draw hover:text-[var(--k-ink)]">FAQ</Link>
            </div>
          </div>
        </div>
      </footer>

      <section id="k-textured-footer" className="relative h-[400px] w-full overflow-hidden bg-[var(--k-bg)]">
        <div className="k-tf-glow absolute -bottom-[40%] left-1/2 h-[80%] w-[100%] max-w-[1200px] -translate-x-1/2 rounded-[100%] bg-blue-600/40 blur-[100px]" />
        <div className="k-tf-glow absolute -bottom-[20%] left-1/2 h-[50%] w-[60%] max-w-[800px] -translate-x-1/2 rounded-[100%] bg-blue-500/60 blur-[80px]" />
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center pt-10 select-none">
          <span id="k-footer-big-text" className="text-[clamp(80px,20vw,360px)] leading-none font-black tracking-[-0.05em] whitespace-nowrap text-white opacity-90 mix-blend-overlay drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] select-none">
            {Array.from("KETTLES").map((char, index) => (
              <span key={index} className="inline-block will-change-transform">
                {char}
              </span>
            ))}
          </span>
        </div>
        <div className="absolute inset-0 mx-auto grid max-w-[1180px] grid-cols-5 px-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`h-full w-full border-r border-dashed border-[var(--k-hairline2)] ${i === 0 ? "border-l" : ""}`} />
          ))}
        </div>
        <div
          className="k-tf-grain pointer-events-none absolute inset-0 z-10 opacity-[0.15] mix-blend-overlay"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
        />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[var(--k-bg)] to-transparent" />
      </section>
    </BeamsBackground>
  );
}

function CompanionState({ tone, pill, title, desc }: { tone: "idle" | "lost"; pill: string; title: string; desc: string }) {
  return (
    <article className="k-interactive-card flex items-center gap-5 rounded-[24px] border border-[var(--k-line)] bg-[var(--k-card)] p-7 lg:col-span-6">
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

export default KettlesLanding;
