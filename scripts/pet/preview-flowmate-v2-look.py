from pathlib import Path

from PIL import Image

STAGING = Path(__file__).resolve().parents[2] / "public" / "pet" / "staging" / "flowmate-v2"
ATLAS = STAGING / "final" / "spritesheet.webp"
OUT = STAGING / "qa" / "look-direction-sweep.webp"
CELL_W, CELL_H = 192, 208
DIRS = [
    "000", "022.5", "045", "067.5", "090", "112.5", "135", "157.5",
    "180", "202.5", "225", "247.5", "270", "292.5", "315", "337.5",
]


def main() -> None:
    atlas = Image.open(ATLAS).convert("RGBA")
    frames = []
    for i, label in enumerate(DIRS):
        row = 9 if i < 8 else 10
        col = i % 8
        cell = atlas.crop((col * CELL_W, row * CELL_H, (col + 1) * CELL_W, (row + 1) * CELL_H))
        # Opaque preview plate so WebP animation stays readable.
        plate = Image.new("RGBA", (CELL_W, CELL_H), (32, 36, 44, 255))
        plate.alpha_composite(cell)
        frames.append(plate.convert("RGB"))

    frames[0].save(
        OUT,
        save_all=True,
        append_images=frames[1:],
        duration=180,
        loop=0,
        format="WEBP",
        quality=90,
    )
    print(f"Wrote {OUT} ({len(frames)} frames)")


if __name__ == "__main__":
    main()
