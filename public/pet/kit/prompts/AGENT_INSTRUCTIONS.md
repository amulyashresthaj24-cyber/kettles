# Agent Instructions: Create A Flowmate Desktop Pet From A Mascot Sprite

You are creating Flowmate desktop pet assets, not a Codex pet package.

Hard boundaries:

- Do not install anything into `.codex/pets`.
- Do not replace `public/pet/pet.config.json` until the user approves the reviewed atlas.
- Do not invent a new mascot identity. Preserve the supplied mascot's face, outfit, palette, silhouette, proportions, and signature props.
- Do not use detached effects, wave marks, speed lines, dust clouds, floor shadows, speech bubbles, text, UI panels, or frame numbers inside sprite cells.

Final asset contract:

- Atlas size: `1536 x 1872` px.
- Cell size: `192 x 208` px.
- Grid: `8 columns x 9 rows`.
- Background: transparent.
- Unused cells: fully transparent.
- Mascot placement: centered in each cell with safe padding, never cropped, never crossing into another cell.

Workflow:

1. Inspect the mascot source image or sprite sheet.
2. Produce row strips or a full atlas using `public/pet/kit/animation-rows.json`.
3. Keep every row visually consistent with the same mascot.
4. Save a review PNG and the final web-friendly atlas.
5. Create or update a config that points `spritesheet` to the new atlas.
6. Run:

```bash
node scripts/pet/validate-pet-atlas.mjs --atlas <atlas-path> --config <config-path>
```

7. Provide the user with:

- the final atlas path
- the review/contact-sheet path
- the config path
- validation output
- any rows that need manual visual review

Flowmate should signal the pet using `src/lib/pet.ts`:

```ts
petSignal({
  event: "timerStart",
  phase: "running",
  source: "Task title",
  detail: "00:12:34"
});
```

Use `src/lib/pet-moment-instructions.ts` and `public/pet/kit/moments.flowmate.json` as the source of truth for what each event should do.

