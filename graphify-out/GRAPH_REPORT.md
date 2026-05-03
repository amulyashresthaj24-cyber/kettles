# Graph Report - .  (2026-05-02)

## Corpus Check
- 68 files · ~51,567 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 255 nodes · 229 edges · 25 communities detected
- Extraction: 86% EXTRACTED · 13% INFERRED · 2% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Entity Client|Entity Client]]
- [[_COMMUNITY_formatCurrency formatDate|formatCurrency formatDate]]
- [[_COMMUNITY_Monolith Timer|Monolith Timer]]
- [[_COMMUNITY_handler onKey|handler onKey]]
- [[_COMMUNITY_addDays dayLabel|addDays dayLabel]]
- [[_COMMUNITY_Supabase Backend|Supabase Backend]]
- [[_COMMUNITY_supabase edgeFunction|supabase edgeFunction]]
- [[_COMMUNITY_tsx AppShell|tsx AppShell]]
- [[_COMMUNITY_localStorage Zustand|localStorage Zustand]]
- [[_COMMUNITY_Kettles Brand|Kettles Brand]]
- [[_COMMUNITY_Kettles Logo|Kettles Logo]]
- [[_COMMUNITY_Icon Kettles|Icon Kettles]]
- [[_COMMUNITY_Session Confirmation|Session Confirmation]]
- [[_COMMUNITY_Indexes Pomodoros|Indexes Pomodoros]]
- [[_COMMUNITY_Sentry Integration|Sentry Integration]]
- [[_COMMUNITY_Row Level|Row Level]]
- [[_COMMUNITY_Edge Analytics|Edge Analytics]]
- [[_COMMUNITY_Typography Urbanist|Typography Urbanist]]
- [[_COMMUNITY_Blue Gradient|Blue Gradient]]
- [[_COMMUNITY_Motion System|Motion System]]
- [[_COMMUNITY_CSS Variable|CSS Variable]]
- [[_COMMUNITY_Core problem|Core problem]]
- [[_COMMUNITY_shadcn inspired|shadcn inspired]]
- [[_COMMUNITY_PostgreSQL Enums|PostgreSQL Enums]]
- [[_COMMUNITY_Computed Values|Computed Values]]

## God Nodes (most connected - your core abstractions)
1. `Supabase Backend Deployment` - 7 edges
2. `Relational Production Backend Schema` - 7 edges
3. `FlowMast` - 6 edges
4. `handleSubmit()` - 5 edges
5. `edgeFunction()` - 5 edges
6. `FlowMate` - 5 edges
7. `Kettles Long SVG Asset` - 5 edges
8. `Kettles Long Light SVG Asset` - 5 edges
9. `getSupabaseClient()` - 4 edges
10. `getSupabaseMisconfigurationMessage()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `No Database Backend Yet` --semantically_similar_to--> `Supabase Backend Deployment`  [AMBIGUOUS] [semantically similar]
  CODEBASE_OVERVIEW.md → DEPLOYMENT_GUIDE.md
- `FlowMast` --semantically_similar_to--> `newtime`  [AMBIGUOUS] [semantically similar]
  Docs/CLAUDE.md → README.md
- `JSONB Columns` --semantically_similar_to--> `PostgreSQL JSONB`  [INFERRED] [semantically similar]
  SUPABASE_MIGRATION_GUIDE.md → DEPLOYMENT_GUIDE.md
- `handleSubmit()` --calls--> `getFriendlySupabaseErrorMessage()`  [INFERRED]
  C:\Users\amuly\Documents\Work\Flowmate\src\app\auth\page.tsx → C:\Users\amuly\Documents\Work\Flowmate\src\lib\supabase.ts
- `onKey()` --calls--> `handleSubmit()`  [INFERRED]
  C:\Users\amuly\Documents\Work\Flowmate\src\components\AddProjectModal.tsx → C:\Users\amuly\Documents\Work\Flowmate\src\app\auth\page.tsx

## Hyperedges (group relationships)
- **Core Domain Entities** — codebase_overview_task_entity, codebase_overview_project_entity, codebase_overview_session_entity, codebase_overview_client_entity [EXTRACTED 1.00]
- **Supabase Backend Stack** — deployment_guide_supabase, deployment_guide_edge_functions, deployment_guide_postgresql_jsonb, deployment_guide_auth_provider, deployment_guide_store_supabase [EXTRACTED 1.00]
- **MVP Screen Flow** — screens_tasks_tab, screens_timer_tab, screens_session_complete, screens_report_tab [EXTRACTED 1.00]
- **Kettles Icon Visual Identity** — kettlesicon_asset, kettlesicon_kettle_icon, kettlesicon_blue_duotone_palette, kettlesicon_geometric_minimalism [INFERRED 0.88]
- **Kettles Brand Lockup** — kettleslong_asset, kettleslong_wordmark, kettleslong_geometric_logo, kettleslong_horizontal_lockup [EXTRACTED 0.96]
- **Kettles Color System** — kettleslong_asset, kettleslong_blue_palette, kettleslong_dark_navy_text [EXTRACTED 0.98]
- **Kettles Logo System** — kettleslongLight_asset, kettleslongLight_wordmark, kettleslongLight_icon_mark, kettleslongLight_blue_palette, kettleslongLight_horizontal_logo [EXTRACTED 0.95]
- **Light Theme Brand Application** — kettleslongLight_asset, kettleslongLight_horizontal_logo, kettleslongLight_light_theme_usage [INFERRED 0.81]

## Communities

### Community 0 - "Entity Client"
Cohesion: 0.09
Nodes (24): Client Entity, Project Entity, Session Entity, Task Entity, clients Table, data.json Migration Mapping, Database Indexes, projects Table (+16 more)

### Community 1 - "formatCurrency formatDate"
Cohesion: 0.12
Nodes (3): formatCurrency(), formatDuration(), handleExportPDF()

### Community 2 - "Monolith Timer"
Cohesion: 0.12
Nodes (17): design.md Reference, FlowMast, Monolith First, Pomodoro Timer, Monolith first chosen for full control and fast validation, Timer state should live in the database to preserve trust, Task-linked Time Tracking, Weekly Report (+9 more)

### Community 4 - "handler onKey"
Cohesion: 0.17
Nodes (4): onKey(), onKey(), onKey(), handleSubmit()

### Community 5 - "addDays dayLabel"
Cohesion: 0.23
Nodes (5): addDays(), dayLabel(), headerLabel(), isSameDay(), startOfWeek()

### Community 6 - "Supabase Backend"
Cohesion: 0.18
Nodes (12): No Database Backend Yet, AuthProvider, Supabase Edge Functions, migrate-data.ts, PostgreSQL JSONB, True full-stack application with Supabase backend, store-supabase, Supabase Backend Deployment (+4 more)

### Community 7 - "supabase edgeFunction"
Cohesion: 0.38
Nodes (8): edgeFunction(), getEdgeFunctionUrl(), getFriendlySupabaseErrorMessage(), getSupabaseClient(), getSupabaseEnv(), getSupabaseMisconfigurationMessage(), isHtmlResponse(), safeHost()

### Community 8 - "tsx AppShell"
Cohesion: 0.25
Nodes (3): AppShell(), useAuth(), AuthGuard()

### Community 10 - "localStorage Zustand"
Cohesion: 0.25
Nodes (8): Design System, FlowMate, localStorage Persistence, Next.js 14, Single Zustand Store with localStorage persistence, React 18, Tailwind CSS 3.4, Zustand

### Community 11 - "Kettles Brand"
Cohesion: 0.48
Nodes (7): Kettles Long SVG Asset, Blue Brand Palette, Dark Navy Typography, Geometric Kettle-Like Logo Mark, Horizontal Brand Lockup, Modern SaaS Branding Motif, Kettles Wordmark

### Community 12 - "Kettles Logo"
Cohesion: 0.67
Nodes (6): Kettles Long Light SVG Asset, Blue and White Brand Palette, Horizontal Logo Composition, Abstract Kettle/Icon Mark, Light Theme Logo Usage, Kettles Wordmark

### Community 16 - "Icon Kettles"
Cohesion: 0.5
Nodes (5): Kettles Icon SVG Asset, Blue Duotone Palette, Geometric Minimalist Motif, Stylized Kettle Icon, Kitchen Appliance Category Marker

### Community 21 - "Session Confirmation"
Cohesion: 0.67
Nodes (3): Session Confirmation Retry (Docs), Critical confirmation write protects the trust metric, Session Confirmation Retry

### Community 22 - "Indexes Pomodoros"
Cohesion: 0.67
Nodes (3): Pomodoros Composite Indexes (Docs), Pomodoros Composite Indexes, Indexes prevent painful refactor at 100+ users

### Community 23 - "Sentry Integration"
Cohesion: 0.67
Nodes (3): Sentry Integration (Docs), Sentry gives exact stack traces during validation week, Sentry Integration

### Community 38 - "Row Level"
Cohesion: 1.0
Nodes (2): Row Level Security, Supabase Entity Relationship

### Community 39 - "Edge Analytics"
Cohesion: 1.0
Nodes (2): Analytics Edge Function, Edge Functions chosen for business logic, analytics, aggregations, and validations

### Community 40 - "Typography Urbanist"
Cohesion: 1.0
Nodes (2): Urbanist Typography System, IBM Plex Mono Timer Typography

### Community 41 - "Blue Gradient"
Cohesion: 1.0
Nodes (2): Blue Gradient Card Treatment, Blue accent family chosen as the brand system; avoid orange/amber in UI

### Community 42 - "Motion System"
Cohesion: 1.0
Nodes (2): Motion System, Motion should be functional, not decorative

### Community 43 - "CSS Variable"
Cohesion: 1.0
Nodes (2): CSS Variable Token Reference, Figma MCP Workflow

### Community 44 - "Core problem"
Cohesion: 1.0
Nodes (2): Core problem is trusting whether logged time maps to real work, Trust Metric

### Community 57 - "shadcn inspired"
Cohesion: 1.0
Nodes (1): shadcn-inspired Patterns

### Community 58 - "PostgreSQL Enums"
Cohesion: 1.0
Nodes (1): PostgreSQL Enums

### Community 59 - "Computed Values"
Cohesion: 1.0
Nodes (1): Computed Values

## Ambiguous Edges - Review These
- `No Database Backend Yet` → `Supabase Backend Deployment`  [AMBIGUOUS]
  CODEBASE_OVERVIEW.md · relation: semantically_similar_to
- `newtime` → `FlowMast`  [AMBIGUOUS]
  Docs/CLAUDE.md · relation: semantically_similar_to
- `Urbanist Typography System` → `IBM Plex Mono Timer Typography`  [AMBIGUOUS]
  Docs/system.md · relation: semantically_similar_to
- `Tasks Tab` → `Top Navigation MVP`  [AMBIGUOUS]
  Docs/system.md · relation: conceptually_related_to

## Knowledge Gaps
- **58 isolated node(s):** `Next.js 14`, `React 18`, `Tailwind CSS 3.4`, `shadcn-inspired Patterns`, `localStorage Persistence` (+53 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Row Level`** (2 nodes): `Row Level Security`, `Supabase Entity Relationship`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Edge Analytics`** (2 nodes): `Analytics Edge Function`, `Edge Functions chosen for business logic, analytics, aggregations, and validations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Typography Urbanist`** (2 nodes): `Urbanist Typography System`, `IBM Plex Mono Timer Typography`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Blue Gradient`** (2 nodes): `Blue Gradient Card Treatment`, `Blue accent family chosen as the brand system; avoid orange/amber in UI`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Motion System`** (2 nodes): `Motion System`, `Motion should be functional, not decorative`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CSS Variable`** (2 nodes): `CSS Variable Token Reference`, `Figma MCP Workflow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Core problem`** (2 nodes): `Core problem is trusting whether logged time maps to real work`, `Trust Metric`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `shadcn inspired`** (1 nodes): `shadcn-inspired Patterns`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PostgreSQL Enums`** (1 nodes): `PostgreSQL Enums`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Computed Values`** (1 nodes): `Computed Values`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `No Database Backend Yet` and `Supabase Backend Deployment`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `newtime` and `FlowMast`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Urbanist Typography System` and `IBM Plex Mono Timer Typography`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Tasks Tab` and `Top Navigation MVP`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `handleSubmit()` connect `handler onKey` to `supabase edgeFunction`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `getSupabaseClient()` connect `supabase edgeFunction` to `index handleCors`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `getFriendlySupabaseErrorMessage()` connect `supabase edgeFunction` to `handler onKey`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._