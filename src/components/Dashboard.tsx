"use client";

import Sidebar from "./Sidebar";

const ICONS = {
  notepad: "https://www.figma.com/api/mcp/asset/9a3d6ae8-e746-41ad-a250-f2c18be9954f",
  calendar: "https://www.figma.com/api/mcp/asset/c9f2a39b-9921-442e-9134-9a4f16614c57",
  checkCircle: "https://www.figma.com/api/mcp/asset/f75bade7-bc05-40c1-97a2-3ea878432203",
  notepadCard: "https://www.figma.com/api/mcp/asset/6797428f-0246-48c4-9d0d-aed11acc9e96",
  plus: "https://www.figma.com/api/mcp/asset/44fd86b4-ce75-4501-8b18-eb883a4d4519",
  taskChecked: "https://www.figma.com/api/mcp/asset/a6cc0bcd-2982-49df-8f72-f8c074b0da7a",
  taskUnchecked: "https://www.figma.com/api/mcp/asset/ea67f328-a2d7-47c5-9130-77a401887d68",
  taskEmpty: "https://www.figma.com/api/mcp/asset/c7beeb3d-75a6-4bd4-b66b-fe1c25bcd024",
};

const NOTE_ITEMS = [
  { title: "Website Redesign", notebook: "Notebook", time: "3h ago" },
  { title: "Website Redesign", notebook: "Notebook", time: "3h ago" },
  { title: "Website Redesign", notebook: "Notebook", time: "3h ago" },
  { title: "Website Redesign", notebook: "Notebook", time: "3h ago" },
  { title: "Website Redesign", notebook: "Notebook", time: "3h ago" },
];

const NOTE_BULLETS = [
  "Create new custom icons",
  "Prep new style guide",
  "Update website logo",
  "Add new codebase modules",
];

const TASKS = [
  { id: 1, label: "Start style guide for website", source: "Website Redesign", done: true },
  { id: 2, label: "Start style guide for website", source: "Website Redesign", done: false },
  { id: 3, label: "Start style guide for website", source: "Website Redesign", done: false },
];

const TIME_SLOTS = ["8 am", "9 am", "10 am", "11 am", "Noon", "1 pm", "2 pm"];
const ACTIVE_TIME = "10 am";

function NoteCard({ title, notebook, time }: { title: string; notebook: string; time: string }) {
  return (
    <div className="shrink-0 w-[211px] h-[204px] bg-[#1e1e1e] rounded-tl-[16px] rounded-tr-[16px] flex flex-col gap-4 pt-4 px-4 pb-[18px] overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <img src={ICONS.notepadCard} alt="" className="w-4 h-4" />
          <span className="text-[12px] text-text-primary font-normal">{notebook}</span>
        </div>
        <span className="text-[12px] text-[#808080]">{time}</span>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2">
        <p className="text-[16px] font-medium text-text-primary tracking-[-0.01em]">{title}</p>
        <ul className="list-disc pl-[18px] text-[12px] text-[#b4b4b4] space-y-0.5">
          {NOTE_BULLETS.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <p className="text-[12px] text-[#b4b4b4] mt-1">
          Make sure that existing changes are saved to another file so nothing is lost in the process of moving over the portfolio from hosting with one provider to another
        </p>
      </div>

      {/* Fade overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-[#1e1e1e] to-transparent pointer-events-none" />
    </div>
  );
}

function NotesSection() {
  return (
    <section className="bg-[#0f1011] rounded-[16px] h-[262px] overflow-hidden flex flex-col gap-2.5 pt-[14px] px-5 relative">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-[18px] font-semibold text-text-primary tracking-[-0.01em]">Notes</h2>
        <div className="flex gap-3 text-[13px]">
          <button className="text-text-primary">Recents</button>
          <button className="text-[#808080] hover:text-text-secondary transition-colors">Suggested</button>
        </div>
      </div>

      {/* Horizontal cards scroll */}
      <div className="absolute left-5 top-[78px] flex gap-4 scrollbar-hide overflow-x-auto pb-2" style={{ width: "calc(100% - 40px)" }}>
        {NOTE_ITEMS.map((note, i) => (
          <NoteCard key={i} {...note} />
        ))}
      </div>
    </section>
  );
}

function CalendarSection() {
  return (
    <section className="bg-[#0f1011] rounded-[16px] h-[252px] overflow-hidden flex flex-col">
      {/* Header strip */}
      <div className="bg-[#171717] rounded-tl-[16px] rounded-tr-[16px] px-5 pt-[14px] pb-[11px] shrink-0">
        <div className="flex flex-col gap-[22px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-text-primary tracking-[-0.01em]">Calendar</h2>
            <div className="flex gap-3 text-[13px]">
              <button className="text-text-primary">Today</button>
              <button className="text-[#808080] hover:text-text-secondary transition-colors">Week</button>
              <button className="text-[#808080] hover:text-text-secondary transition-colors">Month</button>
            </div>
          </div>

          {/* Time slots */}
          <div className="flex items-center justify-between text-[13px] pr-4">
            {TIME_SLOTS.map((slot) => (
              <span
                key={slot}
                className={slot === ACTIVE_TIME ? "text-text-primary" : "text-[#808080]"}
              >
                {slot}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline grid */}
      <div className="relative flex-1">
        {/* Vertical dividers */}
        <div className="absolute inset-0 flex" style={{ paddingLeft: "143px" }}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="border-l border-[#2a2b2c]"
              style={{ flex: 1 }}
            />
          ))}
        </div>

        {/* Horizontal dividers */}
        <div className="absolute left-0 right-0" style={{ top: "55%", borderTop: "1px solid #2a2b2c" }} />
        <div className="absolute left-0 right-0" style={{ top: "25%", borderTop: "1px solid #2a2b2c" }} />

        {/* Event card */}
        <div
          className="absolute bg-[rgba(255,221,85,0.1)] rounded-[6px] p-1 flex gap-1.5"
          style={{ left: "342px", top: "17px", width: "152px", height: "132px" }}
        >
          <div className="w-[3px] h-full bg-[#ffdd55] rounded-full shrink-0" />
          <div className="flex flex-col gap-1.5 justify-center text-[#ffdd55]">
            <p className="text-[16px] font-semibold tracking-[-0.01em] leading-tight">Meeting with Jeremy</p>
            <p className="text-[12px] text-right tracking-[-0.01em]">10:00 AM</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TasksSection() {
  return (
    <section className="bg-[#0f1011] rounded-[16px] h-[298px] flex flex-col gap-6 pt-[14px] pb-6 px-5 shrink-0 w-[calc(50%-10px)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-text-primary tracking-[-0.01em]">Tasks</h2>
        <button className="flex items-center gap-0.5 text-[13px] text-text-primary hover:text-text-secondary transition-colors">
          <img src={ICONS.plus} alt="" className="w-4 h-4" />
          Add task
        </button>
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-3">
        {TASKS.map((task, i) => (
          <div key={task.id}>
            <div className="flex items-start gap-3">
              <img
                src={task.done ? ICONS.taskChecked : ICONS.taskUnchecked}
                alt={task.done ? "Done" : "Pending"}
                className="w-6 h-6 shrink-0"
              />
              <div className="flex flex-col gap-0.5">
                <p
                  className={`text-[16px] font-medium tracking-[-0.01em] leading-normal ${
                    task.done ? "line-through text-[#808080]" : "text-text-primary"
                  }`}
                >
                  {task.label}
                </p>
                <p className="text-[12px] text-[#808080]">
                  from: <span className="underline decoration-dotted">{task.source}</span>
                </p>
              </div>
            </div>
            {i < TASKS.length - 1 && (
              <div className="mt-3 h-px w-full bg-border-subtle" />
            )}
          </div>
        ))}

        {/* Add task placeholder */}
        <div className="flex items-center gap-3 mt-0">
          <img src={ICONS.taskEmpty} alt="" className="w-6 h-6 shrink-0 opacity-40" />
          <p className="text-[16px] font-medium text-[#515151]">Add task</p>
        </div>
      </div>
    </section>
  );
}

function ScratchPad() {
  return (
    <section className="bg-[#0f1011] rounded-[16px] h-[298px] flex flex-col pt-[14px] px-5 shrink-0 w-[calc(50%-10px)]">
      <h2 className="text-[18px] font-semibold text-text-primary tracking-[-0.01em]">Scratch Pad</h2>
    </section>
  );
}

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-base overflow-hidden">
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 bg-[#090909] border-l border-t border-border-subtle rounded-tl-[19px] overflow-y-auto">
        <div className="px-[60px] pt-8 pb-14">
          {/* Header */}
          <div className="flex items-center justify-between mb-[43px]">
            <div className="flex flex-col gap-2.5">
              <h1 className="text-[32px] font-semibold text-text-primary tracking-[-0.04em] leading-[1.1]">
                Good morning, Kole
              </h1>
              <p className="text-[15px] text-text-muted">Saturday, March 7</p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {[
                { icon: ICONS.notepad, label: "New Note" },
                { icon: ICONS.calendar, label: "New Event" },
                { icon: ICONS.checkCircle, label: "New Task" },
              ].map(({ icon, label }) => (
                <button
                  key={label}
                  className="flex items-center gap-2 bg-[#242424] hover:bg-[#2e2e2e] transition-colors px-3 py-1.5 rounded-full text-[13px] text-text-primary"
                >
                  <img src={icon} alt="" className="w-[18px] h-[18px]" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Content sections */}
          <div className="flex flex-col gap-5">
            <NotesSection />
            <CalendarSection />
            <div className="flex gap-5">
              <TasksSection />
              <ScratchPad />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
