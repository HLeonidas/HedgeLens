"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { navItems } from "./nav";

// adjust import path to where your nav config lives

type AppShellProps = {
	children: React.ReactNode;
	user: {
		name?: string | null;
		email?: string | null;
		image?: string | null;
	};
};

export function AppShell({ children, user }: AppShellProps) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

	const pathname = usePathname();

	const activeNavItem = useMemo(() => {
		return navItems.find((item) =>
			item.exact ? pathname === item.href : pathname.startsWith(item.href)
		);
	}, [pathname]);

	const isUnderConstruction = !!activeNavItem?.isNotReleased;

	function toggleSidebar() {
		setIsSidebarOpen((value) => !value);
	}

	function closeSidebar() {
		setIsSidebarOpen(false);
	}

	function toggleSidebarCollapse() {
		setIsSidebarCollapsed((value) => !value);
	}

	return (
		<div className="relative flex min-h-screen lg:h-screen flex-col lg:flex-row overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
			<MobileNav
				isOpen={isSidebarOpen}
				onClose={closeSidebar}
				isCollapsed={isSidebarCollapsed}
			>
				<Sidebar
					onNavClick={closeSidebar}
					onToggleCollapse={toggleSidebarCollapse}
					isCollapsed={isSidebarCollapsed}
					user={user}
				/>
			</MobileNav>

			<main className="flex-1 flex flex-col min-h-0 bg-background-light dark:bg-background-dark overflow-hidden">
				<Header onToggleSidebar={toggleSidebar} />

				<div className="flex-1 overflow-y-auto">
					{/* IMPORTANT: make this relative so overlay only covers content - style 100vh-75px */}
					<div className="relative w-full mx-auto p-4 sm:p-6 lg:p-8" style={{ minHeight: "calc(100vh - 75px)" }}>
						{children}

						{isUnderConstruction && (
							<div className="absolute inset-0 z-30 flex items-center justify-center">
								{/* blur + dim content */}
								<div className="absolute inset-0 bg-slate-950/10 backdrop-blur-sm" />

								{/* card */}
								<div className="relative z-10 w-full max-w-md px-4">
									<div className="rounded-3xl border border-slate-200/70 bg-white shadow-2xl p-10 text-center">
										{/* icon tile */}
										<div className="mx-auto mb-6 relative w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg flex items-center justify-center">
											<span className="material-symbols-outlined text-[34px] text-white">
												construction
											</span>

											{/* small corner badge */}
											<div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-400 shadow flex items-center justify-center">
												<span className="material-symbols-outlined text-[16px] text-slate-900">
													bolt
												</span>
											</div>
										</div>

										{/* title */}
										<h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
											Enhancing your analysis tools
										</h3>

										{/* description */}
										<p className="mt-3 text-sm text-slate-500 leading-relaxed">
											The {activeNavItem?.label ?? "feature"} dashboard is currently being refined
											with advanced sentiment signals and historical depth.
										</p>
										{/* footer hint */}
										<div className="mt-4 text-[10px] font-bold tracking-[0.18em] text-slate-300">
											STAY UPDATED ON DEVELOPMENT PROGRESS
										</div>
									</div>
								</div>
							</div>
						)}

					</div>
				</div>
			</main>
		</div>
	);
}
