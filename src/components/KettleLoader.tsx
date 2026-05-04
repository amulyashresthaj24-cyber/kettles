"use client";

interface KettleLoaderProps {
  message?: string;
  className?: string;
}

export function KettleLoader({ message, className = "" }: KettleLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-5 ${className}`}>
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
          100% { opacity: 0; transform: translateY(-22px) translateX(2px) scaleX(0.6); }
        }
        @keyframes steamRise2 {
          0%   { opacity: 0; transform: translateY(0px) translateX(0px) scaleX(1); }
          20%  { opacity: 0.55; }
          80%  { opacity: 0.2; }
          100% { opacity: 0; transform: translateY(-20px) translateX(-3px) scaleX(0.5); }
        }
        @keyframes steamRise3 {
          0%   { opacity: 0; transform: translateY(0px) translateX(0px) scaleX(1); }
          20%  { opacity: 0.5; }
          80%  { opacity: 0.15; }
          100% { opacity: 0; transform: translateY(-18px) translateX(1px) scaleX(0.7); }
        }
        .kettle-float {
          animation: kettleFloat 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite,
                     kettleBreathe 2.4s ease-in-out infinite;
          transform-origin: center bottom;
        }
        .steam-1 {
          animation: steamRise1 2s ease-out infinite;
          animation-delay: 0s;
        }
        .steam-2 {
          animation: steamRise2 2s ease-out infinite;
          animation-delay: 0.55s;
        }
        .steam-3 {
          animation: steamRise3 2s ease-out infinite;
          animation-delay: 1.1s;
        }
      `}</style>

      <div className="relative flex flex-col items-center" style={{ width: 80 }}>
        {/* Steam wisps */}
        <div className="absolute" style={{ top: -18, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
          <svg
            className="steam-1"
            width="6"
            height="18"
            viewBox="0 0 6 18"
            fill="none"
            style={{ opacity: 0 }}
          >
            <path
              d="M3 18 C1 14 5 10 3 6 C1 2 3 0 3 0"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-blue-300 dark:text-blue-400"
              style={{ color: "#85c2ff", opacity: 0.8 }}
            />
          </svg>
          <svg
            className="steam-2"
            width="6"
            height="18"
            viewBox="0 0 6 18"
            fill="none"
            style={{ opacity: 0 }}
          >
            <path
              d="M3 18 C5 14 1 10 3 6 C5 2 3 0 3 0"
              stroke="#85c2ff"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{ opacity: 0.7 }}
            />
          </svg>
          <svg
            className="steam-3"
            width="6"
            height="18"
            viewBox="0 0 6 18"
            fill="none"
            style={{ opacity: 0 }}
          >
            <path
              d="M3 18 C1 14 5 10 3 6 C1 2 3 0 3 0"
              stroke="#85c2ff"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{ opacity: 0.65 }}
            />
          </svg>
        </div>

        {/* Kettle icon */}
        <div className="kettle-float" style={{ filter: "drop-shadow(0 4px 12px rgba(51,133,255,0.18))" }}>
          <svg
            width="80"
            height="74"
            viewBox="0 0 128.52 119.83"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect fill="#85c2ff" x="40.28" y="8.04" width="20.92" height="48.34" transform="translate(82.95 -18.53) rotate(90)" />
            <rect fill="#85c2ff" x="40.28" y="49.87" width="20.92" height="48.34" transform="translate(124.78 23.31) rotate(90)" />
            <rect fill="#85c2ff" x="43.95" y="67.12" width="13.57" height="48.34" transform="translate(142.03 40.56) rotate(90)" />
            <polygon fill="#3385ff" points="26.93 63.59 53.62 42.67 101.96 42.67 101.96 63.59 26.93 63.59" />
          </svg>
        </div>
      </div>

      {/* Screen-reader text always present; visual text only when message passed */}
      <p
        className="font-sans text-[13px]"
        style={{ color: "#8a8f98" }}
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading...</span>
        {message && <span aria-hidden="true">{message}</span>}
      </p>
    </div>
  );
}
