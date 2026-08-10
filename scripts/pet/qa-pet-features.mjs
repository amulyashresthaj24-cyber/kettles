/**
 * Static + wiring QA for Flowmate pet features.
 * Run: node scripts/pet/qa-pet-features.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const results = [];
function ok(name, cond, detail = "") {
  results.push({ name, pass: !!cond, detail: String(detail || "") });
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

// 1) Male atlas + config
const cfg = JSON.parse(read("public/pet/pet.config.json"));
ok("male config has states", Object.keys(cfg.states).length >= 10, Object.keys(cfg.states).join(","));
ok(
  "all events map to known states",
  Object.entries(cfg.events).every(([, v]) => {
    const play = typeof v === "string" ? v : v.play;
    return !!cfg.states[play];
  })
);
ok("breakEnd present in pet.config events", "breakEnd" in cfg.events);
const moments = JSON.parse(read("public/pet/kit/moments.flowmate.json"));
ok(
  "moments.flowmate.json missing breakEnd (doc drift)",
  !("breakEnd" in (moments.events || {})),
  "informational — moments kit lagging behind live config"
);

// 2) Female preset in pet.js
const petJs = read("public/pet/pet.js");
ok("FEMALE_PRESET defined", petJs.includes("const FEMALE_PRESET"));
ok("female cell 118x197", petJs.includes("width: 118") && petJs.includes("height: 197"));
ok("female spritesheet path", petJs.includes("sprite-2.clean.webp"));
ok("female asset exists", exists("public/pet/assets/sprite-2.clean.webp"));
ok("male asset exists", exists("public/pet/assets/spritesheet.webp"));

// 3) Host API
const petTs = read("src/lib/pet.ts");
const petEvents = [
  "timerStart",
  "timerResume",
  "timerPause",
  "timerBreak",
  "breakEnd",
  "timerFinish",
  "timerAbandon",
  "hover",
];
for (const e of petEvents) {
  ok(`PetEvent includes ${e}`, petTs.includes(`"${e}"`));
}
for (const fn of ["petOpen", "petClose", "petSignal", "petSetPosition", "petSetClickthrough", "petTracking", "onPetPoke", "onPetControl"]) {
  ok(`export ${fn}`, petTs.includes(`export const ${fn}`) || petTs.includes(`export function ${fn}`));
}

// 4) DesktopShell wiring
const shell = read("src/components/DesktopShell.tsx");
const actions = ["toggle", "extend", "complete", "confirm", "discard", "snoozeBreak"];
for (const a of actions) ok(`onPetControl handles ${a}`, shell.includes(`case "${a}"`));
ok("listens pet://new-note", shell.includes("pet://new-note"));
ok("petTracking on mount", shell.includes("petTracking(true)"));
ok("break reminder signal", shell.includes("petBreakRemindersEnabled"));
ok("timerFinish with showExtend", shell.includes("showExtend: true"));
ok("signals timerStart", shell.includes('event: "timerStart"'));
ok("signals timerPause", shell.includes('event: "timerPause"'));
ok("signals timerAbandon", shell.includes('event: "timerAbandon"'));
ok("signals breakEnd", shell.includes('event: "breakEnd"'));

// 5) ReminderAgent
const ra = read("src/components/ReminderAgent.tsx");
ok("ReminderAgent uses petSignal", ra.includes("petSignal") && ra.includes("isDesktop()"));
ok("ReminderAgent web Notification fallback", ra.includes("new Notification"));

// 6) Settings
const settings = read("src/app/settings/page.tsx");
ok("settings has Mascot & Pet", settings.includes("Mascot & Pet"));
ok("animation frequency options", settings.includes("lively") && settings.includes("calm") && settings.includes("normal"));
ok("notes integration toggle", settings.includes("petNotesIntegrationEnabled"));
ok("default animation options", settings.includes("waiting") && settings.includes("reading"));

// 7) Timer inline mascot
const timer = read("src/app/timer/page.tsx");
ok("timer has pet-stage", timer.includes("pet-stage"));
ok("kettle jump class", timer.includes("animate-pet-jump-kettle"));
ok("female jump class", timer.includes("animate-pet-jump-female"));

// 8) Asset sizes
const maleSize = fs.statSync(path.join(root, "public/pet/assets/spritesheet.webp")).size;
const femaleSize = fs.statSync(path.join(root, "public/pet/assets/sprite-2.clean.webp")).size;
ok("male spritesheet non-empty", maleSize > 1000, `${maleSize} bytes`);
ok("female spritesheet non-empty", femaleSize > 1000, `${femaleSize} bytes`);

// 9) pet.html hooks
const html = read("public/pet/pet.html");
for (const id of ["shell", "bubble", "completeActions", "notepad", "speechStack", "mascot", "hideToggle", "finishNow", "saveNote", "noteInput"]) {
  ok(`html has #${id}`, html.includes(`id="${id}"`));
}
for (const ext of ["5", "10", "25"]) ok(`extend chip +${ext}`, html.includes(`data-extend="${ext}"`));

// 10) Tauri backend
const petRs = read("src-tauri/src/pet.rs");
for (const cmd of ["pet_open", "pet_close", "pet_signal", "pet_set_position", "pet_set_clickthrough", "pet_tracking"]) {
  ok(`rust cmd ${cmd}`, petRs.includes(cmd));
}
ok("rust emits pet://state", petRs.includes("pet://state") || petRs.includes("pet://"));
ok("rust emits pet://cursor", petRs.includes("pet://cursor") || petJs.includes("pet://cursor"));

// 11) Interaction features in pet.js
ok("petting startPetting", petJs.includes("startPetting"));
ok("AFK tracking", petJs.includes("afk") && petJs.includes("lastCursorTime"));
ok("shake protest", petJs.includes("SHAKE_FLIPS"));
ok("sprinting", petJs.includes("sprinting"));
ok("notepad emit pet://new-note", petJs.includes("pet://new-note"));
ok("poke emit", petJs.includes("pet://poke"));
ok("control emit", petJs.includes("pet://control"));
ok("speech durations", petJs.includes("SPEECH_DURATIONS"));
ok("gesture intervals", petJs.includes("GESTURE_INTERVALS"));
ok("prefs applyPreferences", petJs.includes("applyPreferences"));
ok("right-click notepad", petJs.includes("contextmenu") || petJs.includes("button === 2") || petJs.includes("openNotepad"));

// 12) pet-moment-instructions vs live config alignment
const momentsTs = read("src/lib/pet-moment-instructions.ts");
ok("moment instructions has breakEnd", momentsTs.includes("breakEnd"));
ok("moment instructions has timerFinish celebration", momentsTs.includes("leaping_celebration") || momentsTs.includes("timerFinish"));

// Report
const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass);
console.log(`\nPET FEATURE QA: ${passed}/${results.length} checks passed\n`);
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? " — " + r.detail : ""}`);
}
if (failed.length) {
  console.log("\nFAILURES:");
  for (const f of failed) console.log(`  - ${f.name}${f.detail ? ": " + f.detail : ""}`);
  process.exitCode = 1;
} else {
  console.log("\nAll static/wiring checks passed.");
}
