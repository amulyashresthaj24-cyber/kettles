# Gstack Integration

## Web Browsing
For all web browsing tasks, use the `/browse` skill from gstack. Never use `mcp__claude-in-chrome__*` tools.

## Available Gstack Skills

- `/office-hours` — YC Office Hours mode for founder/CEO guidance
- `/plan-ceo-review` — CEO/founder-mode plan review
- `/plan-eng-review` — Engineering manager-mode plan review
- `/plan-design-review` — Designer's eye plan review
- `/design-consultation` — Design consultation service
- `/design-shotgun` — Generate multiple design options
- `/design-html` — Design finalization and HTML generation
- `/review` — Pre-landing PR review
- `/ship` — Ship workflow: detect and merge batches
- `/land-and-deploy` — Land and deploy workflow
- `/canary` — Post-deploy canary monitoring
- `/benchmark` — Performance regression detection
- `/browse` — Fast headless browser for QA testing
- `/connect-chrome` — Connect to real Chrome instance
- `/qa` — Systematically QA test a web app
- `/qa-only` — Report-only QA testing
- `/design-review` — Designer's eye QA
- `/setup-browser-cookies` — Import cookies from Chrome
- `/setup-deploy` — Configure deployment settings
- `/setup-gbrain` — Set up gbrain for coding agent
- `/retro` — Weekly engineering retrospective
- `/investigate` — Systematic debugging with root cause analysis
- `/document-release` — Post-ship documentation update
- `/codex` — OpenAI Codex CLI wrapper
- `/cso` — Chief Security Officer mode
- `/autoplan` — Auto-review pipeline
- `/plan-devex-review` — Interactive developer experience review
- `/devex-review` — Live developer experience audit
- `/careful` — Safety guardrails for destructive commands
- `/freeze` — Restrict file edits to specific paths
- `/guard` — Full safety mode for destructive operations
- `/unfreeze` — Clear the freeze boundary
- `/gstack-upgrade` — Upgrade gstack to latest version
- `/learn` — Manage project learnings

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).
