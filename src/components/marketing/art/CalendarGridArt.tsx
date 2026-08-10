import { useId, type SVGProps } from "react";

export type CalendarGridArtProps = SVGProps<SVGSVGElement>;

/** A loosely cropped calendar with one deliberate, protected focus lane. */
export function CalendarGridArt({ className, ...props }: CalendarGridArtProps) {
  const instanceId = useId().replace(/:/g, "");
  const panelId = `calendar-panel-${instanceId}`;
  const slotId = `calendar-slot-${instanceId}`;

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
        <linearGradient id={panelId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--surface-raised)" />
          <stop offset="1" stopColor="var(--card-gradient-start)" />
        </linearGradient>
        <linearGradient id={slotId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--card-gradient-end)" />
          <stop offset="1" stopColor="var(--accent-dim)" />
        </linearGradient>
      </defs>

      <path
        d="M54 48h246c15 0 27 12 27 27v164c0 15-12 27-27 27H54c-15 0-27-12-27-27V75c0-15 12-27 27-27Z"
        fill={`url(#${panelId})`}
        stroke="var(--border)"
        strokeWidth="2"
      />
      <path d="M28 98h298" stroke="var(--border)" strokeWidth="2" />
      <path d="M92 49v216M151 99v166M210 99v166M269 99v166" stroke="var(--border-subtle)" strokeWidth="1.5" />
      <path d="M28 153h298M28 209h298" stroke="var(--border-subtle)" strokeWidth="1.5" />
      <path d="M82 33v31M271 33v31" stroke="var(--accent-hover)" strokeWidth="9" strokeLinecap="round" />
      <path d="M54 77h60" stroke="var(--text-secondary)" strokeWidth="8" strokeLinecap="round" />
      <path d="M249 77h47" stroke="var(--text-faint)" strokeOpacity="0.45" strokeWidth="6" strokeLinecap="round" />

      <rect x="158" y="108" width="45" height="37" rx="10" fill={`url(#${slotId})`} stroke="var(--accent)" strokeOpacity="0.38" strokeWidth="1.5" />
      <rect x="217" y="161" width="45" height="40" rx="10" fill="var(--accent-dim)" />
      <rect x="99" y="216" width="45" height="40" rx="10" fill="var(--surface-mid)" />
      <circle cx="180" cy="126" r="5" fill="var(--accent)" />
      <path d="M223 181h33" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M105 236h24" stroke="var(--text-faint)" strokeOpacity="0.45" strokeWidth="5" strokeLinecap="round" />
      <circle cx="329" cy="123" r="6" fill="var(--accent)" fillOpacity="0.24" />
      <circle cx="41" cy="274" r="4" fill="var(--accent-hover)" fillOpacity="0.32" />
    </svg>
  );
}

export default CalendarGridArt;
