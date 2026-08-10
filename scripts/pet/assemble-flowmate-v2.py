#!/usr/bin/env python3
"""Assemble Flowmate v2 staging atlas: preserve v1 8x9 rows, append 2 look rows.

This is the Flowmate-repo equivalent of the Codex hatch-pet final step. It does
not touch the live overlay assets unless you promote the outputs manually.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
STAGING = ROOT / "public" / "pet" / "staging" / "flowmate-v2"
SOURCE_ATLAS = STAGING / "source" / "flowmate-v1-reference.webp"
LOOK_ROWS = [
    STAGING / "decoded" / "look-row-9-source.png",
    STAGING / "decoded" / "look-row-10-source.png",
]
FINAL_DIR = STAGING / "final"
QA_DIR = STAGING / "qa"
CELL_W, CELL_H = 192, 208
COLS = 8
BASE_ROWS = 9
LOOK_ROW_COUNT = 2
TARGET_W = CELL_W * COLS  # 1536
TARGET_H = CELL_H * (BASE_ROWS + LOOK_ROW_COUNT)  # 2288
# Match v1 content height (~198px) with a little breathing room.
FIT_PAD_X = 12
FIT_PAD_Y = 5
DIRECTIONS = [
    ["000", "022.5", "045", "067.5", "090", "112.5", "135", "157.5"],
    ["180", "202.5", "225", "247.5", "270", "292.5", "315", "337.5"],
]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest().upper()


def chroma_to_alpha(im: Image.Image) -> Image.Image:
    """Key near-magenta (~239,6,231) and soft magenta fringe to transparent."""
    im = im.convert("RGBA")
    arr = np.array(im)
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    a = arr[:, :, 3]
    bright = (r > 190) & (b > 190) & (g < 90) & ((r - g) > 80) & ((b - g) > 80)
    fringe = (r > 150) & (b > 150) & (g < 110) & (r > g * 1.4) & (b > g * 1.4)
    low_alpha = a < 8
    mask = bright | fringe | low_alpha
    arr[mask, 3] = 0
    return Image.fromarray(arr, "RGBA")


def content_bbox(im: Image.Image) -> tuple[int, int, int, int] | None:
    alpha = im.getchannel("A")
    return alpha.getbbox()


def split_strip(path: Path) -> list[Image.Image]:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    cells: list[Image.Image] = []
    for i in range(COLS):
        x0 = int(round(i * w / COLS))
        x1 = int(round((i + 1) * w / COLS))
        cells.append(im.crop((x0, 0, x1, h)))
    return cells


def normalize_cells(raw_cells: list[Image.Image]) -> tuple[list[Image.Image], dict]:
    cleaned = [chroma_to_alpha(cell) for cell in raw_cells]
    bboxes = []
    for cell in cleaned:
        box = content_bbox(cell)
        if box is None:
            raise RuntimeError("Look cell has no non-magenta content")
        bboxes.append(box)

    max_w = max(b[2] - b[0] for b in bboxes)
    max_h = max(b[3] - b[1] for b in bboxes)
    fit_w = CELL_W - FIT_PAD_X * 2
    fit_h = CELL_H - FIT_PAD_Y * 2
    scale = min(fit_w / max_w, fit_h / max_h)

    out: list[Image.Image] = []
    stats = []
    for cell, box in zip(cleaned, bboxes):
        crop = cell.crop(box)
        draw_w = max(1, int(round(crop.width * scale)))
        draw_h = max(1, int(round(crop.height * scale)))
        resized = crop.resize((draw_w, draw_h), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        dx = (CELL_W - draw_w) // 2
        dy = (CELL_H - draw_h) // 2
        canvas.alpha_composite(resized, (dx, dy))
        out.append(canvas)
        stats.append(
            {
                "sourceBbox": list(box),
                "placed": {"x": dx, "y": dy, "w": draw_w, "h": draw_h},
                "scale": round(scale, 6),
            }
        )
    return out, {"sharedScale": round(scale, 6), "maxSource": {"w": max_w, "h": max_h}, "frames": stats}


def build_contact_sheet(atlas: Image.Image, out_path: Path) -> None:
    cols, rows = COLS, BASE_ROWS + LOOK_ROW_COUNT
    gap = 8
    label_h = 18
    sheet_w = cols * CELL_W + (cols + 1) * gap
    sheet_h = rows * (CELL_H + label_h) + (rows + 1) * gap
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (24, 28, 36, 255))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None

    for r in range(rows):
        for c in range(cols):
            cell = atlas.crop((c * CELL_W, r * CELL_H, (c + 1) * CELL_W, (r + 1) * CELL_H))
            x = gap + c * (CELL_W + gap)
            y = gap + r * (CELL_H + label_h + gap)
            # Checker behind transparent cells
            for yy in range(0, CELL_H, 16):
                for xx in range(0, CELL_W, 16):
                    shade = 40 if ((xx // 16) + (yy // 16)) % 2 == 0 else 52
                    draw.rectangle([x + xx, y + yy, x + xx + 15, y + yy + 15], fill=(shade, shade, shade, 255))
            sheet.alpha_composite(cell, (x, y))
            label = f"r{r}c{c}"
            if r >= BASE_ROWS:
                dirs = DIRECTIONS[r - BASE_ROWS]
                label = f"look {dirs[c]}"
            draw.text((x + 4, y + CELL_H + 2), label, fill=(220, 220, 220, 255), font=font)
    sheet.convert("RGB").save(out_path, "PNG")


def build_look_preview(cells: list[Image.Image], labels: list[str], out_path: Path) -> None:
    gap = 10
    w = COLS * CELL_W + (COLS + 1) * gap
    h = CELL_H + 40 + gap * 2
    sheet = Image.new("RGBA", (w, h), (24, 28, 36, 255))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for i, (cell, label) in enumerate(zip(cells, labels)):
        x = gap + i * (CELL_W + gap)
        y = gap
        for yy in range(0, CELL_H, 16):
            for xx in range(0, CELL_W, 16):
                shade = 40 if ((xx // 16) + (yy // 16)) % 2 == 0 else 52
                draw.rectangle([x + xx, y + yy, x + xx + 15, y + yy + 15], fill=(shade, shade, shade, 255))
        sheet.alpha_composite(cell, (x, y))
        draw.text((x + 4, y + CELL_H + 6), label, fill=(220, 220, 220, 255), font=font)
    sheet.convert("RGB").save(out_path, "PNG")


def write_test_config(out_path: Path, spritesheet_rel: str) -> None:
    if out_path.exists():
        base = json.loads(out_path.read_text(encoding="utf-8"))
    else:
        base = json.loads((STAGING / "source" / "pet-v1.config.json").read_text(encoding="utf-8"))
    base["_comment"] = (
        "TEST-ONLY Flowmate v2 overlay config. Points at the staged 11-row atlas. "
        "Do not replace public/pet/pet.config.json until visual review passes. "
        "Launch with FLOWMATE_PET_V2_TEST=1."
    )
    base["spritesheet"] = spritesheet_rel
    base["sheet"] = {"cols": COLS, "rows": BASE_ROWS + LOOK_ROW_COUNT}
    base["spriteVersionNumber"] = 2
    base["lookDirections"] = {
        "enabled": True,
        "deadzonePx": 20,
        "phases": ["idle", "running", "paused", "finished"],
    }
    base.setdefault("states", {})
    for i, deg in enumerate(DIRECTIONS[0]):
        base["states"][f"look_{deg.replace('.', '_')}"] = {
            "row": 9,
            "col": i,
            "frames": 1,
            "fps": 1,
            "loop": True,
        }
    for i, deg in enumerate(DIRECTIONS[1]):
        base["states"][f"look_{deg.replace('.', '_')}"] = {
            "row": 10,
            "col": i,
            "frames": 1,
            "fps": 1,
            "loop": True,
        }
    out_path.write_text(json.dumps(base, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    FINAL_DIR.mkdir(parents=True, exist_ok=True)
    QA_DIR.mkdir(parents=True, exist_ok=True)

    report: dict = {
        "status": "assembled",
        "target": {"width": TARGET_W, "height": TARGET_H, "cols": COLS, "rows": BASE_ROWS + LOOK_ROW_COUNT},
        "inputs": {},
        "lookRows": [],
    }

    for label, path in [
        ("sourceAtlas", SOURCE_ATLAS),
        ("lookRow9", LOOK_ROWS[0]),
        ("lookRow10", LOOK_ROWS[1]),
    ]:
        report["inputs"][label] = {
            "path": str(path.relative_to(STAGING)).replace("\\", "/"),
            "sha256": sha256_file(path),
            "size": list(Image.open(path).size),
        }

    base = Image.open(SOURCE_ATLAS).convert("RGBA")
    if base.size != (TARGET_W, CELL_H * BASE_ROWS):
        raise RuntimeError(f"Unexpected source atlas size {base.size}")

    atlas = Image.new("RGBA", (TARGET_W, TARGET_H), (0, 0, 0, 0))
    atlas.paste(base, (0, 0))

    row9_raw = split_strip(LOOK_ROWS[0])
    row9_cells, row9_meta = normalize_cells(row9_raw)
    row10_raw = split_strip(LOOK_ROWS[1])
    row10_cells, row10_meta = normalize_cells(row10_raw)

    for row_index, (cells, meta, path) in enumerate(
        [
            (row9_cells, row9_meta, LOOK_ROWS[0]),
            (row10_cells, row10_meta, LOOK_ROWS[1]),
        ]
    ):
        dest_y = (BASE_ROWS + row_index) * CELL_H
        for col, cell in enumerate(cells):
            atlas.alpha_composite(cell, (col * CELL_W, dest_y))
        report["lookRows"].append(
            {
                "row": BASE_ROWS + row_index,
                "directions": DIRECTIONS[row_index],
                "source": str(path.relative_to(STAGING)).replace("\\", "/"),
                **meta,
            }
        )
        build_look_preview(
            cells,
            DIRECTIONS[row_index],
            QA_DIR / f"look-row-{BASE_ROWS + row_index}-normalized.png",
        )

    png_path = FINAL_DIR / "spritesheet.png"
    webp_path = FINAL_DIR / "spritesheet.webp"
    atlas.save(png_path, "PNG")
    atlas.save(webp_path, "WEBP", quality=95, method=6)

    build_contact_sheet(atlas, QA_DIR / "contact-sheet.png")

    # Direction semantics cheat-sheet
    semantics = {
        "convention": "Clockwise degrees from up. pet.js uses atan2(dx, -dy).",
        "rows": [
            {"row": 9, "directions": DIRECTIONS[0], "note": "000 through 157.5 from source strip"},
            {
                "row": 10,
                "directions": DIRECTIONS[1],
                "note": "180 through 337.5 from the corrected coherent source strip",
            },
        ],
        "blindCheck": "000 must look up, 090 right, 180 down, and 270 left. Sweep must read as one clockwise gaze loop.",
    }
    (QA_DIR / "direction-semantics.json").write_text(json.dumps(semantics, indent=2) + "\n", encoding="utf-8")

    config_path = STAGING / "pet-v2.test.config.json"
    # Relative path from public/pet/ so the overlay can load it in a test harness.
    write_test_config(config_path, "staging/flowmate-v2/final/spritesheet.webp")

    report["outputs"] = {
        "spritesheetPng": str(png_path.relative_to(STAGING)).replace("\\", "/"),
        "spritesheetWebp": str(webp_path.relative_to(STAGING)).replace("\\", "/"),
        "contactSheet": "qa/contact-sheet.png",
        "testConfig": "pet-v2.test.config.json",
        "sha256Webp": sha256_file(webp_path),
        "sizeWebp": list(Image.open(webp_path).size),
    }
    (QA_DIR / "assembly-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    # Update staging manifest
    pet = json.loads((STAGING / "pet.json").read_text(encoding="utf-8"))
    pet["status"] = "assembled-awaiting-review"
    pet["spritesheetPath"] = "final/spritesheet.webp"
    pet["sheet"] = {"cols": COLS, "rows": BASE_ROWS + LOOK_ROW_COUNT}
    pet["testConfig"] = "pet-v2.test.config.json"
    (STAGING / "pet.json").write_text(json.dumps(pet, indent=2) + "\n", encoding="utf-8")

    jobs = json.loads((STAGING / "imagegen-jobs.json").read_text(encoding="utf-8"))
    jobs["status"] = "assembled-awaiting-review"
    for entry in jobs.get("lookRows", []):
        entry["status"] = "extracted-normalized-in-final-atlas"
    (STAGING / "imagegen-jobs.json").write_text(json.dumps(jobs, indent=2) + "\n", encoding="utf-8")

    print("Flowmate v2 assembly complete")
    print(f"  atlas: {webp_path} ({TARGET_W}x{TARGET_H})")
    print(f"  contact: {QA_DIR / 'contact-sheet.png'}")
    print(f"  test config: {config_path}")
    print(f"  report: {QA_DIR / 'assembly-report.json'}")


if __name__ == "__main__":
    main()
