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
  | "timerFinish"
  | "timerAbandon";

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

/** Listen for pet clicks (pet://poke). Returns an unlisten function. */
export const onPetPoke = (handler: () => void) =>
  listen<{ at: number }>("pet://poke", () => handler());

/** Listen for the pet's play/pause control button. Returns an unlisten fn. */
export const onPetControl = (handler: (action: string) => void) =>
  listen<{ action: string; at: number }>("pet://control", (p) =>
    handler(p?.action ?? "toggle")
  );
