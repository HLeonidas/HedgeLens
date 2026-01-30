"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { navSections } from "./nav";
import { SidebarItem } from "./SidebarItem";

type SidebarProps = {
  onNavClick?: () => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  counts?: {
    projects?: number;
    scenariosRunning?: number;
  };
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

export function Sidebar({
  onNavClick,
  onToggleCollapse,
  isCollapsed,
  counts,
  user,
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsedSections, setCollapsedSections] = useState({
    analysis: false,
    portfolios: false,
  });

  const watchlist = [
    { isin: "US88160R1014" },
    { isin: "US0378331005" },
    { isin: "DE0005190003" },
  ];

  function getBadge(item: { badgeKey?: "projects" | "scenariosRunning" }) {
    if (!item.badgeKey) return null;
    if (item.badgeKey === "projects") {
      return counts?.projects ?? "—";
    }
    if (item.badgeKey === "scenariosRunning") {
      return counts?.scenariosRunning ?? "—";
    }
    return null;
  }

  function toggleSection(sectionId: "analysis" | "portfolios") {
    setCollapsedSections((value) => ({
      ...value,
      [sectionId]: !value[sectionId],
    }));
  }

  function isSectionActive(sectionItems: typeof navSections[number]["items"]) {
    return sectionItems.some((item) =>
      item.exact ? pathname === item.href : pathname.startsWith(item.href)
    );
  }

  return (
    <aside
      className={[
        "w-full border-b lg:border-b-0 lg:border-r border-border-light flex flex-col bg-surface-grey z-20 shrink-0 lg:h-screen min-h-0 transition-[width] duration-200",
        isCollapsed ? "lg:w-20" : "lg:w-64",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="px-4 sm:px-6 lg:px-6 py-4 border-b border-border-light h-[75px] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-accent">
          <div className="size-9 bg-accent/10 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-xl text-accent">analytics</span>
          </div>
          {isCollapsed ? null : (
            <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">
              HedgeLens
            </h2>
          )}
        </div>
        <button
          className="hidden lg:inline-flex items-center justify-center size-9 rounded-lg border border-border-light text-slate-600 hover:bg-white transition-colors"
          type="button"
          aria-label="Toggle sidebar"
          onClick={onToggleCollapse}
        >
          <span className="material-symbols-outlined text-lg">
            {isCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 custom-scrollbar min-h-0">
        {navSections.map((section) => {
          const isActive = isSectionActive(section.items);
          const isSectionCollapsed =
            section.collapsible &&
            collapsedSections[section.id as "analysis" | "portfolios"] &&
            !isActive;

          return (
            <div key={section.id} className="flex flex-col gap-2">
              <div
                className={[
                  "flex items-center justify-between px-3 text-xs font-bold uppercase tracking-wider",
                  isActive ? "text-accent" : "text-slate-400",
                  isCollapsed ? "justify-center px-0" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {isCollapsed ? (
                  <span className="material-symbols-outlined text-base">
                    {section.id === "main"
                      ? "home"
                      : section.id === "analysis"
                        ? "analytics"
                        : "inventory_2"}
                  </span>
                ) : (
                  <span>{section.label}</span>
                )}
                {!isCollapsed && section.collapsible ? (
                  <button
                    className="inline-flex items-center justify-center size-6 rounded-md text-slate-400 hover:text-slate-600 hover:bg-white"
                    type="button"
                    aria-label={`Toggle ${section.label}`}
                    onClick={() =>
                      toggleSection(section.id as "analysis" | "portfolios")
                    }
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isSectionCollapsed ? "expand_more" : "expand_less"}
                    </span>
                  </button>
                ) : null}
              </div>

              {isSectionCollapsed ? null : (
                <div className="flex flex-col gap-1">
                  {section.items.map((item) => (
                    <SidebarItem
                      key={item.href}
                      item={item}
                      onClick={onNavClick}
                      isCollapsed={isCollapsed}
                      badge={getBadge(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="mt-2 flex flex-col gap-2">
          <div
            className={[
              "flex items-center justify-between px-3 text-xs font-bold uppercase tracking-wider",
              "text-slate-400",
              isCollapsed ? "justify-center px-0" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {isCollapsed ? (
              <span className="material-symbols-outlined text-base">visibility</span>
            ) : (
              <span>Watchlist</span>
            )}
            {isCollapsed ? null : (
              <Link
                href={"/projects" as Route}
                className="text-[10px] font-semibold text-slate-400 hover:text-slate-600"
                onClick={onNavClick}
              >
                View all
              </Link>
            )}
          </div>
          {isCollapsed ? (
            <div className="flex items-center justify-center gap-1 rounded-lg border border-border-light bg-white py-2 text-xs font-semibold text-slate-500">
              {watchlist.length} items
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {watchlist.slice(0, 5).map((item) => (
                <div
                  key={item.isin}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-border-light"
                >
                  <span className="text-xs font-mono text-slate-700">{item.isin}</span>
                  <button
                    className="inline-flex items-center justify-center size-6 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    type="button"
                    aria-label={`Refresh price for ${item.isin}`}
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                  </button>
                </div>
              ))}
            </div>
          )}
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
          {isCollapsed ? null : (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900">
                {user.name ?? user.email ?? "GitHub User"}
              </span>
              <span className="text-xs text-slate-500">GitHub</span>
            </div>
          )}
        </div>
        <Link
          href={"/settings" as Route}
          className={[
            "w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white border border-border-light text-sm font-semibold text-slate-700 hover:bg-slate-50",
            isCollapsed ? "px-0" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="material-symbols-outlined text-sm">settings</span>
          {isCollapsed ? null : "Settings"}
        </Link>
      </div>
    </aside>
  );
}
