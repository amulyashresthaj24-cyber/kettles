"use client";

/**
 * 404 hero illustration — "lost kettle" branded error state.
 * Deliberately distinct from KettleAnimation (loader):
 *   - slow confused tilt, not neutral float
 *   - organic multi-height steam, not uniform wisps
 *   - floating "?" glyph that pulses in/out
 *   - ambient particle drift
 *   - static radial glow (no pulse = not a "waiting" indicator)
 */
export function LostKettleAnimation() {
  return (
    <div
      className="lost-kettle-root"
      style={{ position: "relative", width: 220, height: 240, margin: "0 auto" }}
      aria-hidden="true"
    >
      <style>{`
        /* ── Kettle: confused slow tilt with lazy drift ── */
        @keyframes lk-tilt {
          0%   { transform: translateY(0px)   rotate(-3deg) scale(1);    }
          20%  { transform: translateY(-5px)  rotate(-1deg) scale(1.02); }
          45%  { transform: translateY(-8px)  rotate(2.5deg) scale(1.01);}
          65%  { transform: translateY(-4px)  rotate(3.5deg) scale(1);   }
          80%  { transform: translateY(-7px)  rotate(1deg)  scale(1.02); }
          100% { transform: translateY(0px)   rotate(-3deg) scale(1);    }
        }

        /* ── Steam wisps — varied heights and drift ── */
        @keyframes lk-ws1 {
          0%   { opacity: 0;    transform: translateY(0)   translateX(0)   scaleX(1);    }
          18%  { opacity: 0.65; }
          78%  { opacity: 0.2;  }
          100% { opacity: 0;    transform: translateY(-48px) translateX(-8px)  scaleX(0.5); }
        }
        @keyframes lk-ws2 {
          0%   { opacity: 0;    transform: translateY(0)   translateX(0)   scaleX(1);    }
          18%  { opacity: 0.5;  }
          78%  { opacity: 0.15; }
          100% { opacity: 0;    transform: translateY(-40px) translateX(10px)  scaleX(0.45); }
        }
        @keyframes lk-ws3 {
          0%   { opacity: 0;    transform: translateY(0)   translateX(0)   scaleX(1);    }
          18%  { opacity: 0.6;  }
          78%  { opacity: 0.2;  }
          100% { opacity: 0;    transform: translateY(-52px) translateX(4px)  scaleX(0.4); }
        }
        @keyframes lk-ws4 {
          0%   { opacity: 0;    transform: translateY(0)   translateX(0)   scaleX(1);    }
          18%  { opacity: 0.4;  }
          78%  { opacity: 0.1;  }
          100% { opacity: 0;    transform: translateY(-36px) translateX(-5px) scaleX(0.55); }
        }

        /* ── Question mark: slow breath ── */
        @keyframes lk-q {
          0%, 100% { opacity: 0;    transform: translateY(2px)  scale(0.9); }
          35%       { opacity: 0.7;  transform: translateY(-4px) scale(1);   }
          65%       { opacity: 0.5;  transform: translateY(-6px) scale(1);   }
        }

        /* ── Ambient particles ── */
        @keyframes lk-p1 {
          0%, 100% { opacity: 0;   transform: translate(0, 0)     scale(1);   }
          50%       { opacity: 0.5; transform: translate(-12px, -18px) scale(1.3); }
        }
        @keyframes lk-p2 {
          0%, 100% { opacity: 0;   transform: translate(0, 0)    scale(1);   }
          50%       { opacity: 0.4; transform: translate(14px, -14px) scale(1.2); }
        }
        @keyframes lk-p3 {
          0%, 100% { opacity: 0;   transform: translate(0, 0)   scale(1);   }
          50%       { opacity: 0.35; transform: translate(8px, -22px) scale(1.4); }
        }

        .lk-kettle  {
          animation: lk-tilt 4.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          transform-origin: center 88%;
        }
        .lk-ws1 { animation: lk-ws1 3s   ease-out infinite; animation-delay: 0s;    opacity: 0; }
        .lk-ws2 { animation: lk-ws2 3.2s ease-out infinite; animation-delay: 0.45s; opacity: 0; }
        .lk-ws3 { animation: lk-ws3 2.8s ease-out infinite; animation-delay: 0.9s;  opacity: 0; }
        .lk-ws4 { animation: lk-ws4 3.4s ease-out infinite; animation-delay: 1.35s; opacity: 0; }
        .lk-q   { animation: lk-q   5s   ease-in-out infinite; animation-delay: 1.2s; opacity: 0; }
        .lk-p1  { animation: lk-p1  6s   ease-in-out infinite; animation-delay: 0s;   }
        .lk-p2  { animation: lk-p2  7s   ease-in-out infinite; animation-delay: 1s;   }
        .lk-p3  { animation: lk-p3  5.5s ease-in-out infinite; animation-delay: 2.5s; }

        @media (prefers-reduced-motion: reduce) {
          .lk-kettle       { animation: none; transform: rotate(-2deg); }
          .lk-ws1, .lk-ws2,
          .lk-ws3, .lk-ws4 { animation: none; opacity: 0.15 !important; }
          .lk-q            { animation: none; opacity: 0.3  !important; }
          .lk-p1, .lk-p2,
          .lk-p3           { animation: none; opacity: 0; }
        }
      `}</style>

      {/* ── Deep ambient glow ── */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 60% 50% at 50% 70%, rgba(0,102,255,0.12) 0%, transparent 70%)",
        borderRadius: "50%",
        pointerEvents: "none",
      }} />

      {/* ── Ambient particles ── */}
      {[
        { cls: "lk-p1", top: "55%", left: "15%", size: 4 },
        { cls: "lk-p2", top: "60%", left: "80%", size: 3 },
        { cls: "lk-p3", top: "40%", left: "72%", size: 3.5 },
      ].map(({ cls, top, left, size }) => (
        <div
          key={cls}
          className={cls}
          style={{
            position: "absolute", top, left,
            width: size, height: size,
            borderRadius: "50%",
            background: "#3385ff",
            opacity: 0,
          }}
        />
      ))}

      {/* ── Steam column + question mark ── */}
      <div style={{
        position: "absolute",
        top: 10,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 7,
        alignItems: "flex-end",
      }}>
        {/* Wisp 1 — curves left */}
        <svg className="lk-ws1" width="8" height="40" viewBox="0 0 8 40" fill="none">
          <path d="M4 39 C0 30 8 22 4 14 C0 6 4 0 4 0"
            stroke="#85c2ff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>

        {/* Wisp 2 — curves right, taller */}
        <svg className="lk-ws2" width="8" height="50" viewBox="0 0 8 50" fill="none">
          <path d="M4 49 C8 38 0 28 4 18 C8 8 4 0 4 0"
            stroke="#85c2ff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>

        {/* Wisp 3 — tall center, hooks at top (? tail) */}
        <svg className="lk-ws3" width="10" height="54" viewBox="0 0 10 54" fill="none">
          <path d="M5 53 C1 42 9 32 5 20 C2 12 8 5 5 0"
            stroke="#85c2ff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>

        {/* Wisp 4 — short, left side */}
        <svg className="lk-ws4" width="7" height="34" viewBox="0 0 7 34" fill="none">
          <path d="M3.5 33 C7 25 0 18 3.5 10 C7 3 3.5 0 3.5 0"
            stroke="#85c2ff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        {/* Floating question mark */}
        <div className="lk-q" style={{
          position: "absolute",
          top: -30, left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "var(--font-urbanist, sans-serif)",
          fontSize: 22,
          fontWeight: 700,
          color: "#3385ff",
          lineHeight: 1,
          userSelect: "none",
          letterSpacing: "-0.02em",
          opacity: 0,
        }}>?</div>
      </div>

      {/* ── Kettle hero ── */}
      <div
        className="lk-kettle"
        style={{
          position: "absolute",
          bottom: 10,
          left: "50%",
          transform: "translateX(-50%)",
          filter: "drop-shadow(0 8px 24px rgba(0,102,255,0.28)) drop-shadow(0 2px 6px rgba(0,102,255,0.15))",
        }}
      >
        <svg
          width="148"
          height={148 * (119.83 / 128.52)}
          viewBox="0 0 128.52 119.83"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect fill="#85c2ff" x="40.28" y="8.04" width="20.92" height="48.34"
            transform="translate(82.95 -18.53) rotate(90)" />
          <rect fill="#85c2ff" x="40.28" y="49.87" width="20.92" height="48.34"
            transform="translate(124.78 23.31) rotate(90)" />
          <rect fill="#85c2ff" x="43.95" y="67.12" width="13.57" height="48.34"
            transform="translate(142.03 40.56) rotate(90)" />
          <polygon fill="#3385ff"
            points="26.93 63.59 53.62 42.67 101.96 42.67 101.96 63.59 26.93 63.59" />
        </svg>
      </div>
    </div>
  );
}
