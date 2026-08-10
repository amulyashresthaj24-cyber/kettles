"use client";

/**
 * Device-local storage for pet intervention history.
 *
 * Deliberately not part of the Zustand `preferences` object. This is behavioral
 * data, not a preference: it grows on its own, it is meaningless on another
 * device, and putting it in the persisted store payload would ship it along with
 * everything else the app writes to localStorage on every state change.
 *
 * Bounded on every read and write by `prunePetHistory()` — seven days or a
 * hundred records, whichever bites first.
 */

import { prunePetHistory, type PetInterventionRecord } from "./pet-context";

/** Bump when the record shape changes; an unreadable version starts empty. */
const STORAGE_PREFIX = "flowmate-pet-history-v1";

/**
 * Scoped per account. Two accounts on one OS profile share a localStorage
 * origin, so an unscoped key would let the first account's daily budget suppress
 * the second account's warnings. Signed-out state gets its own bucket.
 *
 * Keyed on email because that is the only stable account identifier the store
 * holds (`State["user"]` is `{ name, email? }`).
 */
function storageKey(account: string | null | undefined): string {
  return `${STORAGE_PREFIX}:${account?.trim().toLowerCase() || "anon"}`;
}

export function loadPetHistory(
  now: number,
  account?: string | null
): PetInterventionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(account));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Tolerate hand-edited or partially-written entries rather than throwing
    // away the whole file.
    const records = parsed.filter(
      (r): r is PetInterventionRecord =>
        !!r && typeof r.key === "string" && typeof r.shownAt === "number"
    );
    return prunePetHistory(records, now);
  } catch {
    return [];
  }
}

export function savePetHistory(
  history: PetInterventionRecord[],
  now: number,
  account?: string | null
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(account),
      JSON.stringify(prunePetHistory(history, now))
    );
  } catch {
    // Storage full or unavailable. The in-memory ref is still authoritative for
    // this session, so the pet degrades to silence rather than repeating itself
    // — provided the caller does not reload the ref from storage mid-session.
  }
}

export function clearPetHistory(account?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(account));
  } catch {
    // Nothing to do.
  }
}
