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
        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
        isActive ? "sidebar-item-active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={[
          "material-symbols-outlined text-lg",
          isActive ? "" : "opacity-70",
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
