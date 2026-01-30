"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "./nav";

type SidebarItemProps = {
  item: NavItem;
  onClick?: () => void;
};

export function SidebarItem({ item, onClick }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href as Route}
      onClick={onClick}
      className={[
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-200/50 transition-colors",
        isActive ? "bg-white shadow-sm border border-border-light text-accent" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="material-symbols-outlined text-xl">{item.icon}</span>
      <span className="text-sm font-semibold">{item.label}</span>
    </Link>
  );
}
