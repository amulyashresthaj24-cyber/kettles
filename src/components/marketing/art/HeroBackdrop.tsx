import { useId, type SVGProps } from "react";

export type HeroBackdropProps = SVGProps<SVGSVGElement>;

/** A quiet, atmospheric field for the landing hero. */
export function HeroBackdrop({ className, ...props }: HeroBackdropProps) {
  const instanceId = useId().replace(/:/g, "");
  const washId = `hero-wash-${instanceId}`;
  const glowId = `hero-glow-${instanceId}`;
  const gridId = `hero-grid-${instanceId}`;

  return (
    <svg
      {...props}
      className={className}
      viewBox="0 0 1440 760"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={washId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--card-gradient-start)" />
          <stop offset="0.52" stopColor="var(--card-gradient-mid)" />
          <stop offset="1" stopColor="var(--card-gradient-end)" />
        </linearGradient>
        <radialGradient id={glowId} cx="0" cy="0" r="1" gradientTransform="translate(0.5 0.5) scale(0.5)">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.2" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        <pattern id={gridId} width="52" height="52" patternUnits="userSpaceOnUse">
          <path d="M 52 0 L 0 0 0 52" stroke="var(--border-subtle)" strokeWidth="1" />
          <circle cx="0" cy="0" r="1.5" fill="var(--accent)" fillOpacity="0.22" />
        </pattern>
      </defs>

      <path
        d="M-96 148C119 23 331 26 501 125c173 101 246 39 392-33 173-85 401-52 633 111v557H-96Z"
        fill={`url(#${washId})`}
        fillOpacity="0.64"
      />
      <ellipse cx="1128" cy="188" rx="362" ry="292" fill={`url(#${glowId})`} />
      <ellipse cx="216" cy="522" rx="292" ry="220" fill="var(--accent-dim)" fillOpacity="0.72" />
      <path
        d="M-18 596C204 493 366 481 559 534c192 53 325 42 477-29 127-59 261-69 422-29"
        stroke="var(--accent)"
        strokeOpacity="0.13"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M-14 631C202 549 390 540 575 585c177 43 306 27 466-40 125-52 260-63 413-30"
        stroke="var(--border)"
        strokeOpacity="0.56"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <rect x="0" y="0" width="1440" height="760" fill={`url(#${gridId})`} fillOpacity="0.52" />
      <circle cx="1224" cy="430" r="7" fill="var(--accent)" fillOpacity="0.32" />
      <circle cx="1262" cy="393" r="3" fill="var(--accent-hover)" fillOpacity="0.42" />
      <circle cx="183" cy="224" r="5" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1" />
    </svg>
  );
}

export default HeroBackdrop;
