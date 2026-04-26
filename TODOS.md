# TODOS

Items deferred from engineering review and design review of Flowmast AI design doc (2026-04-25).

---

## DB indexes on pomodoros table

**What:** Add composite indexes to the `pomodoros` table for the two hot-path queries.

**Why:** The weekly report (user_id + start_time) and concurrent session guard (task_id + status) both run on every page load and every timer start respectively. Indexes are free at this scale but prevent a painful refactor at 100+ users.

**Context:** Add in `db/schema.ts` during Week 2 (DB setup):
- `index('pomodoros_user_week_idx').on(pomodoros.userId, pomodoros.startTime)`
- `index('pomodoros_task_status_idx').on(pomodoros.taskId, pomodoros.status)`

**Depends on:** Drizzle ORM schema setup

---

## Session confirmation failure handling

**What:** Add retry mechanism on the PATCH /api/pomodoros/:id/complete endpoint.

**Why:** The confirmation write is the most critical action in the app — it's when "I worked for 25 minutes" becomes permanent. If this write fails silently, the user thinks time was logged when it wasn't. This directly breaks the "I believe this number" trust metric.

**Context:** On the Session Complete screen, if the PATCH fails, show a toast error: "Failed to log session — tap to retry." Keep session state in local storage / React state until server confirms 200. Do not navigate away until confirmed.

**Depends on:** Timer + session completion UI (Week 3)

---

## Add Sentry before validation week

**What:** Move Sentry error tracking to Week 4 (deploy week), not "later."

**Why:** The validation phase (Week 5: friend + 3 testers) is the highest-value feedback moment. Without Sentry, error visibility relies on testers reporting issues manually. With Sentry, you see exact stack traces from real usage.

**Context:** `npm install @sentry/nextjs`, follow the Next.js App Router guide. Set up on Railway/Render during the deploy week. Free tier is sufficient for 5-10 users.

**Depends on:** Railway/Render deployment setup (Week 5)

---

## Create DESIGN.md design system file

**What:** Extract the design specification from the design doc into a standalone DESIGN.md file at the project root.

**Why:** During UI implementation (Week 2-3), developers should be able to grep one file for color tokens, typography specs, and component rules — not hunt through a 400-line design doc.

**Context:** Copy the "Design Specification" section from `amuly-master-design-20260425.md` into `DESIGN.md`. Add CSS variable declarations. Future gstack design reviews (`/plan-design-review`, `/design-review`) will use DESIGN.md as the calibration reference.

**Depends on:** None — can be done at project setup (Week 2 start)
