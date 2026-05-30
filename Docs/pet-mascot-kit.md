# Flowmate Mascot Pet Kit

This kit is a reusable handoff for creating a Flowmate desktop pet from a mascot sprite sheet or reference image. It is not a finished pet run. It defines the sprite contract, animation moments, agent instructions, and validation commands future agents should use when turning a mascot into Flowmate pet assets.

## Output Contract

Flowmate's pet overlay reads `public/pet/pet.config.json`, then renders a sprite atlas inside `public/pet/assets/`.

Required atlas geometry:

| Property | Value |
| --- | --- |
| Cell size | `192 x 208` px |
| Sheet size | `8 x 9` cells |
| Final image size | `1536 x 1872` px |
| Recommended format | `webp` for app use, `png` for review |
| Background | transparent after cleanup |

Rows are defined in `public/pet/kit/animation-rows.json`. The overlay can use fewer than 8 frames in a row; unused cells must stay transparent.

## Files In This Setup

| File | Purpose |
| --- | --- |
| `public/pet/kit/manifest.json` | Machine-readable kit definition and asset paths |
| `public/pet/kit/animation-rows.json` | The canonical rows, frame counts, fps, and behavior notes |
| `public/pet/kit/moments.flowmate.json` | Flowmate events and phases mapped to pet states |
| `public/pet/kit/prompts/AGENT_INSTRUCTIONS.md` | Instructions to give future agents with a mascot sheet |
| `public/pet/kit/prompts/ROW_PROMPTS.md` | Row-by-row sprite generation prompts |
| `scripts/pet/make-static-atlas.ps1` | Converts one mascot image into a placeholder transparent atlas |
| `scripts/pet/validate-pet-atlas.mjs` | Checks atlas/config geometry before swapping assets |
| `src/lib/pet-moment-instructions.ts` | Typed helper data for app-side pet signals |

## Future Agent Workflow

1. Put the mascot sprite or reference image somewhere accessible.
2. Give the future agent `public/pet/kit/prompts/AGENT_INSTRUCTIONS.md` and `public/pet/kit/animation-rows.json`.
3. Ask it to generate row strips or a full atlas matching the exact contract above.
4. Save the finished atlas to `public/pet/assets/<mascot-name>.webp` or `.png`.
5. Copy `public/pet/kit/examples/seed-pet.config.json`, update the `spritesheet` path, then validate it:

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

Use `src/lib/pet-moment-instructions.ts` as the app-side reference for valid events, phases, and recommended states.

