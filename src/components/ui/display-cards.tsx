"use client";

import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   DisplayCards — flat (no tilt) stack of wide, short cards fanning down-left.
   Content sits at the top so titles + one-line descriptions stay legible in the
   exposed strip. Hovering an individual card lifts just that card, de-saturates
   it, and hides its edge fade. Themed to the Kettles dark tokens (--k-*).
   --------------------------------------------------------------------------- */

export interface DisplayCardProps {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  /** Accent colour (CSS value) for the icon chip + title. */
  accent?: string;
}

function DisplayCard({
  className,
  icon,
  title = "Featured",
  description = "Discover amazing content",
  accent = "var(--k-accent2)",
}: DisplayCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-36 w-[32rem] max-w-[90vw] select-none flex-col justify-center gap-5 overflow-hidden rounded-[20px] border bg-[var(--k-card)] px-8 py-6 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        className
      )}
      style={{ borderColor: "var(--k-line)" }}
    >
      <div className="flex items-center gap-4">
        <span
          className="grid h-[42px] w-[42px] flex-none place-items-center rounded-full border"
          style={{
            color: accent,
            borderColor: "color-mix(in srgb, " + accent + " 25%, transparent)",
            background: "color-mix(in srgb, " + accent + " 6%, transparent)",
          }}
        >
          {icon}
        </span>
        <p className="text-[19px] font-medium tracking-[-0.01em]" style={{ color: accent }}>
          {title}
        </p>
      </div>
      <p className="relative z-10 text-[15.5px] leading-snug text-[var(--k-muted)]">
        {description}
      </p>
    </div>
  );
}

interface DisplayCardsProps {
  cards?: DisplayCardProps[];
  className?: string;
}

export default function DisplayCards({ cards, className }: DisplayCardsProps) {
  const displayCards = cards ?? [];

  // Resting cascade fans down-left; each card's top strip stays visible. Hover
  // lifts only the hovered card and clears its grayscale + edge fade.
  const overlay =
    "before:absolute before:left-0 before:top-0 before:h-full before:w-full before:rounded-[20px] before:bg-[var(--k-bg)]/50 before:content-[''] before:transition-opacity before:duration-300 hover:before:opacity-0";

  const stackClasses = [
    `[grid-area:stack] -translate-x-1 -translate-y-24 grayscale-[100%] hover:grayscale-0 hover:-translate-y-28 hover:scale-[1.02] ${overlay}`,
    `[grid-area:stack] -translate-x-16 translate-y-0 grayscale-[100%] hover:grayscale-0 hover:-translate-y-4 hover:scale-[1.02] ${overlay}`,
    "[grid-area:stack] -translate-x-32 translate-y-24 hover:translate-y-20 hover:scale-[1.02]",
  ];

  return (
    <div
      className={cn(
        "grid place-items-center opacity-100 [grid-template-areas:'stack'] animate-in fade-in-0 duration-700",
        className
      )}
    >
      {displayCards.map((cardProps, index) => (
        <DisplayCard
          key={index}
          {...cardProps}
          className={cn(stackClasses[index] ?? stackClasses[2], cardProps.className)}
        />
      ))}
    </div>
  );
}
