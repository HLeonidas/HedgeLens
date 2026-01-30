import { navItems } from "./nav";
import { SidebarItem } from "./SidebarItem";

type SidebarProps = {
  onNavClick?: () => void;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

function getInitials(name?: string | null, email?: string | null) {
  const source = name || email || "";
  if (!source) return "??";
  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function Sidebar({ onNavClick, user }: SidebarProps) {
  return (
    <aside className="w-full border-b lg:border-b-0 lg:border-r border-border-light flex flex-col bg-surface-grey z-20 shrink-0 lg:w-64 lg:h-screen min-h-0">
      <div className="p-4 sm:p-6 border-b border-border-light">
        <div className="flex items-center gap-3 text-accent">
          <div className="size-9 bg-accent/10 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-xl text-accent">analytics</span>
          </div>
          <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">
            HedgeLens
          </h2>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-2 custom-scrollbar min-h-0">
        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 px-3">
          Main Navigation
        </div>
        {navItems.map((item) => (
          <SidebarItem key={item.href} item={item} onClick={onNavClick} />
        ))}

        <div className="mt-6 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 px-3">
          Selected ISINs
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-l-4 border-l-curve-a border-border-light shadow-sm">
            <span className="text-xs font-mono text-slate-700">US88160R1014</span>
            <span className="material-symbols-outlined text-sm text-curve-a">
              check_circle
            </span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-l-4 border-l-curve-b border-border-light shadow-sm mt-1">
            <span className="text-xs font-mono text-slate-700">US0378331005</span>
            <span className="material-symbols-outlined text-sm text-curve-b">
              check_circle
            </span>
          </div>
        </div>
      </nav>

      <div className="p-4 sm:p-5 border-t border-border-light">
        <div className="flex items-center gap-3 mb-4">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name ?? "GitHub user"}
              className="size-10 rounded-full object-cover"
            />
          ) : (
            <div className="size-10 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
              {getInitials(user.name, user.email)}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900">
              {user.name ?? user.email ?? "GitHub User"}
            </span>
            <span className="text-xs text-slate-500">GitHub</span>
          </div>
        </div>
        <button className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white border border-border-light text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <span className="material-symbols-outlined text-sm">settings</span>
          Settings
        </button>
      </div>
    </aside>
  );
}
