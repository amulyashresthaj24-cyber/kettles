# Kettles — Asset Pack (self-contained)

Real production assets copied from the app so this folder can be sent to Claude Design on its own. All blue/neutral — **no orange/amber anywhere** (hard brand rule).

## Contents

```
assets/
├─ tokens.css                  Design tokens (colors, motion, layout, type) — import or paste
├─ logos/
│  ├─ kettlesicon.svg          Kettle mark only (favicon, nav, avatar). Always blue.
│  ├─ kettleslong.svg          Wordmark, DARK text  → use on LIGHT backgrounds
│  └─ kettleslongLight.svg     Wordmark, WHITE text → use on DARK backgrounds
├─ mascot/
│  ├─ KettleAnimation.tsx      Steaming/floating kettle (hero) — React, reduced-motion aware
│  ├─ LostKettleAnimation.tsx  "Lost kettle" state (companion section / 404)
│  ├─ KettleLoader.tsx         Loader (KettleAnimation + status text)
│  ├─ spritesheet.webp         Desktop-pet atlas: 8 cols × 9 rows, 192×208 px cells
│  ├─ sprite-2.clean.webp      Alt cleaned atlas
│  ├─ pet.config.json          Pet states + event→state map (source of truth)
│  └─ animation-rows.json      Per-row intent + "avoid" notes
├─ brand/
│  └─ BrandMark.tsx            How the app picks the logo by background
└─ sound/
   ├─ kettle-whistle.ogg       Whistle SFX
   └─ ATTRIBUTION.md           ⚠️ CC BY-SA 3.0 — must credit; keep audio opt-in (or swap)
```

## Logo rule
Mark is **always blue** (`#85c2ff` body, `#3385ff` spout). Pick wordmark by background:
- Dark section → `kettleslongLight.svg` (white text)
- Light section → `kettleslong.svg` (dark text `#081828`)

## Mascot states (from `pet.config.json`)
idle · working · waving · jumping · failed · waiting · review · running · sitting.
Event map: hover/click→waving · doubleClick→jumping · timerStart/Pause→review · timerBreak→waiting · timerFinish→jumping→waiting · timerAbandon→failed→waiting.
Play the spritesheet as a CSS `steps()` background-position animation. For static hero/CTA art, scale `KettleAnimation.tsx` or render a still from a sprite cell.

## Colors (also in tokens.css)
accent `#0066ff` · hover `#3385ff` · kettle/steam `#85c2ff` · glow `rgba(51,133,255,0.2)` ·
base `#08090a` · surface `#0f1011` · raised `#191a1b` · light section `#FAFAFA` ·
gradient `linear-gradient(180deg,#05080d,#061733 58%,#072a63)`.
Fonts: **Urbanist** (UI/headings), **Geist Mono** (timers/numbers).

## Still missing (create before launch — see ../KETTLES_BRAND_ASSETS.md §7)
Product screenshots (mini-timer, Kanban, report, calendar), OG image (1200×630), favicon set, demo GIF, testimonial avatars.
