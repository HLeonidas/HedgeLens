"use client";

import Link from "next/link";

export default function DashboardPage() {
	// Later: derive from API (e.g. /api/projects)
	const hasProjects = false;

	return (
		<div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
			<div className="max-w-7xl mx-auto flex flex-col gap-6">
				{/* Header (same feel as Projects) */}
				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h2 className="text-3xl font-black text-slate-900 tracking-tight">
								Dashboard
							</h2>
							<p className="text-sm text-slate-500 mt-1">
								Overview of your projects, ratios, and signals.
							</p>
						</div>

						<div className="flex items-center gap-2">
							<Link
								href="/projects"
								className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300"
							>
								<span className="material-symbols-outlined text-base">folder</span>
								Projects
							</Link>

							<Link
								href="/projects?create=1"
								className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
							>
								<span className="material-symbols-outlined text-base">add</span>
								Create Project
							</Link>
						</div>
					</div>

					{/* Optional: toolbar card (matching Projects filter card) */}
					<div className="rounded-2xl border border-border-light bg-white shadow-sm p-4 flex flex-col gap-4">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-2 text-sm text-slate-500">
								<span className="material-symbols-outlined text-base">insights</span>
								<span className="font-semibold">
									This page will become your analytics hub once projects contain positions.
								</span>
							</div>
							<div className="text-xs text-slate-400">
								Tip: One project per underlying or strategy.
							</div>
						</div>
					</div>
				</div>

				{/* Empty state (same style language as Projects empty state) */}
				{!hasProjects ? (
					<div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-10 text-slate-600">
						<div className="mx-auto flex max-w-xl flex-col items-center text-center">
							<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 shadow-inner">
								<span className="material-symbols-outlined text-[28px]">
									dashboard
								</span>
							</div>

							<h3 className="mt-4 text-lg font-semibold text-slate-900">
								Your dashboard is empty
							</h3>

							<p className="mt-2 text-sm text-slate-500">
								Create a project first. After that, the dashboard will show exposure,
								put/call ratio trends, and next actions based on your positions.
							</p>

							<div className="mt-5 flex flex-col sm:flex-row items-center gap-2">
								<Link
									href="/projects?create=1"
									className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
								>
									<span className="material-symbols-outlined text-base">add</span>
									Create Project
								</Link>

								<Link
									href="/projects"
									className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300"
								>
									<span className="material-symbols-outlined text-base">folder</span>
									View Projects
								</Link>
							</div>

							<div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
								<div className="p-4 rounded-xl border border-border-light bg-white">
									<div className="text-xs font-bold text-slate-400 uppercase">
										Step 1
									</div>
									<div className="mt-2 text-sm font-semibold text-slate-900">
										Create a project
									</div>
									<p className="mt-1 text-xs text-slate-500">
										Strategy container per underlying.
									</p>
								</div>
								<div className="p-4 rounded-xl border border-border-light bg-white">
									<div className="text-xs font-bold text-slate-400 uppercase">
										Step 2
									</div>
									<div className="mt-2 text-sm font-semibold text-slate-900">
										Add positions
									</div>
									<p className="mt-1 text-xs text-slate-500">
										ISINs / tickers + weights.
									</p>
								</div>
								<div className="p-4 rounded-xl border border-border-light bg-white">
									<div className="text-xs font-bold text-slate-400 uppercase">
										Step 3
									</div>
									<div className="mt-2 text-sm font-semibold text-slate-900">
										Track signals
									</div>
									<p className="mt-1 text-xs text-slate-500">
										Ratios, time value, risk score.
									</p>
								</div>
							</div>
						</div>
					</div>
				) : (
					<>
						{/* Content state (same card styles as Projects) */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Quick stats */}
							<div className="lg:col-span-2 rounded-2xl border border-border-light bg-white shadow-sm p-6">
								<div className="flex items-center justify-between">
									<h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
										Snapshot
									</h3>
									<span className="text-xs font-semibold text-slate-400">
										Last 24h
									</span>
								</div>

								<div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
									<div className="p-4 rounded-xl border border-border-light bg-slate-50">
										<span className="text-xs font-bold text-slate-400 uppercase">
											Projects
										</span>
										<div className="mt-3 text-2xl font-black text-slate-900">—</div>
										<div className="text-xs text-slate-500 font-semibold mt-1">
											tracked underlyings
										</div>
									</div>
									<div className="p-4 rounded-xl border border-border-light bg-slate-50">
										<span className="text-xs font-bold text-slate-400 uppercase">
											Positions
										</span>
										<div className="mt-3 text-2xl font-black text-slate-900">—</div>
										<div className="text-xs text-slate-500 font-semibold mt-1">
											across all projects
										</div>
									</div>
									<div className="p-4 rounded-xl border border-border-light bg-slate-50">
										<span className="text-xs font-bold text-slate-400 uppercase">
											Avg. Put/Call
										</span>
										<div className="mt-3 text-2xl font-black text-slate-900">—</div>
										<div className="text-xs text-slate-500 font-semibold mt-1">
											weighted ratio
										</div>
									</div>
								</div>
							</div>

							{/* Next actions */}
							<div className="rounded-2xl border border-border-light bg-white shadow-sm p-6">
								<h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
									Next Actions
								</h3>

								<div className="mt-4 flex flex-col gap-3">
									<div className="p-3 rounded-lg bg-slate-50 border border-border-light">
										<div className="flex items-center justify-between">
											<div className="text-sm font-bold text-slate-900">
												Refresh prices
											</div>
											<span className="text-xs text-slate-400">soon</span>
										</div>
										<p className="text-xs text-slate-500">
											Update last price data for your underlyings.
										</p>
									</div>

									<div className="p-3 rounded-lg bg-slate-50 border border-border-light">
										<div className="flex items-center justify-between">
											<div className="text-sm font-bold text-slate-900">
												Review ratios
											</div>
											<span className="text-xs text-slate-400">weekly</span>
										</div>
										<p className="text-xs text-slate-500">
											Identify projects with extreme put/call values.
										</p>
									</div>

									<div className="p-3 rounded-lg bg-slate-50 border border-border-light">
										<div className="flex items-center justify-between">
											<div className="text-sm font-bold text-slate-900">
												Run scenarios
											</div>
											<span className="text-xs text-slate-400">optional</span>
										</div>
										<p className="text-xs text-slate-500">
											Generate bear/base/bull outcomes.
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Trend card */}
						<div className="rounded-2xl border border-border-light bg-white shadow-sm p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
									Time Value Trend
								</h3>
								<span className="text-xs font-semibold text-slate-400">
									Last 90 days
								</span>
							</div>

							<div className="h-56 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-sm text-slate-400">
								Highcharts placeholder
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
