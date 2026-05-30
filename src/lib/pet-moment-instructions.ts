"use client";

import type { PetEvent, PetPhase, PetSignal } from "./pet";

export type PetStateName =
  | "idle"
  | "working"
  | "working_still"
  | "drag_running"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "review"
  | "sitting"
  | "running";

export interface PetMomentInstruction {
  event: PetEvent;
  phase: PetPhase;
  state: PetStateName;
  then?: PetStateName;
  notify?: boolean;
  purpose: string;
}

export const FLOWMATE_PET_MOMENTS: Record<PetEvent, PetMomentInstruction> = {
  timerStart: {
    event: "timerStart",
    phase: "running",
    state: "working_still",
    purpose: "Start a focus session without visual noise.",
  },
  timerResume: {
    event: "timerResume",
    phase: "running",
    state: "working_still",
    purpose: "Resume focused work from a paused state.",
  },
  timerPause: {
    event: "timerPause",
    phase: "paused",
    state: "waiting",
    purpose: "Show that the session is paused and waiting.",
  },
  timerBreak: {
    event: "timerBreak",
    phase: "idle",
    state: "idle",
    purpose: "Return to a quiet resting state.",
  },
  timerFinish: {
    event: "timerFinish",
    phase: "finished",
    state: "jumping",
    then: "idle",
    notify: true,
    purpose: "Celebrate a completed focus session.",
  },
  timerAbandon: {
    event: "timerAbandon",
    phase: "idle",
    state: "failed",
    then: "idle",
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

