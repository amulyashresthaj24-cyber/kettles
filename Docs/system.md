# Flowmast — Product Summary

Generated: 2026-04-25. Status: Shipped.

## Core Problem
Solo freelancers (2+ clients) can't trust logged time maps to real work. Result: underbilling, invisible distraction tax, broken self-trust.

## Wedge
Task-linked timer. Pick task → timer runs → time locks to task → weekly report shows hours per client.

## Defensibility
The ledger. Once it's the source of truth for income, it's sticky.

## Key Decisions (final)
- Monolith first (Next.js) — not microservices
- Supabase backend — not local PostgreSQL
- Desktop-only MVP — no mobile
- Top nav (Inbox + Report) — no sidebar
- Timer state persists to DB — survives tab close
- Session Complete = receipt, not celebration

## Design Tokens
```css
--color-bg: #FAFAFA;
--color-surface: #FFFFFF;
--color-text-primary: #111111;
--color-text-secondary: #666666;
--color-accent: #1A1A1A;
--color-success: #16A34A;
--color-destructive: #DC2626;
--color-border: #E5E5E5;
--client-color-1: #0D9488;
--client-color-2: #D97706;
--client-color-3: #BE185D;
--client-color-4: #4F46E5;
```

## Typography
- Timer: `IBM Plex Mono` 96px/128px weight 300
- UI: `Plus Jakarta Sans` / `Inter`

## Reviews cleared
- Eng review: CLEAR (7 issues fixed, 2 critical gaps addressed)
- Design review: CLEAR (score 3/10 → 8/10)
