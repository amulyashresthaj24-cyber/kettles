#!/usr/bin/env node
/** Cursor agent → agent-bridge. AGENT_NAME=cursor */
import { runHook } from "./hook.mjs";
runHook({ agent: "cursor" }).catch(() => process.exit(0));
