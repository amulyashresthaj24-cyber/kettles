import { useId, type SVGProps } from "react";

export type ReportSparkArtProps = SVGProps<SVGSVGElement>;

/** An invoice-ready weekly report with a single legible upward story. */
export function ReportSparkArt({ className, ...props }: ReportSparkArtProps) {
  const instanceId = useId().replace(/:/g, "");
  const panelId = `report-panel-${instanceId}`;
  const areaId = `report-area-${instanceId}`;

  return (
    <svg
      {...props}
      className={className}
      viewBox="0 0 380 300"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={panelId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--surface-raised)" />
          <stop offset="1" stopColor="var(--card-gradient-start)" />
        </linearGradient>
        <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.24" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="39" y="35" width="302" height="230" rx="29" fill={`url(#${panelId})`} stroke="var(--border)" strokeWidth="2" />
      <path d="M70 69h88" stroke="var(--text-secondary)" strokeWidth="9" strokeLinecap="round" />
      <path d="M70 89h57" stroke="var(--text-faint)" strokeOpacity="0.42" strokeWidth="5" strokeLinecap="round" />
      <rect x="271" y="61" width="40" height="24" rx="12" fill="var(--accent-dim)" />
      <circle cx="285" cy="73" r="4" fill="var(--success)" />
      <path d="M294 73h8" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />

      <path d="M71 222h236M71 179h236M71 136h236" stroke="var(--border-subtle)" strokeWidth="1.5" />
      <path d="M79 222v-38M111 222v-66M143 222v-45M175 222v-93M207 222v-74M239 222v-111M271 222v-89M303 222v-124" stroke="var(--accent-dim)" strokeWidth="13" strokeLinecap="round" />
      <path
        d="M79 202c33-9 47-37 73-31 31 7 36-40 69-32 32 8 47-33 82-44v127H79Z"
        fill={`url(#${areaId})`}
      />
      <path
        d="M79 202c33-9 47-37 73-31 31 7 36-40 69-32 32 8 47-33 82-44"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="303" cy="95" r="8" fill="var(--surface-raised)" stroke="var(--accent-hover)" strokeWidth="4" />
      <circle cx="337" cy="44" r="5" fill="var(--accent)" fillOpacity="0.28" />
      <circle cx="31" cy="242" r="8" fill="var(--success)" fillOpacity="0.18" />
    </svg>
  );
}

export default ReportSparkArt;
