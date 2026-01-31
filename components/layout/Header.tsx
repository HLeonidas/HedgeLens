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
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16 sm:h-[75px] bg-surface-light dark:bg-surface-dark border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3">
          <button
            className="lg:hidden inline-flex items-center justify-center size-9 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            type="button"
            aria-label="Toggle sidebar"
            onClick={onToggleSidebar}
          >
            <span className="material-symbols-outlined text-lg">menu</span>
          </button>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            {title}
          </h1>
        {subtitle ? (
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase">
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="material-symbols-outlined text-sm">sync_alt</span>
            {subtitle}
          </div>
        ) : null}
      </div>

      <div className="hidden sm:flex items-center gap-4 w-auto">
        <label className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md px-3 py-1.5 focus-within:ring-2 ring-primary/20 transition-all w-full sm:w-auto">
          <span className="material-symbols-outlined text-slate-400 text-xl">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-full sm:w-64 placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
            placeholder="Add comparison asset..."
            type="text"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="p-2 rounded-md border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined">download</span>
          </button>
          <button className="p-2 rounded-md bg-primary text-white hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20 px-4 flex items-center gap-2 w-full sm:w-auto justify-center">
            <span className="text-sm font-bold">New Analysis</span>
          </button>
        </div>
      </div>
    </header>
  );
}
