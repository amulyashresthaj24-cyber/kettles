import { useId, type SVGProps } from "react";

export type SteamMotifProps = SVGProps<SVGSVGElement>;

/** The Kettles steam signature, with stable CSS hooks for motion. */
export function SteamMotif({ className, ...props }: SteamMotifProps) {
  const instanceId = useId().replace(/:/g, "");
  const steamId = `steam-gradient-${instanceId}`;

  return (
    <svg
      {...props}
      className={className}
      viewBox="0 0 160 220"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={steamId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="var(--accent-hover)" />
          <stop offset="0.5" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--card-gradient-end)" />
        </linearGradient>
      </defs>

      <g className="steam-motif__plume" style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}>
        <path
          className="steam-motif__curl steam-motif__curl--left"
          d="M69 186c-18-19-17-38 2-55 20-18 23-35 8-51-13-14-11-31 5-49"
          stroke={`url(#${steamId})`}
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}
        />
        <path
          className="steam-motif__curl steam-motif__curl--right"
          d="M91 181c19-16 23-34 8-52-12-15-8-30 10-44 17-14 20-31 8-49"
          stroke="var(--accent)"
          strokeOpacity="0.28"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}
        />
        <circle className="steam-motif__droplet" cx="54" cy="91" r="5" fill="var(--accent-dim)" />
        <circle className="steam-motif__droplet steam-motif__droplet--small" cx="119" cy="68" r="3" fill="var(--accent)" fillOpacity="0.32" />
      </g>
      <path
        className="steam-motif__rim"
        d="M42 201c17-7 59-7 76 0"
        stroke="var(--border)"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default SteamMotif;
