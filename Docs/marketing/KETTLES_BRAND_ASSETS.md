# Kettles — Brand & Marketing Asset Manifest

> What exists in the repo, where it lives, what it's for, and what's still missing for a marketing site. All real (verified in repo), not invented. Brand = **Kettles** (codebase = Flowmate).

---

## 1. Logos & marks (real, in `public/images/`)

| Asset | Path | viewBox | Colors | Use |
|-------|------|---------|--------|-----|
| **Icon mark** (kettle only) | `public/images/kettlesicon.svg` | `0 0 128.52 119.83` | body `#85c2ff`, spout `#3385ff` | favicon, app icon, nav mark, social avatar |
| **Wordmark — dark text** | `public/images/kettleslong.svg` | `0 0 384.43 119.83` | kettle `#85c2ff`/`#3385ff`, text `#081828` | use on **light** backgrounds |
| **Wordmark — light text** | `public/images/kettleslongLight.svg` | `0 0 384.43 119.83` | kettle `#85c2ff`/`#3385ff`, text `#fff` | use on **dark** backgrounds |

**Logo rule (from `BrandMark.tsx`):** pick by background, not by theme name —
- Dark section → `kettleslongLight.svg` (white text).
- Light section → `kettleslong.svg` (dark text).
- Mark is **always blue** on both. Never recolor it.

**Inline icon SVG** (paste directly — same geometry the app animates):
```svg
<svg viewBox="0 0 128.52 119.83" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Kettles">
  <rect fill="#85c2ff" x="40.28" y="8.04"  width="20.92" height="48.34" transform="translate(82.95 -18.53) rotate(90)"/>
  <rect fill="#85c2ff" x="40.28" y="49.87" width="20.92" height="48.34" transform="translate(124.78 23.31) rotate(90)"/>
  <rect fill="#85c2ff" x="43.95" y="67.12" width="13.57" height="48.34" transform="translate(142.03 40.56) rotate(90)"/>
  <polygon fill="#3385ff" points="26.93 63.59 53.62 42.67 101.96 42.67 101.96 63.59 26.93 63.59"/>
</svg>
```

---

## 2. Mascot / pet system (real, in `public/pet/`)

The kettle companion is a **sprite-driven desktop pet**, fully built.

| Asset | Path | Notes |
|-------|------|-------|
| Live spritesheet | `public/pet/assets/spritesheet.webp` | **8 cols × 9 rows**, cell **192×208 px**, scale 0.58 in app |
| Clean variant | `public/pet/assets/sprite-2.clean.webp` | alt cleaned atlas |
| Design source | `public/pet/assets/sprite-2 design.webp` | working file |
| Config (source of truth) | `public/pet/pet.config.json` | states, fps, event→state map |
| Row spec | `Docs/pet-kit/animation-rows.json` | per-row intent + "avoid" notes |
| Overlay runtime | `public/pet/pet.html` · `pet.css` · `pet.js` | standalone pet window |
| Build kit | `Docs/pet-kit/` | manifest, prompts, examples for regenerating the atlas |

**Animation states** (row → frames → fps): idle 0/6/5 · working 1/8/8 · running_left 2/8/10 · waving 3/4/6 · jumping 4/5/10 · failed 5/8/6 · waiting 6/6/4 · review 7/6/5 · running_right 8/6/9. (`sitting` derived from row 5 col 6.)

**Event map (real):** hover/click→waving · doubleClick→jumping · timerStart/Resume/Pause→review · timerBreak→waiting · timerFinish→jumping then waiting · timerAbandon→failed then waiting.

**For marketing:** the spritesheet can be played as a CSS `steps()` animation in a `<div>` with `background-position` (see `pet.js` for the exact stepping). Use **idle/working/waving** for the hero, **failed/sitting** for the "lost kettle" moment, **jumping** for the celebration/CTA.

### In-app animated kettle components (reusable React, blue, reduced-motion aware)
| Component | File | Use on marketing |
|-----------|------|------------------|
| `KettleAnimation` | `src/components/KettleAnimation.tsx` | hero / inline steaming kettle (float + breathe + 3 steam wisps) |
| `LostKettleAnimation` | `src/components/LostKettleAnimation.tsx` | companion "lost" state (tilt, "?", particles, glow) |
| `KettleLoader` | `src/components/KettleLoader.tsx` | loading state (KettleAnimation + status text) |

---

## 3. Sound (real, in `public/sounds/`)

| Asset | Path | License |
|-------|------|---------|
| Kettle whistle | `public/sounds/kettle-whistle.ogg` | **CC BY-SA 3.0**, author *Secretlondon*, from Wikimedia |

⚠️ **Licensing flags for marketing use:**
- **Attribution required** — credit "Secretlondon, CC BY-SA 3.0" wherever the sound ships (footer/credits).
- **ShareAlike** — derivatives of the *sound* must stay CC BY-SA. For a marketing site, keep audio **off by default / opt-in** (matches PRD) and add the credit. If you want zero license burden, swap for an original/royalty-free whistle before launch.

---

## 4. Platform icons (real, generated)

| Set | Path | Use |
|-----|------|-----|
| Chrome extension | `extension/assets/icon-16.png`, `icon-48.png`, `icon-128.png` | extension store + toolbar |
| Tauri desktop | `src-tauri/icons/` (`icon.ico`, `Square*Logo.png`, `StoreLogo.png`) | Windows app + MS Store |

These are derived from the kettle mark — reuse for download-page OS badges.

---

## 5. Color & type tokens (from product, reuse 1:1)

Full set in [`Docs/design.md`](../design.md) and `src/app/globals.css`. Marketing-critical:
- Accent `#0066ff` / hover `#3385ff` · kettle/steam `#85c2ff` · glow `rgba(51,133,255,0.2)`.
- Dark: base `#08090a`, surface `#0f1011`, raised `#191a1b`. Light section: `#FAFAFA`.
- Gradient panel: `linear-gradient(180deg,#05080d,#061733 58%,#072a63)`.
- Fonts: **Urbanist** (UI/headings), **Geist Mono** (timers/numbers).
- **Hard rule:** no orange/amber anywhere. Everything blue/neutral.

---

## 6. Design / build skills available (this environment)

Skills you can invoke (via the Skill tool / `/name`) to produce or refine marketing assets:

**Generate / design**
- `/banner-design` — social/ad/web-hero banners (multi art-direction, AI visuals).
- `/design` — logos, icons, social photos, CIP mockups, HTML slides, banners (big toolkit).
- `/frontend-design` — distinctive production-grade page/component code (anti-generic).
- `/high-end-visual-design` — "expensive agency" look rules (fonts, spacing, shadows).
- `/ui-ux-pro-max` — styles + palettes + font pairings + product patterns library.
- `/design-shotgun` — generate multiple landing variants + compare board.
- `/banner-design`, `/slides` — campaign + deck assets.

**Motion (for §5 effects in the PRD)**
- `/gsap-core`, `/gsap-scrolltrigger` (signature scroll-scrub kettle), `/gsap-timeline`, `/gsap-react`, `/gsap-performance`, `/animate`, `/interaction-design`.

**Figma bridge**
- `mcp__figma__*` + `/figma-generate-design`, `/figma-generate-library`, `/send` (push screens to Figma: `https://www.figma.com/design/aMGlYJx0AK6KnpXZmiux1P/Cyan_design`).

**Extract / audit / polish**
- `/extract-design` (pull a design system from any URL), `/design-review`, `/audit` (a11y/perf), `/polish`, `/optimize`, `/critique`, `/landing-report`.

**Copy**
- `/brand` (voice + messaging), `/clarify` (microcopy).

**Pencil** (`.pen` design files): `mcp__pencil__*` for in-editor design generation.

---

## 7. Gaps — what to create before launch

| Need | Status | Action |
|------|--------|--------|
| **Product screenshots** (mini-timer, Kanban, report, calendar, dashboard) | ❌ none in `public/` | Screenshot the real app at 1440px; export 2× webp. Hero + bento + ledger need these. |
| **OG / social card** (`og-image.png`, 1200×630) | ❌ missing | Build from mark + tagline; needed for link previews. |
| **Favicon set** (`favicon.ico`, `apple-touch-icon.png`, `icon-192/512`) | ⚠️ only source SVGs | Generate from `kettlesicon.svg`. |
| **Marketing kettle illustrations** (hero/CTA large states) | ⚠️ have sprite + components | Render large stills from spritesheet or scale `KettleAnimation`. |
| **Demo video / GIF** (scroll-scrub kettle, timer loop) | ❌ none | Record for PH/Show HN/social clips. |
| **Testimonial avatars** | ❌ none | Use initials-in-blue-circle until real ones. |
| **Original whistle** (optional) | ⚠️ current is CC BY-SA | Swap if avoiding ShareAlike/attribution. |
| **App store / download badges** | ⚠️ have OS icons | Compose Windows download badge for `/download`. |

---

## 8. Quick path

1. Reuse logos from `public/images/` + tokens from `Docs/design.md`.
2. Capture the 5 product screenshots (biggest gap).
3. Generate OG image + favicon set from `kettlesicon.svg` (use `/design` or `/banner-design`).
4. Build the page with the prompt in [`KETTLES_CLAUDE_DESIGN_PROMPT.md`](KETTLES_CLAUDE_DESIGN_PROMPT.md) (real icon SVG embedded).
5. Add motion via the `/gsap-*` skills (scroll-scrub kettle = `/gsap-scrolltrigger`).
6. Credit the whistle sound or swap it.
