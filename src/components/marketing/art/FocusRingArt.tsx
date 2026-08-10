import { useId, type SVGProps } from "react";

export type FocusRingArtProps = SVGProps<SVGSVGElement>;

/** A task-linked focus timer rendered as a calm, open ring. */
export function FocusRingArt({ className, ...props }: FocusRingArtProps) {
  const instanceId = useId().replace(/:/g, "");
  const faceId = `focus-face-${instanceId}`;
  const haloId = `focus-halo-${instanceId}`;

  return (
    <svg
      {...props}
      className={className}
      viewBox="0 0 340 300"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={faceId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--surface-raised)" />
          <stop offset="1" stopColor="var(--card-gradient-mid)" />
        </linearGradient>
        <radialGradient id={haloId} cx="0" cy="0" r="1" gradientTransform="translate(0.5 0.5) scale(0.5)">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="169" cy="158" rx="148" ry="132" fill={`url(#${haloId})`} />
      <path d="M151 34h38" stroke="var(--border)" strokeWidth="12" strokeLinecap="round" />
      <path d="M170 34v17" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" />
      <path d="M257 74l12 12" stroke="var(--border)" strokeWidth="8" strokeLinecap="round" />
      <circle cx="170" cy="157" r="91" fill={`url(#${faceId})`} stroke="var(--border-subtle)" strokeWidth="2" />
      <circle cx="170" cy="157" r="74" fill="none" stroke="var(--border)" strokeWidth="12" strokeOpacity="0.68" />
      <circle
        cx="170"
        cy="157"
        r="74"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray="322 466"
        transform="rotate(-90 170 157)"
      />
      <path d="M170 157l33-28" stroke="var(--text-secondary)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="170" cy="157" r="8" fill="var(--accent-hover)" />
      <path
        d="M94 224c25 18 54 27 88 25 38-2 68-18 89-47"
        stroke="var(--accent)"
        strokeOpacity="0.22"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="70" cy="96" r="7" fill="var(--accent-dim)" />
      <circle cx="286" cy="183" r="5" fill="var(--accent)" fillOpacity="0.28" />
    </svg>
  );
}

export default FocusRingArt;
