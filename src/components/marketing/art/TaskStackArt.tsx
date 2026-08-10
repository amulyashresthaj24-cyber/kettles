import { useId, type SVGProps } from "react";

export type TaskStackArtProps = SVGProps<SVGSVGElement>;

/** A staggered stack that connects chosen tasks to completed work. */
export function TaskStackArt({ className, ...props }: TaskStackArtProps) {
  const instanceId = useId().replace(/:/g, "");
  const cardId = `task-card-${instanceId}`;
  const accentId = `task-accent-${instanceId}`;

  return (
    <svg
      {...props}
      className={className}
      viewBox="0 0 360 300"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={cardId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--surface-raised)" />
          <stop offset="1" stopColor="var(--card-gradient-start)" />
        </linearGradient>
        <linearGradient id={accentId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--accent-hover)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>

      <rect x="50" y="58" width="250" height="154" rx="25" fill="var(--surface-mid)" stroke="var(--border-subtle)" strokeWidth="2" transform="rotate(-7 175 135)" />
      <rect x="70" y="72" width="244" height="158" rx="25" fill="var(--card-gradient-mid)" stroke="var(--border)" strokeWidth="2" transform="rotate(4 192 151)" />
      <rect x="45" y="83" width="258" height="164" rx="27" fill={`url(#${cardId})`} stroke="var(--border)" strokeWidth="2" />

      <rect x="70" y="111" width="20" height="20" rx="7" fill={`url(#${accentId})`} />
      <path d="m76 121 4 4 7-9" stroke="var(--surface-raised)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M105 116h109" stroke="var(--text-secondary)" strokeWidth="8" strokeLinecap="round" />
      <path d="M105 133h72" stroke="var(--text-faint)" strokeOpacity="0.45" strokeWidth="5" strokeLinecap="round" />

      <rect x="70" y="160" width="20" height="20" rx="7" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="2" />
      <path d="M105 165h128" stroke="var(--text-secondary)" strokeOpacity="0.7" strokeWidth="8" strokeLinecap="round" />
      <path d="M105 182h91" stroke="var(--text-faint)" strokeOpacity="0.38" strokeWidth="5" strokeLinecap="round" />

      <rect x="70" y="209" width="20" height="20" rx="7" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="2" />
      <path d="M105 214h91" stroke="var(--text-secondary)" strokeOpacity="0.55" strokeWidth="8" strokeLinecap="round" />
      <circle cx="280" cy="225" r="35" fill="var(--accent-dim)" />
      <circle cx="280" cy="225" r="22" fill="var(--accent)" />
      <path d="M270 225h20M280 215v20" stroke="var(--surface-raised)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="42" cy="62" r="5" fill="var(--accent)" fillOpacity="0.28" />
    </svg>
  );
}

export default TaskStackArt;
