"""Clean a sprite sheet shipped on an opaque checker background.

Border flood-fill removes only background connected to the edges, so an
interior white costume (e.g. the female mascot's dress) is preserved while the
near-white checker is keyed to transparent. Output is a lossless transparent
webp on the original grid (no re-pack), used by the FEMALE_PRESET in pet.js.
"""

from collections import deque

import numpy as np
from PIL import Image

SRC = "public/pet/assets/sprite-update-female.png"
OUTS = [
    "public/pet/assets/sprite-female.clean.webp",
    "tauri-pet-overlay/frontend/assets/sprite-female.clean.webp",
]


def process():
    img = Image.open(SRC).convert("RGBA")
    a = np.array(img).astype(np.int16)
    H, W, _ = a.shape
    rgb = a[:, :, :3]

    # near-white, low-saturation pixels are candidate background
    mx = rgb.max(2)
    mn = rgb.min(2)
    whiteish = (mn >= 235) & ((mx - mn) <= 12)

    # flood fill the whiteish region inward from every border pixel
    bg = np.zeros((H, W), bool)
    dq = deque()
    for x in range(W):
        for y in (0, H - 1):
            if whiteish[y, x] and not bg[y, x]:
                bg[y, x] = True
                dq.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if whiteish[y, x] and not bg[y, x]:
                bg[y, x] = True
                dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and whiteish[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                dq.append((ny, nx))

    out = np.array(img)
    out[bg] = (0, 0, 0, 0)
    res = Image.fromarray(out)
    for p in OUTS:
        res.save(p, "WEBP", lossless=True, quality=100)
        print(f"Saved {p} ({W}x{H})")


if __name__ == "__main__":
    process()
