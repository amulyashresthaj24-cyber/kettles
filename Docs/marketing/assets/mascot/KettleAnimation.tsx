"use client";

interface KettleAnimationProps {
  size?: number;
  /** Extra intensity for hover/404 states */
  enhanced?: boolean;
  className?: string;
}

export function KettleAnimation({ size = 80, enhanced = false, className = "" }: KettleAnimationProps) {
  const scale = size / 80;
  const steamH = enhanced ? 28 : 18;
  const steamW = enhanced ? 8 : 6;

  return (
    <div
      className={`relative flex flex-col items-center kettle-anim-root ${className}`}
      style={{ width: size }}
    >
      <style>{`
        @keyframes kettleFloat {
          0%, 100% { transform: translateY(0px) rotate(-1.5deg); }
          50%       { transform: translateY(-6px) rotate(1.5deg); }
        }
        @keyframes kettleBreathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.04); }
        }
        @keyframes steamRise1 {
          0%   { opacity: 0; transform: translateY(0px) translateX(0px) scaleX(1); }
          20%  { opacity: 0.7; }
          80%  { opacity: 0.3; }
          100% { opacity: 0; transform: translateY(-26px) translateX(3px) scaleX(0.6); }
        }
        @keyframes steamRise2 {
          0%   { opacity: 0; transform: translateY(0px) translateX(0px) scaleX(1); }
          20%  { opacity: 0.55; }
          80%  { opacity: 0.2; }
          100% { opacity: 0; transform: translateY(-24px) translateX(-4px) scaleX(0.5); }
        }
        @keyframes steamRise3 {
          0%   { opacity: 0; transform: translateY(0px) translateX(0px) scaleX(1); }
          20%  { opacity: 0.5; }
          80%  { opacity: 0.15; }
          100% { opacity: 0; transform: translateY(-22px) translateX(2px) scaleX(0.7); }
        }

        .kettle-float {
          animation:
            kettleFloat 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite,
            kettleBreathe 2.4s ease-in-out infinite;
          transform-origin: center bottom;
        }
        .steam-1 { animation: steamRise1 2.2s ease-out infinite; animation-delay: 0s; }
        .steam-2 { animation: steamRise2 2.2s ease-out infinite; animation-delay: 0.6s; }
        .steam-3 { animation: steamRise3 2.2s ease-out infinite; animation-delay: 1.2s; }

        @media (prefers-reduced-motion: reduce) {
          .kettle-float { animation: none; }
          .steam-1, .steam-2, .steam-3 { animation: none; opacity: 0.3; }
        }
      `}</style>

      {/* Steam wisps */}
      <div
        className="absolute"
        style={{
          top: -(steamH + 4) * scale,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 6 * scale,
        }}
      >
        {[
          { cls: "steam-1", d: "M3 18 C1 14 5 10 3 6 C1 2 3 0 3 0" },
          { cls: "steam-2", d: "M3 18 C5 14 1 10 3 6 C5 2 3 0 3 0" },
          { cls: "steam-3", d: "M3 18 C1 14 5 10 3 6 C1 2 3 0 3 0" },
        ].map(({ cls, d }, i) => (
          <svg
            key={i}
            className={cls}
            width={steamW * scale}
            height={steamH * scale}
            viewBox={`0 0 6 18`}
            fill="none"
            style={{ opacity: 0 }}
            aria-hidden="true"
          >
            <path
              d={d}
              stroke="#85c2ff"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        ))}
      </div>

      {/* Kettle */}
      <div
        className="kettle-float"
        style={{ filter: "drop-shadow(0 4px 14px rgba(51,133,255,0.2))" }}
      >
        <svg
          width={size}
          height={size * (119.83 / 128.52)}
          viewBox="0 0 128.52 119.83"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect fill="#85c2ff" x="40.28" y="8.04" width="20.92" height="48.34" transform="translate(82.95 -18.53) rotate(90)" />
          <rect fill="#85c2ff" x="40.28" y="49.87" width="20.92" height="48.34" transform="translate(124.78 23.31) rotate(90)" />
          <rect fill="#85c2ff" x="43.95" y="67.12" width="13.57" height="48.34" transform="translate(142.03 40.56) rotate(90)" />
          <polygon fill="var(--accent-hover)" points="26.93 63.59 53.62 42.67 101.96 42.67 101.96 63.59 26.93 63.59" />
        </svg>
      </div>
    </div>
  );
}
