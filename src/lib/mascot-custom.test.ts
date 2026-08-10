import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CUSTOM_MASCOT_KEY,
  MASCOT_GENERATION_PROMPT,
  MAX_ATLAS_BYTES,
  V1_ATLAS,
  V1_EVENTS,
  V1_PHASE_STATES,
  V1_STATES,
  buildCustomMascotConfig,
  clearCustomMascot,
  readCustomMascot,
  saveCustomMascot,
  validateAtlasDimensions,
  validateAtlasFile,
  type CustomMascot,
} from "./mascot-custom";

/** Minimal in-memory Storage — the module takes one so it needs no DOM. */
function fakeStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

const throwingStorage = (): Storage =>
  ({
    ...fakeStorage(),
    setItem: () => {
      throw new DOMException("QuotaExceededError");
    },
  }) as Storage;

const sample = (over: Partial<CustomMascot> = {}): CustomMascot => ({
  dataUrl: "data:image/webp;base64,AAAA",
  width: V1_ATLAS.width,
  height: V1_ATLAS.height,
  fileName: "me.webp",
  savedAt: 1_700_000_000_000,
  ...over,
});

const repoRoot = path.resolve(__dirname, "..", "..");

describe("v1 atlas geometry", () => {
  it("derives the 1536x1872 sheet from the cell size", () => {
    expect(V1_ATLAS.width).toBe(1536);
    expect(V1_ATLAS.height).toBe(1872);
  });

  it("matches the kit's published v1 contract", () => {
    const kit = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "Docs", "pet-kit", "animation-rows.json"), "utf8")
    );
    expect(kit.sheet).toEqual({ cols: V1_ATLAS.cols, rows: V1_ATLAS.rows });
    expect(kit.cell).toEqual({ width: V1_ATLAS.cellWidth, height: V1_ATLAS.cellHeight });
    expect(kit.lookGrid).toBe(false);
  });
});

describe("V1_STATES", () => {
  // The renderer falls back to idle for an unmapped name instead of throwing,
  // so an omission here would ship silently.
  const vocabulary: string[] = (() => {
    const source = fs.readFileSync(path.join(repoRoot, "src", "lib", "pet.ts"), "utf8");
    const union = /export type PetAnimationState\s*=([\s\S]*?);/.exec(source);
    if (!union) throw new Error("Could not find the PetAnimationState union");
    return Array.from(union[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]);
  })();

  it("covers the whole PetAnimationState union", () => {
    const declared = Object.keys(V1_STATES);
    expect(vocabulary.filter((name) => !declared.includes(name))).toEqual([]);
  });

  it("declares nothing outside the union", () => {
    expect(Object.keys(V1_STATES).filter((name) => !vocabulary.includes(name))).toEqual([]);
  });

  it("declares no look states — v1 has no look grid", () => {
    expect(Object.keys(V1_STATES).filter((n) => n.startsWith("look_"))).toEqual([]);
  });

  it("keeps every state inside the 8x9 sheet", () => {
    for (const [name, state] of Object.entries(V1_STATES)) {
      const s = state as { row?: number; col?: number; frames?: number };
      expect(s.row ?? 0, `${name} row`).toBeLessThan(V1_ATLAS.rows);
      expect((s.col ?? 0) + (s.frames ?? 1), `${name} frames`).toBeLessThanOrEqual(V1_ATLAS.cols);
    }
  });

  it("resolves every event and phase reference", () => {
    const declared = Object.keys(V1_STATES);
    const refs: string[] = [];
    for (const mapping of Object.values(V1_EVENTS)) {
      if (typeof mapping === "string") refs.push(mapping);
      else refs.push(mapping.play, mapping.then);
    }
    refs.push(...Object.values(V1_PHASE_STATES));
    expect(refs.filter((name) => !declared.includes(name))).toEqual([]);
  });

  it("matches the kit seed config the generation prompt tells agents to copy", () => {
    const seed = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot, "Docs", "pet-kit", "examples", "seed-pet.config.json"),
        "utf8"
      )
    );
    expect(Object.keys(seed.states).sort()).toEqual(Object.keys(V1_STATES).sort());
    expect(seed.phaseStates).toEqual(V1_PHASE_STATES);
  });
});

describe("buildCustomMascotConfig", () => {
  it("points the sheet at the uploaded data URL and stays v1", () => {
    const cfg = buildCustomMascotConfig("data:image/webp;base64,ZZZ");
    expect(cfg.spritesheet).toBe("data:image/webp;base64,ZZZ");
    expect(cfg.sheet).toEqual({ cols: 8, rows: 9 });
    expect(cfg.spriteVersionNumber).toBe(1);
  });

  it("omits lookDirections so the overlay skips cursor tracking", () => {
    expect(buildCustomMascotConfig("data:image/webp;base64,ZZZ")).not.toHaveProperty(
      "lookDirections"
    );
  });
});

describe("validateAtlasFile", () => {
  it("accepts WebP and PNG under the cap", () => {
    expect(validateAtlasFile({ type: "image/webp", size: 500_000 })).toBeNull();
    expect(validateAtlasFile({ type: "image/png", size: 500_000 })).toBeNull();
  });

  it("rejects other formats", () => {
    expect(validateAtlasFile({ type: "image/jpeg", size: 100 })).toMatch(/WebP or PNG/);
    expect(validateAtlasFile({ type: "image/gif", size: 100 })).toMatch(/WebP or PNG/);
  });

  it("rejects oversized and empty files", () => {
    expect(validateAtlasFile({ type: "image/png", size: MAX_ATLAS_BYTES + 1 })).toMatch(/MB/);
    expect(validateAtlasFile({ type: "image/webp", size: 0 })).toMatch(/empty/);
  });
});

describe("validateAtlasDimensions", () => {
  it("accepts the exact v1 sheet", () => {
    expect(validateAtlasDimensions(1536, 1872)).toBeNull();
  });

  it("rejects a v2 sheet — the look grid is stock-only", () => {
    expect(validateAtlasDimensions(1536, 2288)).toMatch(/1536x1872/);
  });

  it("names both the expected and the actual size", () => {
    const message = validateAtlasDimensions(800, 600);
    expect(message).toContain("1536x1872");
    expect(message).toContain("800x600");
  });
});

describe("storage", () => {
  it("round-trips a saved mascot", () => {
    const storage = fakeStorage();
    expect(saveCustomMascot(sample(), storage)).toBeNull();
    expect(readCustomMascot(storage)).toEqual(sample());
  });

  it("returns null when nothing is stored", () => {
    expect(readCustomMascot(fakeStorage())).toBeNull();
  });

  it("returns null for corrupt or truncated entries instead of throwing", () => {
    expect(readCustomMascot(fakeStorage({ [CUSTOM_MASCOT_KEY]: "{not json" }))).toBeNull();
    expect(readCustomMascot(fakeStorage({ [CUSTOM_MASCOT_KEY]: "{}" }))).toBeNull();
    expect(
      readCustomMascot(fakeStorage({ [CUSTOM_MASCOT_KEY]: '{"dataUrl":"https://evil.test/x.png"}' }))
    ).toBeNull();
  });

  it("reports a quota failure as a message rather than throwing", () => {
    const error = saveCustomMascot(sample(), throwingStorage());
    expect(error).toMatch(/storage space/);
  });

  it("treats unavailable storage as a reportable failure, not a crash", () => {
    expect(saveCustomMascot(sample(), null)).toMatch(/local storage/);
    expect(readCustomMascot(null)).toBeNull();
    expect(() => clearCustomMascot(null)).not.toThrow();
  });

  it("clears the entry", () => {
    const storage = fakeStorage();
    saveCustomMascot(sample(), storage);
    clearCustomMascot(storage);
    expect(readCustomMascot(storage)).toBeNull();
  });
});

describe("MASCOT_GENERATION_PROMPT", () => {
  it("states the exact geometry the validator enforces", () => {
    expect(MASCOT_GENERATION_PROMPT).toContain("1536 x 1872");
    expect(MASCOT_GENERATION_PROMPT).toContain("8 columns x 9 rows");
    expect(MASCOT_GENERATION_PROMPT).toContain("192 x 208");
  });

  it("describes all nine rows with the frame counts V1_STATES expects", () => {
    for (let row = 0; row <= 8; row++) {
      expect(MASCOT_GENERATION_PROMPT).toContain(`Row ${row} -`);
    }
    // Frame counts the states map actually reads, in row order.
    for (const [row, frames] of [[0, 6], [1, 8], [2, 8], [3, 4], [4, 5], [5, 8], [6, 6], [7, 6], [8, 6]]) {
      const line = MASCOT_GENERATION_PROMPT.split("\n").find((l) => l.startsWith(`Row ${row} -`));
      expect(line, `row ${row}`).toContain(`${frames} frames`);
    }
  });

  it("forbids detached effects and transparent-background violations", () => {
    expect(MASCOT_GENERATION_PROMPT).toMatch(/transparent background/i);
    expect(MASCOT_GENERATION_PROMPT).toMatch(/speed lines/i);
    expect(MASCOT_GENERATION_PROMPT).toMatch(/detached/i);
  });
});
