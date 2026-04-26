"use client";

const ICONS = {
  caretUpDown: "https://www.figma.com/api/mcp/asset/8f907103-56c0-4ab2-85d2-848daea0d5fd",
  magnifyingGlass: "https://www.figma.com/api/mcp/asset/bead1b54-7d99-4255-a58f-1969e6b213b1",
  divider: "https://www.figma.com/api/mcp/asset/17106fde-df9e-417b-8a50-180508448f10",
  overview: "https://www.figma.com/api/mcp/asset/2f02b7dd-0191-4dd4-8aff-d581d602b201",
  notes: "https://www.figma.com/api/mcp/asset/ce21b8a3-0124-4ade-b1e1-37fbd24594d3",
  calendar: "https://www.figma.com/api/mcp/asset/2cfe8109-9dfc-4a19-b54d-fc13f307103f",
  tasks: "https://www.figma.com/api/mcp/asset/5878b286-fdc5-4a33-bb09-6eb67d2886e1",
  files: "https://www.figma.com/api/mcp/asset/b693d21b-cd2a-4b27-a420-5483959ffc6a",
  templates: "https://www.figma.com/api/mcp/asset/d4ae0574-9c55-461f-ad65-c605c587d6fb",
  notebook: "https://www.figma.com/api/mcp/asset/671b2e68-9b65-442d-a8ef-bd099106a042",
  tag: "https://www.figma.com/api/mcp/asset/1bbea446-4867-48c1-b9e3-6b382402db06",
  userCheck: "https://www.figma.com/api/mcp/asset/de8d095a-922f-4176-826c-00ec58676d9b",
  settings: "https://www.figma.com/api/mcp/asset/d58f8109-00fa-43d5-9955-2fcafb5a9cd8",
  headset: "https://www.figma.com/api/mcp/asset/03eaeeac-378c-4023-8e55-1f514167c8ac",
};

type NavItem = {
  icon: string;
  label: string;
  active?: boolean;
};

function NavLink({ icon, label, active }: NavItem) {
  return (
    <button
      className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded-[8px] transition-colors ${
        active
          ? "bg-[#1f1f1f] text-text-primary"
          : "text-text-muted hover:text-text-primary hover:bg-[#1a1a1a]"
      }`}
    >
      <img src={icon} alt="" className="w-[18px] h-[18px] shrink-0" />
      <span className="text-[13px] font-normal">{label}</span>
    </button>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-[204px] shrink-0 flex flex-col justify-between h-screen py-6 px-4 border-r border-border-subtle">
      {/* Top section */}
      <div className="flex flex-col gap-7">
        {/* User profile */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-[30px] h-[30px] bg-[#262626] rounded-[8px] flex items-center justify-center">
                <span className="text-[16px] font-bold text-text-primary leading-none">K</span>
              </div>
              <span className="absolute bottom-0 right-[-2px] w-[6px] h-[6px] bg-[#22c55e] rounded-full border border-base" />
            </div>
            <span className="text-[16px] font-semibold text-text-primary">Kole Jain</span>
          </div>
          <img src={ICONS.caretUpDown} alt="Switch workspace" className="w-5 h-5 opacity-60" />
        </div>

        {/* Search */}
        <div className="relative flex items-center">
          <img
            src={ICONS.magnifyingGlass}
            alt=""
            className="absolute left-[7px] w-[15px] h-[15px] opacity-60"
          />
          <div className="w-full h-[31px] bg-[#1f1f1f] border border-[#2e2e2e] rounded-[9px] flex items-center justify-between px-[7px] pl-[26px]">
            <span className="text-[13px] text-text-muted">Quick Search</span>
            <div className="flex items-center justify-center border border-[#444] rounded-[7px] px-[6px] py-[4px]">
              <span className="text-[10px] text-text-muted">⌘F</span>
            </div>
          </div>
        </div>

        {/* Primary nav */}
        <div className="flex flex-col gap-3">
          <NavLink icon={ICONS.overview} label="Overview" active />

          <div className="h-px w-full bg-border-subtle my-1" />

          <div className="flex flex-col gap-[18px] px-2">
            <NavLink icon={ICONS.notes} label="Notes" />
            <NavLink icon={ICONS.calendar} label="Calendar" />
            <NavLink icon={ICONS.tasks} label="Tasks" />
            <NavLink icon={ICONS.files} label="Files" />
            <NavLink icon={ICONS.templates} label="Templates" />
          </div>

          <div className="h-px w-full bg-border-subtle my-1" />

          <div className="flex flex-col gap-[18px] px-2">
            <NavLink icon={ICONS.notebook} label="Notebook" />
            <NavLink icon={ICONS.tag} label="Tags" />
            <NavLink icon={ICONS.userCheck} label="Shared with me" />
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex flex-col gap-5 px-2">
        <NavLink icon={ICONS.settings} label="Settings" />
        <NavLink icon={ICONS.headset} label="Help Center" />
      </div>
    </aside>
  );
}
