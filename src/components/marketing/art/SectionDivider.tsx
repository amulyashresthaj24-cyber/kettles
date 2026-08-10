import { useId, type SVGProps } from "react";

export type SectionDividerProps = SVGProps<SVGSVGElement>;

/** A low-contrast steam-wave transition between marketing sections. */
export function SectionDivider({ className, ...props }: SectionDividerProps) {
  const instanceId = useId().replace(/:/g, "");
  const waveId = `section-wave-${instanceId}`;
  const mistId = `section-mist-${instanceId}`;

  return (
    <svg
      {...props}
      className={className}
      viewBox="0 0 1440 140"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={waveId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--card-gradient-start)" />
          <stop offset="0.52" stopColor="var(--card-gradient-mid)" />
          <stop offset="1" stopColor="var(--card-gradient-end)" />
        </linearGradient>
        <linearGradient id={mistId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      <path d="M0 86C230 28 415 34 606 81c210 52 372 46 546-6 101-30 197-31 288-4v69H0Z" fill={`url(#${waveId})`} fillOpacity="0.62" />
      <path d="M0 109c204-38 393-30 588 8 210 40 387 22 557-24 110-30 208-29 295-7v54H0Z" fill={`url(#${mistId})`} />
      <path
        d="M0 84C230 26 415 32 606 79c210 52 372 46 546-6 101-30 197-31 288-4"
        fill="none"
        stroke="var(--border-subtle)"
        strokeWidth="2"
      />
    </svg>
  );
}

export default SectionDivider;
