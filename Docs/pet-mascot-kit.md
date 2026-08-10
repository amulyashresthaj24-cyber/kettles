# Flowmate Mascot Pet Kit

This kit is a reusable handoff for creating a Flowmate desktop pet from a mascot sprite sheet or reference image. It is not a finished pet run. It defines the sprite contract, animation moments, agent instructions, and validation commands future agents should use when turning a mascot into Flowmate pet assets.

## Output Contract

Flowmate's pet overlay reads `public/pet/pet.config.json`, then renders a sprite atlas inside `public/pet/assets/`.

**This kit produces v1 mascots.** v1 is the user-generated tier. v2 adds a
16-cell look grid for cursor-following and is authored in-house for stock
mascots only — it is not a kit output.

| Property | v1 — this kit | v2 — stock only |
| --- | --- | --- |
| Cell size | `192 x 208` px | `192 x 208` px |
| Sheet size | `8 x 9` cells | `8 x 11` cells |
| Final image size | `1536 x 1872` px | `1536 x 2288` px |
| Look grid | none | 16 cells, rows 9-10 |
| Recommended format | `webp` for app use, `png` for review | same |
| Background | transparent after cleanup | same |

Both tiers implement the **same 14 state names**, so a v1 mascot is a drop-in
replacement for a stock one everywhere above the renderer. v1 covers 14 names
with 9 art rows by aliasing — the canonical mapping is `stateMap` in
`Docs/pet-kit/animation-rows.json`, and
[`Docs/pet-design-system.md`](pet-design-system.md) explains the rules.

Rows are defined in `Docs/pet-kit/animation-rows.json`. The overlay can use fewer than 8 frames in a row; unused cells must stay transparent.

## Files In This Setup

| File | Purpose |
| --- | --- |
| `Docs/pet-kit/manifest.json` | Machine-readable kit definition and asset paths |
| `Docs/pet-kit/animation-rows.json` | The canonical rows, frame counts, fps, and behavior notes |
| `Docs/pet-kit/moments.flowmate.json` | Flowmate events and phases mapped to pet states |
| `Docs/pet-kit/prompts/AGENT_INSTRUCTIONS.md` | Instructions to give future agents with a mascot sheet |
| `Docs/pet-kit/prompts/ROW_PROMPTS.md` | Row-by-row sprite generation prompts |
| `scripts/pet/make-static-atlas.ps1` | Converts one mascot image into a placeholder transparent atlas |
| `scripts/pet/validate-pet-atlas.mjs` | Checks atlas/config geometry before swapping assets |
| `src/lib/pet-context.ts` | `PetAnimationState` union + the deterministic intervention selector |

## Future Agent Workflow

1. Put the mascot sprite or reference image somewhere accessible.
2. Give the future agent `Docs/pet-kit/prompts/AGENT_INSTRUCTIONS.md` and `Docs/pet-kit/animation-rows.json`.
3. Ask it to generate row strips or a full atlas matching the exact contract above.
4. Save the finished atlas to `public/pet/assets/<mascot-name>.webp` or `.png`.
5. Copy `Docs/pet-kit/examples/seed-pet.config.json`, update the `spritesheet` path, then validate it:

```bash
node scripts/pet/validate-pet-atlas.mjs --atlas public/pet/assets/<mascot-name>.png --config public/pet/pet.config.json
```

6. Only replace `public/pet/pet.config.json` after visual review confirms the pet identity is consistent across every row.

## Flowmate Moment Model

Flowmate drives the pet through a small signal shape:

```ts
petSignal({
  event: "timerStart",
  phase: "running",
  source: "Task title",
  detail: "00:12:34"
});
```

Use `src/lib/pet.ts` for valid events and phases, and the `PetAnimationState` union in
`src/lib/pet-context.ts` for valid animation states. That union is typed against
`public/pet/pet.config.json` — if a state name is not in both, it does not exist.

