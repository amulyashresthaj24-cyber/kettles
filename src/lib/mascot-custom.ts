/**
 * Custom user mascot — storage, validation, and the generation prompt.
 *
 * Users generate a **v1** atlas (8x9, no look grid) from their own image and
 * upload it here. Stock mascots are v2 and ship in the bundle. See
 * `Docs/pet-design-system.md` for the tier rules.
 *
 * The atlas lives in its own localStorage key, deliberately **not** in the
 * Zustand store. `partialize` in `store-supabase.ts` persists `sessions`
 * alongside `preferences`, so putting a ~1MB data URL in preferences would
 * re-serialize the whole session array on every timer write. The pet overlay
 * runs in a separate Tauri webview on the same origin, so it can read this key
 * directly — the same way it already reads the session store.
 *
 * Pure functions plus an injectable `Storage`, so everything here is testable
 * without a DOM.
 */

/** localStorage key for the uploaded atlas. Read by `public/pet/pet.js`. */
export const CUSTOM_MASCOT_KEY = "flowmate-custom-mascot";

/** The user-generated tier. v2 (look grid) is stock-only. */
export const V1_ATLAS = {
  cols: 8,
  rows: 9,
  cellWidth: 192,
  cellHeight: 208,
  get width() {
    return this.cols * this.cellWidth;
  },
  get height() {
    return this.rows * this.cellHeight;
  },
} as const;

/**
 * Upload cap on the raw file.
 *
 * Browsers give an origin roughly 5MB of localStorage, and base64 inflates by
 * ~4/3. 1.5MB raw lands near 2MB stored, which leaves headroom for the session
 * store sharing the same origin. WebP at this atlas size is typically well
 * under it; a PNG often is not, which is why the copy asks for WebP.
 */
export const MAX_ATLAS_BYTES = 1_500_000;

export const ACCEPTED_MIME = ["image/webp", "image/png"] as const;

export interface CustomMascot {
  /** `data:image/webp;base64,...` — used directly as the sprite sheet URL. */
  dataUrl: string;
  width: number;
  height: number;
  /** Original file name, shown in settings so the user can tell versions apart. */
  fileName: string;
  savedAt: number;
}

/**
 * The v1 state map: all 14 `PetAnimationState` names across 9 art rows.
 *
 * Aliasing is expected — v1 has fewer rows than names. Kept identical to
 * `Docs/pet-kit/examples/seed-pet.config.json`; `mascot-custom.test.ts` asserts
 * it covers the union, because a missing name does not throw at runtime, it
 * silently falls back to `idle`.
 */
export const V1_STATES = {
  idle: { row: 0, frames: 6, fps: 5, loop: true },
  sitting: { row: 0, col: 0, frames: 1, fps: 2, loop: true },
  working: { row: 1, frames: 8, fps: 8, loop: true },
  drag_left: { row: 2, frames: 8, fps: 11, loop: true },
  drag_right: { row: 2, frames: 8, fps: 11, loop: true },
  running_left: { row: 2, frames: 8, fps: 10, loop: true },
  running_right: { row: 2, frames: 8, fps: 10, loop: true },
  waving: { row: 3, frames: 4, fps: 6, loop: false },
  jumping: { row: 4, frames: 5, fps: 10, loop: false },
  failed: { row: 5, frames: 8, fps: 6, loop: false },
  waiting: { row: 6, frames: 6, fps: 4, loop: true },
  review: { row: 7, frames: 6, fps: 5, loop: true },
  reading: { row: 7, frames: 6, fps: 5, loop: true },
  running: { row: 8, frames: 6, fps: 9, loop: true },
} as const;

/** v1 event and phase mapping, tuned to the v1 row intents. */
export const V1_EVENTS = {
  hover: "review",
  click: "waving",
  doubleClick: "jumping",
  timerStart: { play: "waving", then: "running" },
  timerResume: { play: "waving", then: "running" },
  timerPause: "waiting",
  timerBreak: "idle",
  breakEnd: { play: "jumping", then: "running" },
  timerFinish: { play: "jumping", then: "idle" },
  timerAbandon: { play: "failed", then: "waiting" },
} as const;

export const V1_PHASE_STATES = {
  idle: "idle",
  running: "running",
  paused: "waiting",
  finished: "idle",
} as const;

/**
 * The config the overlay applies for a custom mascot — the v1 preset with the
 * uploaded atlas as its sprite sheet. `lookDirections` is deliberately absent:
 * v1 has no look grid, and `pet.js` short-circuits cursor tracking when the key
 * is missing.
 */
export function buildCustomMascotConfig(dataUrl: string) {
  return {
    spritesheet: dataUrl,
    cell: { width: V1_ATLAS.cellWidth, height: V1_ATLAS.cellHeight },
    sheet: { cols: V1_ATLAS.cols, rows: V1_ATLAS.rows },
    scale: 0.58,
    spriteVersionNumber: 1,
    states: V1_STATES,
    events: V1_EVENTS,
    phaseStates: V1_PHASE_STATES,
  };
}

/** Human-readable rejection reason, or `null` when the file is usable. */
export function validateAtlasFile(file: {
  type: string;
  size: number;
  name?: string;
}): string | null {
  if (!ACCEPTED_MIME.includes(file.type as (typeof ACCEPTED_MIME)[number])) {
    return "Upload a WebP or PNG file.";
  }
  if (file.size > MAX_ATLAS_BYTES) {
    const mb = (file.size / 1_000_000).toFixed(1);
    return `That file is ${mb}MB. Export it as WebP under ${MAX_ATLAS_BYTES / 1_000_000}MB and try again.`;
  }
  if (file.size === 0) return "That file is empty.";
  return null;
}

/** Human-readable rejection reason for the decoded image, or `null`. */
export function validateAtlasDimensions(width: number, height: number): string | null {
  if (width !== V1_ATLAS.width || height !== V1_ATLAS.height) {
    return `The sheet must be exactly ${V1_ATLAS.width}x${V1_ATLAS.height} pixels (8 columns x 9 rows of ${V1_ATLAS.cellWidth}x${V1_ATLAS.cellHeight} cells). Yours is ${width}x${height}.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function defaultStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Private-mode Safari and hardened browser profiles throw on access.
    return null;
  }
}

export function readCustomMascot(storage: Storage | null = defaultStorage()): CustomMascot | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CUSTOM_MASCOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CustomMascot>;
    // A truncated or hand-edited entry must not take the overlay down with it.
    if (typeof parsed?.dataUrl !== "string" || !parsed.dataUrl.startsWith("data:image/")) {
      return null;
    }
    return {
      dataUrl: parsed.dataUrl,
      width: typeof parsed.width === "number" ? parsed.width : V1_ATLAS.width,
      height: typeof parsed.height === "number" ? parsed.height : V1_ATLAS.height,
      fileName: typeof parsed.fileName === "string" ? parsed.fileName : "custom-mascot",
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Persist an uploaded atlas. Returns an error string on failure rather than
 * throwing — a quota rejection is a normal outcome here, not an exception, and
 * the caller needs to say so in the UI.
 */
export function saveCustomMascot(
  mascot: CustomMascot,
  storage: Storage | null = defaultStorage()
): string | null {
  if (!storage) return "This browser is blocking local storage, so the mascot can't be saved.";
  try {
    storage.setItem(CUSTOM_MASCOT_KEY, JSON.stringify(mascot));
    return null;
  } catch {
    return "Not enough local storage space. Export the sheet as a smaller WebP and try again.";
  }
}

export function clearCustomMascot(storage: Storage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(CUSTOM_MASCOT_KEY);
  } catch {
    // Nothing useful to do — the caller is already resetting activeMascot.
  }
}

// ---------------------------------------------------------------------------
// Generation prompt
// ---------------------------------------------------------------------------

/**
 * The prompt users copy into an image model along with a photo of themselves.
 *
 * Derived from `Docs/pet-kit/prompts/ROW_PROMPTS.md`. Keep the two in step: the
 * row order, frame counts, and forbidden list here are the same contract the
 * validator and `V1_STATES` enforce.
 */
export const MASCOT_GENERATION_PROMPT = `Create a desktop pet sprite sheet from the attached image.

OUTPUT
One PNG or WebP image, exactly 1536 x 1872 pixels, fully transparent background.
It is a grid of 8 columns x 9 rows. Every cell is exactly 192 x 208 pixels.
Frames fill each row from the left. Unused cells stay fully transparent.

IDENTITY
Turn the person or character in the attached image into a small mascot. Keep
the same face, hair, outfit, colours, glasses, accessories, and body
proportions in every single frame. Crisp edges, simple cel shading, clear
silhouette. Centre the mascot in each cell with a little padding, never
cropped, never crossing into a neighbouring cell.

NEVER INCLUDE
Text, labels, frame numbers, visible grid lines, UI panels, speech bubbles,
sparkles, floating symbols, speed lines, dust, floor shadows, glow, blur,
motion trails, checkerboard background, or scenery. Nothing detached from the
mascot's body.

ROWS
Row 0 - idle: 6 frames. Calm loop. Small blink, breathing, or gentle bob.
Row 1 - working: 8 frames. Busy focus loop. Small head, hand, posture changes.
Row 2 - carried: 8 frames. Being picked up and dragged, playful limb movement.
Row 3 - waving: 4 frames. Friendly wave, arm and hand only.
Row 4 - jumping: 5 frames. Small celebratory jump, vertical pose change only.
Row 5 - disappointed: 8 frames. Brief let-down reaction. Attached tears or a
        small puff touching the body are fine; nothing detached.
Row 6 - waiting: 6 frames. Quiet paused loop. Mild blink or small sway.
Row 7 - reviewing: 6 frames. Focused checking loop. Lean, head tilt, blink.
Row 8 - active: 6 frames. Busy in-progress loop, but not travelling anywhere.

Export as WebP under 1.5MB if you can.`;
