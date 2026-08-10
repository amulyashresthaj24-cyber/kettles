# Flowmate v2 staging

Staging + QA for the directional-look upgrade. Live atlas/config are already on v2;
row-10 left-hemisphere was refixed in place while keeping `look_000`.

## Status

`live-refixed` — row 10 cols 1–7 mirrored from live row 9; **up cell (`000`) preserved**.

Source row 10 re-drew the right hemisphere, so left side is mirrored until true
left-side art exists. Bag/book flip with those mirrors.

## Test in the desktop overlay

```powershell
$env:FLOWMATE_PET_V2_TEST="1"
npm run tauri:dev
```

That loads `pet/pet.html?petConfig=v2` → `pet-v2.test.config.json` + staged atlas.
Move the cursor around the pet to exercise `lookDirections`.

## Contents

| Path | Role |
| --- | --- |
| `source/flowmate-v1-reference.webp` | Approved 8×9 Flowmate atlas (rows 0–8) |
| `decoded/look-row-9-source.png` | Source strip: 000 → 157.5° |
| `decoded/look-row-10-source.png` | Source strip (front usable; rest replaced by mirrors) |
| `final/spritesheet.webp` | **1536×2288** assembled atlas (8×11) |
| `final/spritesheet.png` | Same atlas as PNG for inspection |
| `pet-v2.test.config.json` | Test-only overlay config (`lookDirections` enabled) |
| `qa/contact-sheet.png` | Full atlas contact sheet |
| `qa/look-row-*-normalized.png` | Final look rows with degree labels |
| `qa/look-row-10-source-normalized-unfixed.png` | Pre-fix row 10 for comparison |
| `qa/look-direction-sweep.webp` | Animated 16-frame direction sweep |
| `qa/direction-semantics.json` | Angle → cell map + mirror provenance |
| `qa/assembly-report.json` | Hashes, scales, placement stats |

## Re-run assembly

```bash
python scripts/pet/assemble-flowmate-v2.py
python scripts/pet/preview-flowmate-v2-look.py
```

## Live atlas note

`public/pet/assets/spritesheet.webp` was refixed in place: row 10 cols 1–7
mirrored from live row 9; **`look_000` (up / back view) left untouched**.
Pre-fix backup: `source/spritesheet-live-pre-row10-fix.webp`.

