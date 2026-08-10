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

/** Named standard-row states shared by the Flowmate overlay and Codex v2 atlas. */
export type PetAnimationState =
  | "idle"
  | "working"
  | "running"
  | "running_left"
  | "running_right"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "review"
  | "reading"
  | "sitting"
  | "drag_left"
  | "drag_right";

export type PetActionPayload = Record<
  string,
  string | number | boolean | null
>;

export interface PetAction {
  label: string;
  /** Omit to render a close-only chip such as the existing break "OK". */
  action?: string;
  /** Forwarded unchanged through Rust and merged into pet://control. */
  payload?: PetActionPayload;
}

export interface PetSignal {
  /** Direct standard-row animation state. Look directions remain renderer-owned. */
  state?: PetAnimationState;
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
  /** Explicit speech-bubble actions. Break nudges supply defaults when omitted. */
  actions?: PetAction[];
  /** Correlates a pet chat reply to the request that opened the bubble. */
  chatRequestId?: string;
  /** Show the timer-complete extend chips (+5/+10/+25/Finish) on the card. */
  showExtend?: boolean;
  /** True while an external AI agent is working — glows the AI tab (no log UI). */
  agentActive?: boolean;
  /** Live one-line agent status for the AI tab (e.g. "Claude running · 4m"). */
  agentSummary?: string;
  /**
   * Offline / queued-writes state for the pet card.
   *
   * Pet mode hides the main window, and SyncStatusBadge lives in the main
   * header — so the surface where users spend their focus time was the one
   * surface with no sync indicator at all. "blocked" means writes exhausted
   * their retries and need the user.
   */
  syncState?: "ok" | "offline" | "syncing" | "blocked";
  /** Count behind syncState, e.g. 3 queued writes. */
  syncPending?: number;
  /** Auto-dismiss speech after this many ms; omit for quoteKind defaults. */
  speechMs?: number;
  /**
   * Short audio cue synthesised by the overlay. Omit for silence.
   * `cheer` also fires confetti — reserved for a genuine completion.
   */
  sound?: "cheer" | "alert";
  /** Force a desktop notification regardless of event. */
  notify?: { title: string; body: string };
}

/** Open (or reveal) the always-on-top pet overlay, optionally at physical px. */
export const petOpen = (x?: number, y?: number) => invoke("pet_open", { x, y });

/** Close the pet overlay window. */
export const petClose = () => invoke("pet_close");

/**
 * Whether the overlay is currently on screen.
 *
 * `petSignal()` emits into the pet webview whether or not it is visible, so a
 * proactive message sent while the pet is hidden is silently lost. Anything that
 * spends a limited budget (see `selectPetIntervention`) must check this first.
 * Resolves false off-desktop and during SSR.
 */
export const petIsOpen = async (): Promise<boolean> =>
  (await invoke<boolean>("pet_is_open")) === true;

/**
 * Animate the pet + (on finish events) fire a native notification.
 *
 * Resolves to `true` only when the overlay was on screen for this signal. Any
 * caller spending a limited budget must gate on that: the emit itself succeeds
 * against a hidden webview, so an unchecked send is a message thrown away.
 */
export const petSignal = async (signal: PetSignal): Promise<boolean> =>
  (await invoke<boolean>("pet_signal", { signal })) === true;

/** Move the pet window (physical px). */
export const petSetPosition = (x: number, y: number) =>
  invoke("pet_set_position", { x, y });

/** Toggle mouse pass-through (true = decorative only). */
export const petSetClickthrough = (enabled: boolean) =>
  invoke("pet_set_clickthrough", { enabled });

/** Start/stop the OS cursor-polling thread (emits pet://cursor to the overlay). */
export const petTracking = (enabled: boolean) =>
  invoke("pet_tracking", { enabled });

/** Payload from the pet's legacy poke/open surface. */
export interface PetPokePayload {
  action?: "openApp" | "poke";
  at?: number;
}

/** Listen for pet open/poke events. Returns an unlisten function. */
export const onPetPoke = (handler: (payload: PetPokePayload) => void) =>
  listen<PetPokePayload>("pet://poke", (payload) => handler(payload ?? {}));

/** Payload from the pet's control buttons (play/pause, extend chips, snooze). */
export interface PetControlPayload {
  action: string;
  minutes?: number;
  taskId?: string;
  estimateMinutes?: number;
  interventionKey?: string;
  requestId?: string;
  at?: number;
  /**
   * Chat panel: `requestPetReply` | `dismissPetReply`.
   * Also: toggle, extend, complete, openApp, idle*, agentRun*, etc.
   */
  [key: string]: unknown;
}

/** Listen for the pet's control buttons. Returns an unlisten fn. */
export const onPetControl = (handler: (payload: PetControlPayload) => void) =>
  listen<PetControlPayload>("pet://control", (p) =>
    handler(p ?? { action: "toggle" })
  );
