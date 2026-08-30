/**
 * Contract test for the pet animation vocabulary.
 *
 * The renderer guards every state lookup (`if (!cfg.states[next]) return`) and
 * falls back to `idle`. That is the right runtime behaviour — a broken mascot
 * should not crash the overlay — but it means a name that exists in the
 * TypeScript union and not in a config is invisible until someone happens to
 * watch for it. The kit's seed config shipped in exactly that state: it declared
 * `working_still` and `drag_running` (neither requestable by the host) and was
 * missing `drag_left`/`drag_right`, so every mascot generated from it had no
 * drag animation at all.
 *
 * This test is the only thing that makes that failure loud. See
 * `Docs/pet-design-system.md` for the tier rules it enforces.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..");
const read = (...segments: string[]) =>
  fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
const readJson = (...segments: string[]) => JSON.parse(read(...segments));

/**
 * The `PetAnimationState` union, parsed from source rather than duplicated —
 * a hardcoded copy here would drift the moment someone edits the union, which
 * is the exact class of bug this file exists to catch.
 */
const VOCABULARY: string[] = (() => {
  const source = read("src", "lib", "pet.ts");
  const union = /export type PetAnimationState\s*=([\s\S]*?);/.exec(source);
  if (!union) throw new Error("Could not find the PetAnimationState union in src/lib/pet.ts");
  const names = Array.from(union[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]);
  if (names.length === 0) throw new Error("PetAnimationState parsed to zero states");
  return names;
})();

interface PetStateConfig {
  row?: number;
  col?: number;
  frames?: number;
}

interface PetConfig {
  states?: Record<string, PetStateConfig>;
  events?: Record<string, string | { play?: string; then?: string }>;
  phaseStates?: Record<string, string>;
  sheet?: { cols: number; rows: number };
  cell?: { width: number; height: number };
  lookDirections?: { enabled?: boolean };
}

const liveConfig: PetConfig = readJson("public", "pet", "pet.config.json");
const seedConfig: PetConfig = readJson(
  "Docs", "pet-kit", "examples", "seed-pet.config.json"
);
const kitRows = readJson("Docs", "pet-kit", "animation-rows.json");

const stateNames = (config: PetConfig) => Object.keys(config.states ?? {});
const lookNames = (config: PetConfig) =>
  stateNames(config).filter((name) => name.startsWith("look_"));

/** Every state name an `events` / `phaseStates` block points at. */
function referencedStates(config: PetConfig): Array<[string, string]> {
  const refs: Array<[string, string]> = [];
  for (const [event, mapping] of Object.entries(config.events ?? {})) {
    if (typeof mapping === "string") refs.push([`events.${event}`, mapping]);
    else {
      if (mapping.play) refs.push([`events.${event}.play`, mapping.play]);
      if (mapping.then) refs.push([`events.${event}.then`, mapping.then]);
    }
  }
  for (const [phase, name] of Object.entries(config.phaseStates ?? {})) {
    refs.push([`phaseStates.${phase}`, name]);
  }
  return refs;
}

describe("pet animation vocabulary", () => {
  it("is non-trivial and free of look cells", () => {
    // The look grid is renderer-owned and must never enter the union — the host
    // is not allowed to request a head angle.
    expect(VOCABULARY.length).toBeGreaterThanOrEqual(10);
    expect(VOCABULARY.filter((n) => n.startsWith("look_"))).toEqual([]);
  });

  const configs: Array<[string, PetConfig]> = [
    ["live v2 config", liveConfig],
    ["v1 seed config", seedConfig],
  ];

  describe.each(configs)("%s", (_label, config) => {
    it("declares every vocabulary state", () => {
      const declared = stateNames(config);
      expect(VOCABULARY.filter((name) => !declared.includes(name))).toEqual([]);
    });

    it("declares no state outside the vocabulary", () => {
      const extra = stateNames(config).filter(
        (name) => !name.startsWith("look_") && !VOCABULARY.includes(name)
      );
      expect(extra).toEqual([]);
    });

    it("resolves every event and phase reference", () => {
      const declared = stateNames(config);
      const dangling = referencedStates(config)
        .filter(([, name]) => !declared.includes(name))
        .map(([where, name]) => `${where} -> ${name}`);
      expect(dangling).toEqual([]);
    });

    it("keeps every state inside the sheet", () => {
      const sheet = config.sheet ?? { cols: 8, rows: 9 };
      const overflow: string[] = [];
      for (const [name, state] of Object.entries(config.states ?? {})) {
        const row = state.row ?? 0;
        const col = state.col ?? 0;
        const frames = state.frames ?? 1;
        if (row < 0 || row >= sheet.rows) overflow.push(`${name}: row ${row}`);
        if (col < 0 || col + frames > sheet.cols) {
          overflow.push(`${name}: col ${col} + ${frames} frames`);
        }
      }
      expect(overflow).toEqual([]);
    });
  });
});

describe("pet mascot tiers", () => {
  it("ships the live overlay as v2 with a full look grid", () => {
    expect(liveConfig.sheet).toEqual({ cols: 8, rows: 11 });
    expect(lookNames(liveConfig)).toHaveLength(16);
    expect(liveConfig.lookDirections?.enabled).toBe(true);
  });

  it("keeps the kit on v1 with no look grid", () => {
    // Cursor-following costs 16 hand-drawn head angles per mascot, so it stays a
    // stock-mascot feature. A user mascot without it degrades cleanly: pet.js
    // short-circuits when `lookDirections` is absent.
    expect(seedConfig.sheet).toEqual({ cols: 8, rows: 9 });
    expect(lookNames(seedConfig)).toEqual([]);
    expect(seedConfig.lookDirections?.enabled).toBeUndefined();
    expect(kitRows.tier).toBe("v1");
    expect(kitRows.lookGrid).toBe(false);
  });

  it("maps the whole vocabulary onto v1 art rows in the kit stateMap", () => {
    // The kit's stateMap is what a generating agent copies. If a name is absent
    // here, every mascot produced from the kit is silently missing that state.
    const mapped = Object.keys(kitRows.stateMap ?? {}).filter((k) => !k.startsWith("_"));
    expect(VOCABULARY.filter((name) => !mapped.includes(name))).toEqual([]);

    const rowCount = kitRows.sheet.rows;
    for (const [name, state] of Object.entries(kitRows.stateMap ?? {})) {
      if (name.startsWith("_")) continue;
      const s = state as PetStateConfig;
      expect(s.row ?? 0, `${name} row`).toBeLessThan(rowCount);
      expect((s.col ?? 0) + (s.frames ?? 1), `${name} frames`).toBeLessThanOrEqual(
        kitRows.sheet.cols
      );
    }
  });
});

describe("overlay copy encoding", () => {
  it("uses real close and hint glyphs instead of mojibake", () => {
    const html = read("public", "pet", "overlay.html");
    expect(html).toContain(">×</button>");
    expect(html).toContain("Enter saves · Esc closes");
    expect(html).not.toContain("├ù");
    expect(html).not.toContain("┬╖");
  });

  it("keeps overlay status strings free of mojibake", () => {
    const js = read("public", "pet", "pet.js");
    expect(js).toContain("Syncing…");
    expect(js).toContain("Offline · ");
    expect(js).not.toContain("SyncingΓÇª");
    expect(js).not.toContain("Offline ┬╖");
  });
});

describe("settings and in-app previews", () => {
  it("preview the live v2 atlases, not the retired v1 companion sheet", () => {
    const settings = read("src", "app", "settings", "page.tsx");
    const globals = read("src", "app", "globals.css");
    expect(settings).toContain("/pet/assets/spritesheet.webp");
    expect(settings).toContain("/pet/assets/sprite-2-v2.clean.webp");
    expect(settings).not.toContain("sprite-2.clean.webp");
    expect(globals).toContain("/pet/assets/sprite-2-v2.clean.webp");
    expect(globals).not.toContain("url('/pet/assets/sprite-2.clean.webp')");
  });
});

describe("pet.js mascot presets", () => {
  // Presets live in vanilla JS inside the overlay bundle, so they cannot be
  // imported. Scanning the source for declared keys still catches the failure
  // that matters: a preset missing a name renders idle instead of that state.
  const source = read("public", "pet", "pet.js");
  const presetNames = Array.from(source.matchAll(/const (\w*PRESET)\s*=\s*\{/g)).map((m) => m[1]);

  it("finds at least one preset to check", () => {
    expect(presetNames.length).toBeGreaterThan(0);
  });

  it.each(presetNames)("%s implements the full vocabulary", (presetName) => {
    const start = source.indexOf(`const ${presetName} =`);
    const statesStart = source.indexOf("states:", start);
    // Presets are object literals ending at the first line-start `};`.
    const end = source.indexOf("\n};", statesStart);
    const block = source.slice(statesStart, end);
    const declared = Array.from(block.matchAll(/^\s*([A-Za-z_][\w]*)\s*:/gm)).map((m) => m[1]);
    expect(VOCABULARY.filter((name) => !declared.includes(name))).toEqual([]);
  });
});
