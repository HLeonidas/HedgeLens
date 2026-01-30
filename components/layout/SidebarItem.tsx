"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "./nav";

type SidebarItemProps = {
  item: NavItem;
  onClick?: () => void;
  isCollapsed?: boolean;
  badge?: string | number | null;
};

export function SidebarItem({ item, onClick, isCollapsed, badge }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href as Route}
      onClick={onClick}
      title={isCollapsed ? item.label : undefined}
      className={[
        "relative group flex items-center gap-3 px-3 py-2.5 rounded-md text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
        isActive
          ? "bg-blue-50 text-primary dark:bg-blue-900/20 dark:text-blue-400"
          : "",
        isCollapsed ? "justify-center" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="material-symbols-outlined text-xl">{item.icon}</span>
      {isCollapsed ? null : <span className="text-sm font-semibold">{item.label}</span>}
      {isCollapsed ? (
        <span className="pointer-events-none absolute left-full top-1/2 z-20 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 ml-3">
          {item.label}
        </span>
      ) : null}
      {!isCollapsed && badge !== null && badge !== undefined ? (
        <span className="ml-auto rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
