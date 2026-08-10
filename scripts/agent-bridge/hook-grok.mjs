#!/usr/bin/env node
/** Grok / Grok Build CLI → agent-bridge. AGENT_NAME=grok */
import { runHook } from "./hook.mjs";
runHook({ agent: "grok" }).catch(() => process.exit(0));
