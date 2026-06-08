"use client";

import type { PetEvent, PetPhase, PetSignal } from "./pet";

export type PetStateName =
  | "idle_blink"
  | "walking"
  | "waving_jumping"
  | "sitting_laptop"
  | "pointing_presenting"
  | "sprinting_fast"
  | "leaping_celebration"
  | "sleeping_afk"
  | "crossed_arms_alert"
  | "coffee_break"
  | "anger_surprise";

export interface PetMomentInstruction {
  event: PetEvent;
  phase: PetPhase;
  state: PetStateName;
  then?: PetStateName;
  notify?: boolean;
  purpose: string;
}

/**
 * Canonical sprite-sheet row for each state — the 0-10 identifiers in
 * sprite-update-female.png (kept in sync with public/pet/pet.config.json).
 */
export const PET_STATE_ROW: Record<PetStateName, number> = {
  idle_blink: 0,
  walking: 1,
  waving_jumping: 2,
  sitting_laptop: 3,
  pointing_presenting: 4,
  sprinting_fast: 5,
  leaping_celebration: 6,
  sleeping_afk: 7,
  crossed_arms_alert: 8,
  coffee_break: 9,
  anger_surprise: 10,
};

export const FLOWMATE_PET_MOMENTS: Record<PetEvent, PetMomentInstruction> = {
  timerStart: {
    event: "timerStart",
    phase: "running",
    state: "sitting_laptop",
    purpose: "Start a focus session without visual noise.",
  },
  timerResume: {
    event: "timerResume",
    phase: "running",
    state: "sitting_laptop",
    purpose: "Resume focused work from a paused state.",
  },
  timerPause: {
    event: "timerPause",
    phase: "paused",
    state: "coffee_break",
    purpose: "Show that the session is paused and waiting.",
  },
  timerBreak: {
    event: "timerBreak",
    phase: "paused",
    state: "coffee_break",
    purpose: "Pomodoro break — sip coffee while the clock rests (clickthrough off).",
  },
  timerFinish: {
    event: "timerFinish",
    phase: "finished",
    state: "leaping_celebration",
    then: "idle_blink",
    notify: true,
    purpose: "Celebrate a completed focus session.",
  },
  timerAbandon: {
    event: "timerAbandon",
    phase: "idle",
    state: "anger_surprise",
    then: "idle_blink",
    purpose: "Briefly acknowledge an abandoned session, then recover.",
  },
};

export function createPetSignal(
  event: PetEvent,
  options: Pick<PetSignal, "source" | "detail" | "notify"> = {}
): PetSignal {
  const moment = FLOWMATE_PET_MOMENTS[event];
  return {
    event,
    phase: moment.phase,
    source: options.source,
    detail: options.detail,
    notify: options.notify,
  };
}

