"use client";

import { usePathname } from "next/navigation";

import { getRouteMeta } from "./nav";

type HeaderProps = {
  onToggleSidebar?: () => void;
};

export function Header({ onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();
  const { title, subtitle } = getRouteMeta(pathname);

  return (
    <header className="flex flex-col gap-4 px-4 sm:px-6 lg:px-8 py-4 bg-white border-b border-border-light sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden inline-flex items-center justify-center size-9 rounded-lg border border-border-light text-slate-600 hover:bg-slate-50 transition-colors"
            type="button"
            aria-label="Toggle sidebar"
            onClick={onToggleSidebar}
          >
            <span className="material-symbols-outlined text-lg">menu</span>
          </button>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        </div>
        <div className="hidden sm:block h-6 w-px bg-slate-200"></div>
        {subtitle ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
              <span className="material-symbols-outlined text-sm">swap_horiz</span>
              {subtitle}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 w-full sm:w-auto">
        <label className="flex items-center bg-slate-50 border border-border-light rounded-lg px-3 py-1.5 focus-within:ring-2 ring-accent/20 transition-all w-full sm:w-auto">
          <span className="material-symbols-outlined text-slate-400 text-xl">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-full sm:w-64 placeholder:text-slate-400 text-slate-900"
            placeholder="Add comparison asset..."
            type="text"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="p-2 rounded-lg border border-border-light text-slate-500 hover:bg-slate-50 transition-colors">
            <span className="material-symbols-outlined">download</span>
          </button>
          <button className="p-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors shadow-sm px-4 flex items-center gap-2 w-full sm:w-auto justify-center">
            <span className="text-sm font-bold">New Analysis</span>
          </button>
        </div>
      </div>
    </header>
  );
}