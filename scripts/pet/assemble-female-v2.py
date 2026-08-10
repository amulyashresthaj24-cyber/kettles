#!/usr/bin/env python3
"""Build the female mascot's canonical 8x11 v2 atlas from its approved 8x9 art."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
STAGING = ROOT / "public" / "pet" / "staging" / "female-v2"
SOURCE = STAGING / "source" / "sprite-2-v1-reference.webp"
LOOK_SOURCES = [
    STAGING / "decoded" / "look-row-9-source.png",
    STAGING / "decoded" / "look-row-10-source.png",
]
FINAL = STAGING / "final"
QA = STAGING / "qa"
CELL_W, CELL_H, COLS, BASE_ROWS = 192, 208, 8, 9
SOURCE_CELL_W, SOURCE_CELL_H = 118, 197
DIRECTIONS = [
    ["000", "022.5", "045", "067.5", "090", "112.5", "135", "157.5"],
    ["180", "202.5", "225", "247.5", "270", "292.5", "315", "337.5"],
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def key_magenta(image: Image.Image) -> Image.Image:
    """Remove the flat magenta source field while keeping antialiased sprite edges."""
    rgba = np.asarray(image.convert("RGBA")).copy()
    r, g, b = (rgba[:, :, index].astype(np.int16) for index in range(3))
    key = (r > 185) & (b > 185) & (g < 95) & ((r - g) > 80) & ((b - g) > 80)
    rgba[key, 3] = 0
    rgba[rgba[:, :, 3] == 0, :3] = 0
    return Image.fromarray(rgba, "RGBA")


def remove_detached_specks(image: Image.Image, minimum_pixels: int = 96) -> Image.Image:
    """Remove isolated source-atlas debris without altering connected sprite detail."""
    rgba = np.asarray(image.convert("RGBA")).copy()
    alpha = rgba[:, :, 3] > 16
    visited = np.zeros(alpha.shape, dtype=bool)
    height, width = alpha.shape
    for start_y, start_x in zip(*np.where(alpha)):
        if visited[start_y, start_x]:
            continue
        component = [(int(start_y), int(start_x))]
        visited[start_y, start_x] = True
        for y, x in component:
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < height and 0 <= nx < width and alpha[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        component.append((ny, nx))
        if len(component) < minimum_pixels:
            ys, xs = zip(*component)
            rgba[np.asarray(ys), np.asarray(xs), :] = 0
    return Image.fromarray(rgba, "RGBA")


def source_rows() -> list[Image.Image]:
    """Uniformly scale source cells so existing animation registration is retained."""
    atlas = Image.open(SOURCE).convert("RGBA")
    expected = (SOURCE_CELL_W * COLS, SOURCE_CELL_H * BASE_ROWS)
    if atlas.size != expected:
        raise RuntimeError(f"Expected source {expected}, got {atlas.size}")

    uniform_scale = CELL_H / SOURCE_CELL_H
    scaled_w = round(SOURCE_CELL_W * uniform_scale)
    rows: list[Image.Image] = []
    for row in range(BASE_ROWS):
        for col in range(COLS):
            source_cell = atlas.crop((
                col * SOURCE_CELL_W,
                row * SOURCE_CELL_H,
                (col + 1) * SOURCE_CELL_W,
                (row + 1) * SOURCE_CELL_H,
            ))
            scaled = remove_detached_specks(source_cell).resize((scaled_w, CELL_H), Image.Resampling.LANCZOS)
            cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
            cell.alpha_composite(scaled, ((CELL_W - scaled_w) // 2, 0))
            rows.append(cell)
    return rows


def direction_cells() -> tuple[list[list[Image.Image]], dict]:
    raw_rows: list[list[Image.Image]] = []
    bboxes: list[tuple[int, int, int, int]] = []
    for path in LOOK_SOURCES:
        strip = key_magenta(Image.open(path).convert("RGBA"))
        # Image generation leaves generous blank gutters between the eight
        # figures. Recover those complete pose groups from the strip rather
        # than splitting at arbitrary eighths, which can retain a sliver of a
        # neighbouring pose when a profile reaches past a nominal slot edge.
        alpha = np.asarray(strip.getchannel("A"))
        active_columns = np.count_nonzero(alpha > 16, axis=0) > 12
        runs: list[tuple[int, int]] = []
        start = None
        for x, active in enumerate(active_columns):
            if active and start is None:
                start = x
            elif not active and start is not None:
                runs.append((start, x))
                start = None
        if start is not None:
            runs.append((start, strip.width))
        if len(runs) != COLS:
            raise RuntimeError(f"Expected {COLS} separated poses in {path.name}, found {len(runs)}")
        cells: list[Image.Image] = []
        for left, right in runs:
            cell = strip.crop((left, 0, right, strip.height))
            bbox = cell.getchannel("A").getbbox()
            if bbox is None:
                raise RuntimeError(f"Empty direction cell {path.name} column {col}")
            cells.append(cell)
            bboxes.append(bbox)
        raw_rows.append(cells)

    max_w = max(right - left for left, _, right, _ in bboxes)
    max_h = max(bottom - top for _, top, _, bottom in bboxes)
    scale = min((CELL_W - 18) / max_w, (CELL_H - 10) / max_h)
    normalized: list[list[Image.Image]] = []
    details: list[dict] = []
    bbox_index = 0
    for cells in raw_rows:
        out: list[Image.Image] = []
        for cell in cells:
            left, top, right, bottom = bboxes[bbox_index]
            bbox_index += 1
            crop = cell.crop((left, top, right, bottom))
            width, height = round(crop.width * scale), round(crop.height * scale)
            resized = crop.resize((width, height), Image.Resampling.LANCZOS)
            target = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
            x = (CELL_W - width) // 2
            y = CELL_H - 6 - height
            target.alpha_composite(resized, (x, y))
            out.append(target)
            details.append({"sourceBbox": [left, top, right, bottom], "placed": [x, y, width, height]})
        normalized.append(out)
    return normalized, {"sharedScale": round(scale, 6), "maxSource": [max_w, max_h], "frames": details}


def contact_sheet(atlas: Image.Image, output: Path) -> None:
    gap, label_h = 8, 18
    rows = BASE_ROWS + 2
    canvas = Image.new("RGBA", (COLS * CELL_W + (COLS + 1) * gap, rows * (CELL_H + label_h) + (rows + 1) * gap), (24, 28, 36, 255))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    for row in range(rows):
        for col in range(COLS):
            x, y = gap + col * (CELL_W + gap), gap + row * (CELL_H + label_h + gap)
            for yy in range(0, CELL_H, 16):
                for xx in range(0, CELL_W, 16):
                    shade = 40 if ((xx // 16) + (yy // 16)) % 2 == 0 else 52
                    draw.rectangle((x + xx, y + yy, x + xx + 15, y + yy + 15), fill=(shade, shade, shade, 255))
            canvas.alpha_composite(atlas.crop((col * CELL_W, row * CELL_H, (col + 1) * CELL_W, (row + 1) * CELL_H)), (x, y))
            label = f"r{row}c{col}" if row < BASE_ROWS else f"look {DIRECTIONS[row - BASE_ROWS][col]}"
            draw.text((x + 4, y + CELL_H + 2), label, fill=(220, 220, 220, 255), font=font)
    canvas.convert("RGB").save(output, "PNG")


def write_config() -> None:
    states = {
        "idle": {"row": 0, "frames": 8, "fps": 5, "loop": True},
        "working": {"row": 7, "frames": 8, "fps": 8, "loop": True},
        "running": {"row": 7, "frames": 8, "fps": 8, "loop": True},
        "running_left": {"row": 2, "frames": 8, "fps": 10, "loop": True},
        "running_right": {"row": 1, "frames": 8, "fps": 9, "loop": True},
        "drag_left": {"row": 2, "frames": 8, "fps": 11, "loop": True},
        "drag_right": {"row": 1, "frames": 8, "fps": 11, "loop": True},
        "waving": {"row": 3, "frames": 8, "fps": 6, "loop": False},
        "jumping": {"row": 4, "frames": 8, "fps": 10, "loop": False},
        "failed": {"row": 5, "frames": 8, "fps": 6, "loop": False},
        "waiting": {"row": 8, "frames": 8, "fps": 4, "loop": True},
        "review": {"row": 7, "frames": 8, "fps": 5, "loop": True},
        "reading": {"row": 8, "frames": 8, "fps": 5, "loop": True},
        "sitting": {"row": 6, "col": 0, "frames": 2, "fps": 2, "loop": True, "scale": 0.9},
    }
    for row, directions in enumerate(DIRECTIONS, start=9):
        for col, degree in enumerate(directions):
            states[f"look_{degree.replace('.', '_')}"] = {"row": row, "col": col, "frames": 1, "fps": 1, "loop": True}
    config = {
        "_comment": "Test-only female v2 configuration. The production preset is updated only after visual QA.",
        "spritesheet": "staging/female-v2/final/spritesheet.webp",
        "cell": {"width": CELL_W, "height": CELL_H},
        "sheet": {"cols": COLS, "rows": BASE_ROWS + 2},
        "scale": 0.72,
        "spriteVersionNumber": 2,
        "lookDirections": {"enabled": True, "deadzonePx": 20, "phases": ["idle", "running", "paused", "finished"]},
        "states": states,
    }
    (STAGING / "pet-v2.test.config.json").write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    FINAL.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    standard = source_rows()
    looks, metadata = direction_cells()
    atlas = Image.new("RGBA", (CELL_W * COLS, CELL_H * (BASE_ROWS + 2)), (0, 0, 0, 0))
    for index, cell in enumerate(standard):
        atlas.alpha_composite(cell, ((index % COLS) * CELL_W, (index // COLS) * CELL_H))
    for row, cells in enumerate(looks, start=BASE_ROWS):
        for col, cell in enumerate(cells):
            atlas.alpha_composite(cell, (col * CELL_W, row * CELL_H))

    png, webp = FINAL / "spritesheet.png", FINAL / "spritesheet.webp"
    atlas.save(png, "PNG")
    atlas.save(webp, "WEBP", quality=95, method=6)
    contact_sheet(atlas, QA / "contact-sheet.png")
    write_config()
    report = {
        "status": "assembled-awaiting-review",
        "source": {"path": str(SOURCE.relative_to(STAGING)), "sha256": sha256(SOURCE), "size": list(Image.open(SOURCE).size)},
        "lookSources": [{"path": str(path.relative_to(STAGING)), "sha256": sha256(path), "size": list(Image.open(path).size)} for path in LOOK_SOURCES],
        "target": {"width": CELL_W * COLS, "height": CELL_H * (BASE_ROWS + 2), "cell": [CELL_W, CELL_H], "sheet": [COLS, BASE_ROWS + 2]},
        "directionRegistration": metadata,
        "output": {"webp": "final/spritesheet.webp", "sha256": sha256(webp), "contactSheet": "qa/contact-sheet.png"},
    }
    (QA / "assembly-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Female v2 assembly complete: {webp}")


if __name__ == "__main__":
    main()
