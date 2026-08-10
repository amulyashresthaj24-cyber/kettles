"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const PET_STATES = [
  "idle",
  "waving",
  "jumping",
  "reading",
  "working",
  "waiting",
  "failed",
  "review",
  "sitting",
  "running_left",
  "running_right",
  "drag_left",
  "drag_right",
] as const;

export type LandingPetState = (typeof PET_STATES)[number];

type SpriteState = {
  row: number;
  col?: number;
  frames: number;
  fps: number;
  loop: boolean;
};

type PetConfig = {
  cell: { width: number; height: number };
  sheet: { cols: number; rows: number };
  states: Record<LandingPetState, SpriteState>;
};

type LandingPetProps = {
  state?: LandingPetState;
  scale?: number;
  className?: string;
  interactive?: boolean;
  loop?: boolean;
};

const FALLBACK_CONFIG: PetConfig = {
  cell: { width: 192, height: 208 },
  sheet: { cols: 8, rows: 9 },
  states: {
    idle: { row: 0, frames: 6, fps: 5, loop: true },
    waving: { row: 3, frames: 4, fps: 6, loop: false },
    jumping: { row: 4, frames: 5, fps: 10, loop: false },
    reading: { row: 8, frames: 6, fps: 5, loop: true },
    working: { row: 1, frames: 8, fps: 8, loop: true },
    waiting: { row: 6, frames: 6, fps: 4, loop: true },
    failed: { row: 5, frames: 8, fps: 6, loop: false },
    review: { row: 7, frames: 6, fps: 5, loop: true },
    sitting: { row: 5, col: 6, frames: 2, fps: 2, loop: true },
    running_left: { row: 2, frames: 8, fps: 10, loop: true },
    running_right: { row: 1, frames: 8, fps: 9, loop: true },
    drag_left: { row: 2, frames: 8, fps: 11, loop: true },
    drag_right: { row: 1, frames: 8, fps: 11, loop: true },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function readConfig(value: unknown): PetConfig | null {
  if (!isRecord(value) || !isRecord(value.cell) || !isRecord(value.sheet) || !isRecord(value.states)) {
    return null;
  }

  const { width, height } = value.cell;
  const { cols, rows } = value.sheet;
  if (
    !isPositiveNumber(width) ||
    !isPositiveNumber(height) ||
    !isPositiveNumber(cols) ||
    !isPositiveNumber(rows)
  ) {
    return null;
  }

  const states = { ...FALLBACK_CONFIG.states };
  for (const name of PET_STATES) {
    const candidate = value.states[name];
    if (!isRecord(candidate)) continue;

    const { row, col, frames, fps, loop } = candidate;
    if (
      typeof row === "number" &&
      Number.isInteger(row) &&
      row >= 0 &&
      (col === undefined || (typeof col === "number" && Number.isInteger(col) && col >= 0)) &&
      typeof frames === "number" &&
      Number.isInteger(frames) &&
      frames > 0 &&
      isPositiveNumber(fps) &&
      typeof loop === "boolean"
    ) {
      states[name] = { row, col, frames, fps, loop };
    }
  }

  return {
    cell: { width, height },
    sheet: { cols, rows },
    states,
  };
}

export function LandingPet({
  state = "idle",
  scale = 1,
  className = "",
  interactive = true,
  loop,
}: LandingPetProps) {
  const [config, setConfig] = useState<PetConfig>(FALLBACK_CONFIG);
  const [activeState, setActiveState] = useState<LandingPetState>(state);
  const [frame, setFrame] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const animationFrame = useRef<number | null>(null);

  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const baseDefinition = config.states[activeState] ?? FALLBACK_CONFIG.states[activeState] ?? FALLBACK_CONFIG.states.idle;
  const isLooping = typeof loop === "boolean" ? loop : baseDefinition.loop;
  const definition = useMemo(() => {
    return { ...baseDefinition, loop: isLooping };
  }, [baseDefinition, isLooping]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/pet/pet.config.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load pet configuration");
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        const nextConfig = readConfig(value);
        if (nextConfig) setConfig(nextConfig);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setConfig(FALLBACK_CONFIG);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = (event: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(event.matches);
    };

    updatePreference(mediaQuery);
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    setActiveState(state);
    setFrame(0);
  }, [state]);

  useEffect(() => {
    if (animationFrame.current !== null) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }

    setFrame(0);
    if (prefersReducedMotion || definition.frames <= 1) return;

    const frameDuration = 1000 / definition.fps;
    let startedAt: number | null = null;
    let renderedFrame = -1;

    const animate = (now: number) => {
      if (startedAt === null) startedAt = now;
      const elapsedFrame = Math.floor((now - startedAt) / frameDuration);

      if (!definition.loop && elapsedFrame >= definition.frames) {
        if (interactive) {
          setActiveState("idle");
        }
        setFrame(0);
        animationFrame.current = null;
        return;
      }

      const nextFrame = definition.loop ? elapsedFrame % definition.frames : elapsedFrame;
      if (nextFrame !== renderedFrame) {
        renderedFrame = nextFrame;
        setFrame(nextFrame);
      }
      animationFrame.current = requestAnimationFrame(animate);
    };

    animationFrame.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
    };
  }, [definition, interactive, prefersReducedMotion]);

  const backgroundPosition = useMemo(() => {
    const column = (definition.col ?? 0) + frame;
    const x = config.sheet.cols > 1 ? (column / (config.sheet.cols - 1)) * 100 : 0;
    const y = config.sheet.rows > 1 ? (definition.row / (config.sheet.rows - 1)) * 100 : 0;
    return `${x}% ${y}%`;
  }, [config.sheet.cols, config.sheet.rows, definition.col, definition.row, frame]);

  const play = (nextState: LandingPetState) => {
    if (prefersReducedMotion) return;
    setActiveState(nextState);
  };

  const style = {
    width: FALLBACK_CONFIG.cell.width * safeScale,
    height: FALLBACK_CONFIG.cell.height * safeScale,
    backgroundPosition,
  };

  if (!interactive) {
    return (
      <div
        className={`landing-pet ${className}`.trim()}
        style={style}
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      aria-label="Play with the Flowmate companion"
      className={`landing-pet ${className}`.trim()}
      onPointerEnter={() => play("waving")}
      onFocus={() => play("waving")}
      onClick={() => play("jumping")}
      style={style}
    />
  );
}

export default LandingPet;
