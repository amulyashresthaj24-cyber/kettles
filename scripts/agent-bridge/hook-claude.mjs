#!/usr/bin/env node
/** Claude Code → agent-bridge. AGENT_NAME=claude-code */
import { runHook } from "./hook.mjs";
runHook({ agent: "claude-code" }).catch(() => process.exit(0));
