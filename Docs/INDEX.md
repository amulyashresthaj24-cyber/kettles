# Flowmate Documentation Index

Complete guide to all documentation files organized by purpose.

---

## 📋 Quick Navigation

### 🚀 Getting Started
- **[README.md](../README.md)** — Project overview and quick setup
- **[CODEBASE_OVERVIEW.md](CODEBASE_OVERVIEW.md)** — High-level architecture and tech stack
- **[CODEBASE_STRUCTURE.md](CODEBASE_STRUCTURE.md)** — Detailed folder structure and file organization
- **[folder-guide.md](Docs/folder-guide.md)** — Current active folders, future app/package direction, and AI prompt guide

### 🛠️ Development & Backend
- **[CLAUDE.md](CLAUDE.md)** — Development guide for FlowMast system
- **[SUPABASE_QUICKSTART.md](SUPABASE_QUICKSTART.md)** — Quick Supabase setup reference
- **[SUPABASE_MIGRATION_GUIDE.md](SUPABASE_MIGRATION_GUIDE.md)** — Complete JSON-to-Supabase migration walkthrough
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** — Production deployment steps

### 🎨 Design & UI
- **[design.md](design.md)** — Visual system, components, themes, and UX guidelines
- **[screens.md](screens.md)** — Screen layouts and user flows
- **[system.md](system.md)** — System requirements and specifications
- **[PROJECT_WORKSPACE_DESIGN.md](PROJECT_WORKSPACE_DESIGN.md)** — Project workspace implementation
- **[POLISH_UPDATE.md](POLISH_UPDATE.md)** — UI polish and refinements

### 📐 Architecture & Redesigns
- **[LAYOUT_ARCHITECTURE_V2.md](LAYOUT_ARCHITECTURE_V2.md)** — Layout architecture (v2)
- **[NAV_TASK_REDESIGN.md](NAV_TASK_REDESIGN.md)** — Navigation and task management redesign
- **[OVERVIEW_TAB_REDESIGN.md](OVERVIEW_TAB_REDESIGN.md)** — Overview tab improvements
- **[REDESIGN_SUMMARY.md](REDESIGN_SUMMARY.md)** — Project redesign summary (v2)

### 📚 Reference & Archive
- **[database.md](database.md)** — Database schema reference
- **[TODOS_ARCHIVE.md](TODOS_ARCHIVE.md)** — Archived tasks and deferred items

---

## 📁 File Organization

```
Docs/
├── INDEX.md                          # THIS FILE - Navigation guide
├── README.md                         # ← ROOT: Project overview
│
├── Getting Started (Start here!)
│   ├── CODEBASE_OVERVIEW.md
│   ├── CODEBASE_STRUCTURE.md
│   └── CLAUDE.md
│
├── Backend & Deployment
│   ├── SUPABASE_QUICKSTART.md
│   ├── SUPABASE_MIGRATION_GUIDE.md
│   ├── DEPLOYMENT_GUIDE.md
│   └── database.md
│
├── Design & UI
│   ├── design.md
│   ├── screens.md
│   ├── system.md
│   ├── POLISH_UPDATE.md
│   └── PROJECT_WORKSPACE_DESIGN.md
│
├── Architecture & Features
│   ├── LAYOUT_ARCHITECTURE_V2.md
│   ├── NAV_TASK_REDESIGN.md
│   ├── OVERVIEW_TAB_REDESIGN.md
│   └── REDESIGN_SUMMARY.md
│
└── Archive
    └── TODOS_ARCHIVE.md
```

---

## 🎯 By Use Case

### **I want to understand the project**
1. Start: [README.md](../README.md) (root)
2. Read: [CODEBASE_OVERVIEW.md](CODEBASE_OVERVIEW.md)
3. Deep dive: [CODEBASE_STRUCTURE.md](CODEBASE_STRUCTURE.md)

### **I need to set up the backend**
1. Quick start: [SUPABASE_QUICKSTART.md](SUPABASE_QUICKSTART.md)
2. Full migration: [SUPABASE_MIGRATION_GUIDE.md](SUPABASE_MIGRATION_GUIDE.md)
3. Deploy: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

### **I'm building UI components**
1. Reference: [design.md](design.md)
2. See layouts: [screens.md](screens.md)
3. Check system: [system.md](system.md)

### **I want to understand the architecture**
1. Overview: [CODEBASE_OVERVIEW.md](CODEBASE_OVERVIEW.md)
2. Layout: [LAYOUT_ARCHITECTURE_V2.md](LAYOUT_ARCHITECTURE_V2.md)
3. Features: [REDESIGN_SUMMARY.md](REDESIGN_SUMMARY.md)

### **I'm reviewing changes**
1. Check latest: [REDESIGN_SUMMARY.md](REDESIGN_SUMMARY.md)
2. Polish notes: [POLISH_UPDATE.md](POLISH_UPDATE.md)
3. Workspace design: [PROJECT_WORKSPACE_DESIGN.md](PROJECT_WORKSPACE_DESIGN.md)

---

## 📊 File Descriptions

| File | Purpose | Audience | Last Updated |
|------|---------|----------|--------------|
| **CODEBASE_OVERVIEW.md** | Tech stack, cleanup notes, architecture | All | Latest |
| **CODEBASE_STRUCTURE.md** | Complete folder structure and navigation | Developers, AI | Latest |
| **CLAUDE.md** | FlowMast system overview and development guide | Developers | Active |
| **SUPABASE_QUICKSTART.md** | Quick Supabase reference | Backend Devs | Active |
| **SUPABASE_MIGRATION_GUIDE.md** | JSON-to-Supabase migration walkthrough | DevOps, Backend | Active |
| **DEPLOYMENT_GUIDE.md** | Production deployment steps | DevOps | Active |
| **design.md** | Visual system, components, themes | Designers, Frontend | Active |
| **screens.md** | Screen layouts and user flows | Designers, Product | Active |
| **system.md** | System requirements and specs | Technical Lead | Reference |
| **database.md** | Database schema reference | Backend, DevOps | Reference |
| **LAYOUT_ARCHITECTURE_V2.md** | Layout architecture decisions | Frontend | Archive |
| **NAV_TASK_REDESIGN.md** | Navigation & task management redesign | Designers, Product | Archive |
| **OVERVIEW_TAB_REDESIGN.md** | Overview tab improvements | Designers | Archive |
| **POLISH_UPDATE.md** | UI polish and refinements | Frontend | Archive |
| **PROJECT_WORKSPACE_DESIGN.md** | Project workspace implementation | Frontend, Designers | Latest |
| **REDESIGN_SUMMARY.md** | Project redesign summary v2 | All | Archive |
| **TODOS_ARCHIVE.md** | Deferred tasks and old TODOs | Archive | Reference |

---

## 🔄 Documentation Workflow

### When Adding New Features
1. Update relevant design doc ([design.md](design.md), [screens.md](screens.md))
2. Create feature-specific doc in this folder
3. Update [CODEBASE_STRUCTURE.md](CODEBASE_STRUCTURE.md) if files/structure changes
4. Link new doc from this INDEX

### When Shipping Changes
1. Update [REDESIGN_SUMMARY.md](REDESIGN_SUMMARY.md) with what changed
2. Move old design docs to archive section
3. Create new feature docs if applicable

### When Deploying
1. Follow [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
2. Update [database.md](database.md) if schema changed
3. Document new environment variables in relevant guides

---

## 🚫 Deferred / Archive Items

Items that were planned but deferred are in:
- **[TODOS_ARCHIVE.md](TODOS_ARCHIVE.md)** — Old task list (for reference)

---

## 📝 Conventions

- **Bold filenames** = Current/Active docs
- *Italic filenames* = Archive/Reference only
- Docs in root folder (`../`) = High-level reference only
- Docs in `Docs/` = Implementation guides

---

## ✅ Checklist: Making This Useful

- [x] All .md files organized in one place
- [x] Clear navigation structure
- [x] Use-case based navigation
- [x] File descriptions and purposes
- [x] Archive section for old docs
- [x] Links from root README to Docs/
- [ ] (Coming) Auto-generated search index

---

## 🔗 Related Links

- **Repository:** [amulyashresthaj24-cyber/kettles](https://github.com/amulyashresthaj24-cyber/kettles)
- **Live Demo:** [Deployed version]
- **Figma:** [Design files]

---

**Last Updated:** 2026-05-03  
**Maintained by:** Development Team  
**Status:** ✅ Current
