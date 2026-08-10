# Agent Instructions: Create A Flowmate Desktop Pet From A Mascot Sprite

You are creating Flowmate desktop pet assets, not a Codex pet package.

Hard boundaries:

- Do not install anything into `.codex/pets`.
- Do not replace `public/pet/pet.config.json` until the user approves the reviewed atlas.
- Do not invent a new mascot identity. Preserve the supplied mascot's face, outfit, palette, silhouette, proportions, and signature props.
- Do not use detached effects, wave marks, speed lines, dust clouds, floor shadows, speech bubbles, text, UI panels, or frame numbers inside sprite cells.

- Do not produce a look grid or any `look_*` state. Cursor-following is a v2
  stock-mascot feature; this kit produces v1 only, and the validator rejects
  `look_*` on a v1 sheet.

Final asset contract (v1):

- Atlas size: `1536 x 1872` px.
- Cell size: `192 x 208` px.
- Grid: `8 columns x 9 rows`.
- Background: transparent.
- Unused cells: fully transparent.
- Mascot placement: centered in each cell with safe padding, never cropped, never crossing into another cell.

Workflow:

1. Inspect the mascot source image or sprite sheet.
2. Produce row strips or a full atlas using the `rows` array in `Docs/pet-kit/animation-rows.json`.
3. Keep every row visually consistent with the same mascot.
4. Save a review PNG and the final web-friendly atlas.
5. Copy `Docs/pet-kit/examples/seed-pet.config.json` and point `spritesheet` at
   the new atlas. Do not hand-write the `states` block — the seed already carries
   all 14 required names mapped onto the 9 v1 rows. A missing name does not
   error at runtime; it silently falls back to `idle`.
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

Use `Docs/pet-kit/moments.flowmate.json` for what each event should do on a v1
mascot. `public/pet/pet.config.json` is the live **v2** stock config — read it
for reference, but its row numbers and phase mapping are tier-specific and do
not apply here. [`Docs/pet-design-system.md`](../../pet-design-system.md)
explains which differences are intentional.

