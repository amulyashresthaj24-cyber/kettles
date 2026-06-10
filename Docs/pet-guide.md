# Flowmate Mascot System: Two Pet Modes Guide

Flowmate features a dual-mascot integration: **Desktop Pet Overlay (Tauri Window)** and **Inline Web App Mascot (Next.js Component)**. Both are configured under Settings, but they run in entirely different runtime contexts and offer different features.

---

## Mode 1: Desktop Pet Overlay (Tauri Window)
This is an independent, transparent, frameless, always-on-top overlay window driven by the Tauri backend and vanilla JS. It follows your cursor, reacts to your mouse inputs, and acts as a companion.

### 1. Active Mascot Presets
The overlay supports switching between two built-in mascot configurations based on user preferences in `localStorage` (`flowmate-supabase-session-store`):

#### A. Kettle Mascot (Default)
- **Spritesheet:** `assets/spritesheet.orig.webp`
- **Dimensions:** Cell: 192×208 px | Grid: 8 cols × 9 rows | Scale: `0.58`
- **Peculiarities:** Whistles and jumps around the desktop. Single click does nothing; double-click triggers a jump. Petting (holding down click) makes it sit down and triggers particle bursts (hearts/stars).

#### B. Companion Mascot (Sprite 2)
- **Spritesheet:** `assets/sprite-2.clean.webp` (Processed to transparent background and re-centered cells)
- **Dimensions:** Cell: 118×197 px | Grid: 8 cols × 9 rows | Scale: `0.76`
- **Peculiarities:** Chinese checker background cleaned to transparent. Single click blows a flying kiss (sends a `💋` emoji drifting upward and plays a hand-up wave pose). 

---

### 2. State Machine & Event Bindings
Triggers in the Flowmate app send events to the mascot window over the `pet://state` channel:

| Event/Trigger | Kettle / Sprite 2 State Mapped | Behavior Description |
| :--- | :--- | :--- |
| **Idle / Break** | `waiting` | Standing/moving in place at a lower FPS. |
| **Timer Running** | `review` / `working` | Sitting at a desk/laptop focusing or working. |
| **Finish Session** | `jumping` (celebration) | Jumps in the screen center + triggers a scale pop (`1.2x`). |
| **Abandon Timer** | `failed` | Surprised or disappointed idle state. |

---

### 3. Dynamic Micro-Interactions & Ambient Behaviors

- **Mouse Drag-and-Move:** When dragged, the pet plays walking animations (`drag_left` / `drag_right`) and mirrors direction (`scaleX`) based on dragging vector. When released, the window snaps to its new physical coordinates and returns to the phase's resting state.
- **Fast Hunting (Sprinting):** Moving the cursor faster than `3.0 px/ms` causes the mascot to trigger a `waving` state and flip horizontally to face the cursor.
- **Frantic Shake (Protest):** Shaking the mouse back and forth over the mascot (>= 4 direction reversals within 600ms) causes the pet to enter a `sitting` pose to "protest" and ignore further mouse movement for 2 seconds.
- **AFK Sleep doze:** If no cursor movements are registered for 5 minutes (and no timer is running), the mascot goes to sleep (`sitting` or `sleeping_afk`).
- **Scratchpad Note Integration:** Clicking the note toggle allows typing task notes directly from the pet overlay. The overlay captures keyboard focus (`setClickThrough(false)`) and dispatches the note back to Next.js via `pet://new-note`.
- **Scheduled Custom Reminders:** The mascot uses the speech bubble to announce user-scheduled reminder strings at precise time stamps (e.g. "Time to stretch!").

---

## Mode 2: Inline Web App Mascot (Next.js Component)
This is a lightweight inline element displayed in the `/timer` focus page, specifically inside the `<FinishOverlay>` component shown on session completion.

### 1. Implementation
- **Layout Location:** `src/app/timer/page.tsx`
- **Method:** Uses React state props to check the user's active mascot (`preferences.activeMascot`) and applies static CSS classes:
  - `"animate-pet-jump-kettle"` + `"scale-[0.55]"` or `"scale-[0.6]"`
  - `"animate-pet-jump-sprite2"` + `"scale-[0.75]"`

---

### 2. CSS Keyframe Animations
These animations are defined natively in `src/app/globals.css` and use hardcoded steps matching each spritesheet's celebration row:

#### A. Kettle Jump CSS
- **Spritesheet:** `/pet/assets/spritesheet.orig.webp`
- **Class:** `.animate-pet-jump-kettle`
- **Keyframes:** Shifts `background-position-x` from `0px` to `-1536px` over `1.2s` using `steps(8)` infinite loops. Starts at y-position `-624px` (Row 4).

#### B. Companion (Sprite 2) Jump CSS
- **Spritesheet:** `/pet/assets/sprite-2.clean.webp`
- **Class:** `.animate-pet-jump-sprite2`
- **Keyframes:** Shifts `background-position-x` from `0px` to `-944px` over `1.2s` using `steps(8)` infinite loops. Starts at y-position `-788px` (Row 4).
