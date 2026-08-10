#!/usr/bin/env node
/** OpenAI Codex CLI → agent-bridge. AGENT_NAME=codex */
import { runHook } from "./hook.mjs";
runHook({ agent: "codex" }).catch(() => process.exit(0));
