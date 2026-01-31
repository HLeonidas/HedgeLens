"use client";

import type { Route } from "next";
import Link from "next/link";

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

export function Sidebar({ onNavClick, user }: SidebarProps) {
	const watchlist = [
		{ isin: "US88160R1014" },
		{ isin: "US0378331005" },
	];

	return (
		<aside className="w-64 border-r border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hidden lg:flex flex-col sticky top-0 h-screen">
			<div className="p-6 flex items-center gap-3">
				<div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white">
					<span className="material-symbols-outlined text-sm">insights</span>
				</div>
				<span className="font-bold text-xl tracking-tight">HedgeLens</span>
			</div>

			<nav className="flex-1 px-4 space-y-6 overflow-y-auto pt-4">
				{navSections.map((section) => (
					<div key={section.id}>
						<p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-2">
							{section.label}
						</p>
						<ul className="space-y-1">
							{section.items.map((item) => (
								<li key={item.href}>
									<SidebarItem item={item} onClick={onNavClick} />
								</li>
							))}
						</ul>
					</div>
				))}

				<div>
					<div className="flex items-center justify-between px-2 mb-3">
						<p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
							Watchlist
						</p>
						<button className="text-[10px] text-primary font-bold hover:underline" type="button">
							VIEW ALL
						</button>
					</div>
					<ul className="space-y-2">
						{watchlist.map((item) => (
							<li
								key={item.isin}
								className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-border-light dark:border-border-dark flex justify-between items-center text-xs"
							>
								<span className="font-mono">{item.isin}</span>
								<span className="material-symbols-outlined text-xs opacity-50">refresh</span>
							</li>
						))}
					</ul>
				</div>
			</nav>

			<div className="p-4 border-t border-border-light dark:border-border-dark">
				<Link
					href={"/settings" as Route}
					onClick={onNavClick}
					className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
				>
					<span className="material-symbols-outlined text-base">settings</span> Settings
				</Link>
				<div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-border-light dark:border-border-dark">
					{user.image ? (
						<img
							src={user.image}
							alt={user.name ?? "GitHub user"}
							className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
						/>
					) : (
						<div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
							{getInitials(user.name, user.email)}
						</div>
					)}
					<div className="flex-1 min-w-0">
						<p className="text-xs font-semibold truncate">
							{user.name ?? user.email ?? "GitHub User"}
						</p>
						<p className="text-[10px] text-slate-500 truncate">GitHub User</p>
					</div>
					{/* <button className="text-slate-400 hover:text-primary transition-colors" type="button">
            <span className="material-symbols-outlined text-lg">dark_mode</span>
          </button> */}
				</div>
			</div>
		</aside>
	);
}
