#!/usr/bin/env python3
"""Refix live v2 atlas row 10 (left hemisphere) without touching look_000.

Uses the current live spritesheet so any live look-row-9 tweaks (including the
up / back cell at 000) are preserved. Mirrors complementary row-9 cells into
row-10 cols 1-7. Keeps source 180.
"""

from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
LIVE = ROOT / "public" / "pet" / "assets" / "spritesheet.webp"
STAGED = ROOT / "public" / "pet" / "staging" / "flowmate-v2" / "final" / "spritesheet.webp"
BACKUP = ROOT / "public" / "pet" / "staging" / "flowmate-v2" / "source" / "spritesheet-live-pre-row10-fix.webp"
QA = ROOT / "public" / "pet" / "staging" / "flowmate-v2" / "qa"
CELL_W, CELL_H = 192, 208
MIRROR = {1: 7, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1}


def main() -> None:
    atlas = Image.open(LIVE).convert("RGBA")
    if atlas.size != (1536, 2288):
        raise SystemExit(f"Expected 1536x2288 live atlas, got {atlas.size}")

    BACKUP.parent.mkdir(parents=True, exist_ok=True)
    if not BACKUP.exists():
        shutil.copy2(LIVE, BACKUP)

    arr = np.array(atlas)

    def cell(r: int, c: int) -> np.ndarray:
        return arr[r * CELL_H : (r + 1) * CELL_H, c * CELL_W : (c + 1) * CELL_W].copy()

    up_before = cell(9, 0)
    for col10, col9 in MIRROR.items():
        arr[10 * CELL_H : 11 * CELL_H, col10 * CELL_W : (col10 + 1) * CELL_W] = np.fliplr(cell(9, col9))

    if not np.array_equal(up_before, arr[9 * CELL_H : 10 * CELL_H, 0:CELL_W]):
        raise SystemExit("look_000 was modified — aborting")

    out = Image.fromarray(arr, "RGBA")
    STAGED.parent.mkdir(parents=True, exist_ok=True)
    out.save(LIVE, "WEBP", quality=95, method=6)
    out.save(STAGED, "WEBP", quality=95, method=6)
    out.save(STAGED.with_suffix(".png"), "PNG")

    c090 = cell(9, 4)
    c270 = arr[10 * CELL_H : 11 * CELL_H, 4 * CELL_W : 5 * CELL_W]
    flip = np.fliplr(c090)
    mask = (c270[:, :, 3] > 200) | (flip[:, :, 3] > 200)
    diff = np.abs(c270[:, :, :3].astype(int) - flip[:, :, :3].astype(int)).mean(axis=2)
    print("Refixed live row 10; look_000 preserved")
    print(f"  270 vs flip(090) mean abs: {float(diff[mask].mean()):.4f}")
    print(f"  live sha: {hashlib.sha256(LIVE.read_bytes()).hexdigest()[:16]}")

    QA.mkdir(parents=True, exist_ok=True)
    for r, c, name in [(9, 0, "000-up"), (9, 4, "090"), (10, 4, "270"), (10, 0, "180")]:
        plate = Image.new("RGBA", (CELL_W, CELL_H), (40, 40, 48, 255))
        plate.alpha_composite(Image.fromarray(arr[r * CELL_H : (r + 1) * CELL_H, c * CELL_W : (c + 1) * CELL_W]))
        plate.save(QA / f"refix-{name}.png")


if __name__ == "__main__":
    main()
