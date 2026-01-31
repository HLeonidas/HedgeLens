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

export function SidebarItem({ item, onClick }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href as Route}
      onClick={onClick}
      className={[
        "flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold rounded-lg transition-colors",
        isActive
          ? "bg-slate-900 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={[
          "material-symbols-outlined text-lg",
          isActive ? "text-white" : "text-slate-400",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}
