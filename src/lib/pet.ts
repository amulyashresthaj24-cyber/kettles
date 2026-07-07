"use client";

/**
 * Host-side wrapper for the pet overlay window (src-tauri/src/pet.rs).
 * Typed replacement for the kit's vanilla pet-client.js — routes through
 * desktop.ts, so every call no-ops safely off-desktop / during SSR.
 */

import { invoke, listen } from "./desktop";

export type PetEvent =
  | "timerStart"
  | "timerResume"
  | "timerPause"
  | "timerBreak"
  | "breakEnd"
  | "timerFinish"
  | "timerAbandon"
  | "hover";

/** Coarse timer phase — drives the overlay card styling + finished panel. */
export type PetPhase = "idle" | "running" | "paused" | "finished";

export interface PetSignal {
  /** Direct animation state (idle|running|waving|jumping|failed|waiting|review). */
  state?: string;
  /** High-level event mapped to an animation by pet.config.json. */
  event?: PetEvent;
  /** Coarse timer phase — styles the card and toggles the finished panel. */
  phase?: PetPhase;
  /** Card title — e.g. the task name. */
  source?: string;
  /** Card timer line — e.g. the elapsed "HH:MM:SS" countup. */
  detail?: string;
  /** Quote/reminder text — renders the floating bubble + pointing pose (Row 4). */
  quote?: string;
  /** Kind of quote — styles the bubble + picks display duration/actions. */
  quoteKind?: "chat" | "break" | "reminder";
  /** Show the timer-complete extend chips (+5/+10/+25/Finish) on the card. */
  showExtend?: boolean;
  /** Force a desktop notification regardless of event. */
  notify?: { title: string; body: string };
}

/** Open (or reveal) the always-on-top pet overlay, optionally at physical px. */
export const petOpen = (x?: number, y?: number) => invoke("pet_open", { x, y });

/** Close the pet overlay window. */
export const petClose = () => invoke("pet_close");

/** Animate the pet + (on finish events) fire a native notification. */
export const petSignal = (signal: PetSignal) => invoke("pet_signal", { signal });

/** Move the pet window (physical px). */
export const petSetPosition = (x: number, y: number) =>
  invoke("pet_set_position", { x, y });

/** Toggle mouse pass-through (true = decorative only). */
export const petSetClickthrough = (enabled: boolean) =>
  invoke("pet_set_clickthrough", { enabled });

/** Start/stop the OS cursor-polling thread (emits pet://cursor to the overlay). */
export const petTracking = (enabled: boolean) =>
  invoke("pet_tracking", { enabled });

/** Listen for pet clicks (pet://poke). Returns an unlisten function. */
export const onPetPoke = (handler: () => void) =>
  listen<{ at: number }>("pet://poke", () => handler());

/** Payload from the pet's control buttons (play/pause, extend chips, snooze). */
export interface PetControlPayload {
  action: string;
  minutes?: number;
  at?: number;
}

/** Listen for the pet's control buttons. Returns an unlisten fn. */
export const onPetControl = (handler: (payload: PetControlPayload) => void) =>
  listen<PetControlPayload>("pet://control", (p) =>
    handler(p ?? { action: "toggle" })
  );
