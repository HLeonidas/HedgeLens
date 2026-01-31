"use client";

import type Highcharts from "highcharts";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { HighchartsClient } from "@/components/charts/HighchartsClient";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import {
	AggregatedDashboard,
	DashboardResponse,
	MODEL_REFRESH_HOURS,
	ProjectHighlight,
} from "@/types/dashboard";

type NextAction = {
	title: string;
	description: string;
	badge: string;
	icon: string;
	tone: "default" | "warn" | "positive";
};

type DashboardSignal = {
	title: string;
	context: string;
	severity: "info" | "warn" | "alert";
	icon: string;
};

const accentPalette = [
	"bg-blue-500",
	"bg-emerald-500",
	"bg-amber-500",
	"bg-rose-500",
	"bg-indigo-500",
	"bg-sky-500",
];

function withMassiveProxy(url: string) {
	try {
		return `/api/massive/logo?url=${encodeURIComponent(url)}`;
	} catch {
		return url;
	}
}

const emptyAggregates: AggregatedDashboard = {
	totals: { projects: 0, positions: 0, marketValue: 0, intrinsicValue: 0, timeValue: 0 },
	ratio: { puts: 0, calls: 0, value: null },
	exposuresByCurrency: [],
	stalePriceProjects: [],
	missingPositionsProjects: [],
	ratioAlerts: [],
	depressedRatioAlerts: [],
	modelRefreshQueue: [],
	trendSeries: [],
	highlights: [],
	recentActivity: [],
};

export default function DashboardPage() {
	const [aggregated, setAggregated] = useState<AggregatedDashboard>(emptyAggregates);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [warning, setWarning] = useState<string | null>(null);
	const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
	const [preferredCurrency, setPreferredCurrency] = useState("EUR");
	const [showCreate, setShowCreate] = useState(false);

	const loadDashboard = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		setWarning(null);

		try {
			const response = await fetch("/api/dashboard", { cache: "no-store" });
			if (!response.ok) throw new Error("Unable to load dashboard analytics");

			const payload = (await response.json()) as DashboardResponse;
			setAggregated(payload.aggregated ?? emptyAggregates);
			setPreferredCurrency(payload.preferredCurrency ?? "EUR");
			setWarning(payload.warnings?.[0] ?? null);
			setLastRefreshedAt(payload.generatedAt ? new Date(payload.generatedAt) : new Date());
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unable to load dashboard data";
			setAggregated(emptyAggregates);
			setError(message);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadDashboard();
	}, [loadDashboard]);

	const hasProjects = aggregated.totals.projects > 0;
	const hasAnalytics = aggregated.totals.projects > 0;

	const baseCurrency = preferredCurrency;
	const hasTrend = aggregated.trendSeries.length > 1;
	const trendFirst = aggregated.trendSeries[0]?.[1] ?? 0;
	const trendLast = aggregated.trendSeries[aggregated.trendSeries.length - 1]?.[1] ?? 0;
	const trendDelta = hasTrend ? trendLast - trendFirst : 0;
	const trendDeltaPct = hasTrend && trendFirst !== 0 ? trendDelta / trendFirst : null;

	const chartOptions = useMemo<Highcharts.Options>(
		() => ({
			chart: {
				type: "areaspline",
				backgroundColor: "transparent",
				spacing: [16, 12, 16, 12],
			},
			title: { text: undefined },
			xAxis: {
				labels: { style: { color: "#94a3b8" } },
				lineColor: "#e2e8f0",
				minorGridLineWidth: 0,
				tickWidth: 0,
				title: { text: "Days", style: { color: "#94a3b8" } },
			},
			yAxis: {
				gridLineColor: "#e2e8f0",
				labels: { style: { color: "#94a3b8" } },
				title: { text: "Time value", style: { color: "#94a3b8" } },
			},
			legend: { enabled: false },
			credits: { enabled: false },
			tooltip: {
				shared: true,
				valueDecimals: 2,
				backgroundColor: "#0f172a",
				style: { color: "#fff" },
			},
			series: [
				{
					type: "areaspline",
					data: aggregated.trendSeries.map(([day, value]) => [day, Number(value.toFixed(2))]),
					color: "#0f172a",
					fillOpacity: 0.1,
					lineWidth: 2,
					name: "Time value",
				},
			],
		}),
		[aggregated.trendSeries]
	);

	const nextActions = useMemo<NextAction[]>(() => {
		const items: NextAction[] = [];

		if (aggregated.stalePriceProjects.length > 0) {
			items.push({
				title: "Refresh underlying prices",
				description: `${aggregated.stalePriceProjects.length} project${aggregated.stalePriceProjects.length === 1 ? "" : "s"
					} missing recent quotes`,
				badge: "Data",
				icon: "update",
				tone: "warn",
			});
		}

		if (aggregated.modelRefreshQueue.length > 0) {
			items.push({
				title: "Recompute model pricing",
				description: `${aggregated.modelRefreshQueue.length} position${aggregated.modelRefreshQueue.length === 1 ? "" : "s"
					} older than ${MODEL_REFRESH_HOURS}h`,
				badge: "Models",
				icon: "calculate",
				tone: "warn",
			});
		}

		const ratioAlertsCount = aggregated.ratioAlerts.length + aggregated.depressedRatioAlerts.length;
		if (ratioAlertsCount > 0) {
			items.push({
				title: "Review put/call ratios",
				description: `${ratioAlertsCount} strategy${ratioAlertsCount === 1 ? "" : "ies"} outside comfort range`,
				badge: "Signals",
				icon: "monitoring",
				tone: "warn",
			});
		}

		if (aggregated.missingPositionsProjects.length > 0) {
			items.push({
				title: "Add positions",
				description: `${aggregated.missingPositionsProjects.length} project${aggregated.missingPositionsProjects.length === 1 ? "" : "s"
					} have no exposure yet`,
				badge: "Setup",
				icon: "playlist_add",
				tone: "default",
			});
		}

		if (items.length === 0) {
			return [
				{
					title: "All caught up",
					description: "No pending tasks detected.",
					badge: "Clean",
					icon: "task_alt",
					tone: "positive",
				},
			];
		}

		return items.slice(0, 3);
	}, [aggregated]);

	const signals = useMemo<DashboardSignal[]>(() => {
		const items: DashboardSignal[] = [];

		aggregated.ratioAlerts.slice(0, 2).forEach((alert) => {
			items.push({
				title: `${alert.name} ratio ${formatRatio(alert.ratio)}`,
				context: "Put volume dominates",
				severity: "alert",
				icon: "warning",
			});
		});

		aggregated.depressedRatioAlerts.slice(0, 2).forEach((alert) => {
			items.push({
				title: `${alert.name} ratio ${formatRatio(alert.ratio)}`,
				context: "Calls outweigh puts",
				severity: "warn",
				icon: "flag",
			});
		});

		aggregated.stalePriceProjects.slice(0, 2).forEach((project) => {
			items.push({
				title: `${project.name} price stale`,
				context: project.ageDays !== null ? `${project.ageDays}d old quote` : "No quote yet",
				severity: "info",
				icon: "schedule",
			});
		});

		if (items.length === 0) {
			return [
				{
					title: "No alerts",
					context: "Ratios and data look balanced",
					severity: "info",
					icon: "check_circle",
				},
			];
		}

		return items;
	}, [aggregated]);

	return (
		<div className="h-full overflow-y-auto custom-scrollbar p-3 sm:p-6 lg:p-8">
			<div className="max-w-7xl mx-auto flex flex-col gap-6">
				{/* Header */}
				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h2 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h2>
							<p className="text-sm text-slate-500 mt-1">
								Overview of ratios, exposure, and model health across all projects.
							</p>
							<div className="text-xs text-slate-400 mt-1">
								{lastRefreshedAt
									? formatRelativeTime(lastRefreshedAt.toISOString(), {
											justNowLabel: "Updated just now",
											justNowThresholdSeconds: 90,
										})
									: "loading..."}
							</div>
						</div>

						<div className="flex items-center gap-2 flex-wrap">
							<button
								type="button"
								onClick={() => void loadDashboard()}
								disabled={isLoading}
								className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 disabled:opacity-60"
							>
								<span className="material-symbols-outlined text-base">refresh</span>
								{isLoading ? "Refreshing" : "Refresh"}
							</button>

							<Link
								href="/projects"
								className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300"
							>
								<span className="material-symbols-outlined text-base">folder</span>
								Projects
							</Link>

							<button
								type="button"
								onClick={() => setShowCreate(true)}
								className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
							>
								<span className="material-symbols-outlined text-base">add</span>
								Create Project
							</button>
						</div>
					</div>

					{/* Hint bar (Projects style) */}
					<div className="rounded-2xl border border-border-light bg-white shadow-sm p-4 flex flex-col gap-4">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-2 text-sm text-slate-500">
								<span className="material-symbols-outlined text-base">insights</span>
								<span className="font-semibold">
									Keep one project per underlying to unlock clean ratios and exposure charts.
								</span>
							</div>
							<div className="text-xs text-slate-400">
								{hasAnalytics
									? `${aggregated.totals.positions} positioned instrument${aggregated.totals.positions === 1 ? "" : "s"
									}`
									: "No positions synced yet"}
							</div>
						</div>
					</div>
				</div>

				{/* Errors */}
				{error ? (
					<div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
						{error}
					</div>
				) : null}

				{warning ? (
					<div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">
						{warning}
					</div>
				) : null}

				{/* Loading skeleton (no projects) */}
				{isLoading && !hasProjects ? (
					<div className="rounded-2xl border border-border-light bg-white shadow-sm p-6 animate-pulse">
						<div className="h-5 w-40 rounded bg-slate-100" />
						<div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
							{Array.from({ length: 3 }).map((_, index) => (
								<div key={index} className="p-4 rounded-xl border border-border-light bg-slate-50 space-y-3">
									<div className="h-3 w-24 rounded bg-slate-100" />
									<div className="h-5 w-20 rounded bg-slate-200" />
								</div>
							))}
						</div>
					</div>
				) : null}

				{/* Empty */}
				{!isLoading && !hasProjects ? (
					<div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-10 text-slate-600">
						<div className="mx-auto flex max-w-xl flex-col items-center text-center">
							<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 shadow-inner">
								<span className="material-symbols-outlined text-[28px]">dashboard</span>
							</div>
							<h3 className="mt-4 text-lg font-semibold text-slate-900">Your dashboard is empty</h3>
							<p className="mt-2 text-sm text-slate-500">
								Create a project with a few positions to unlock analytics, exposure breakdowns, and alerts.
							</p>
							<div className="mt-5 flex flex-col sm:flex-row items-center gap-2">
								<button
									type="button"
									onClick={() => setShowCreate(true)}
									className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
								>
									<span className="material-symbols-outlined text-base">add</span>
									Create Project
								</button>
								<Link
									href="/projects"
									className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300"
								>
									<span className="material-symbols-outlined text-base">folder</span>
									View Projects
								</Link>
							</div>
						</div>
					</div>
				) : null}

				{/* Main content */}
				{hasProjects && hasAnalytics ? (
					<div className="flex flex-col gap-6">
						{/* KPI row */}
						<div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
							<KpiCard label="Projects" value={formatNumber(aggregated.totals.projects)} subtitle="tracked underlyings" />
							<KpiCard label="Positions" value={formatNumber(aggregated.totals.positions)} subtitle="across all projects" />
							<KpiCard
								label="Market Value"
								value={formatCurrency(aggregated.totals.marketValue, baseCurrency)}
								subtitle={`converted to ${baseCurrency}`}
							/>
							<KpiCard
								label="Time Value"
								value={formatCurrency(aggregated.totals.timeValue, baseCurrency)}
								subtitle="model exposure"
							/>
							<KpiCard
								label="Avg. Put/Call"
								value={formatRatio(aggregated.ratio.value)}
								subtitle={`${formatNumber(aggregated.ratio.puts)} puts / ${formatNumber(aggregated.ratio.calls)} calls`}
							/>
						</div>

						<div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-6">
							{/* Left column */}
							<div className="flex flex-col gap-6">
								{/* Trend */}
								<div className="rounded-2xl border border-border-light bg-white shadow-sm p-6">
									<div className="flex items-center justify-between">
										<div>
											<h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Time Value Trend</h3>
											<p className="text-xs text-slate-400">Based on stored time-value curves</p>
										</div>
										<div className={`text-sm font-semibold ${trendDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
											{trendDelta >= 0 ? "+" : "-"}
											{formatCurrency(Math.abs(trendDelta), baseCurrency)}
											{trendDeltaPct !== null ? ` (${(Math.abs(trendDeltaPct) * 100).toFixed(1)}%)` : ""}
										</div>
									</div>

									<div className="mt-6">
										{aggregated.trendSeries.length > 0 ? (
											<HighchartsClient options={chartOptions} className="h-64 w-full" />
										) : (
											<div className="h-64 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-sm text-slate-500">
												Add positions with generated curves to visualize decay.
											</div>
										)}
									</div>
								</div>

								{/* Highlights */}
								<div className="rounded-2xl border border-border-light bg-white shadow-sm p-6">
									<div className="flex items-center justify-between">
										<h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Project Highlights</h3>
										<Link href="/projects" className="text-xs font-semibold text-slate-600 hover:underline">
											View all
										</Link>
									</div>

									<div className="mt-4 flex flex-col divide-y divide-border-light">
										{aggregated.highlights.slice(0, 5).map((highlight) => {
											const accent = getProjectAccent(highlight.id, highlight.color);
											const badge = getRiskBadge(highlight.riskProfile);
											const logoUrl = highlight.logoUrl?.trim() || null;
											return (
												<Link
													key={highlight.id}
													href={`/projects/${highlight.id}`}
													className="flex items-center justify-between gap-4 py-4 transition hover:bg-slate-50 px-2 rounded-lg"
												>
													<div className="flex items-center gap-3">
														<div
															className={`h-9 w-9 rounded-full overflow-hidden flex items-center justify-center ${logoUrl ? "" : accent.className ?? ""}`}
															style={logoUrl ? undefined : accent.style}
														>
															{logoUrl ? (
																<img
																	src={withMassiveProxy(logoUrl)}
																	alt={highlight.name}
																	className="h-full w-full object-contain"
																/>
															) : null}
														</div>
														<div>
															<div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
																{highlight.name}
																{highlight.underlyingSymbol ? (
																	<span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
																		{highlight.underlyingSymbol.replace(/\s+/g, "").slice(0, 10)}
																	</span>
																) : null}
															</div>
															<div className="text-xs text-slate-500 mt-1">
																{highlight.positions} position{highlight.positions === 1 ? "" : "s"} ·{" "}
																{highlight.lastPrice != null
																	? `Underlying ${formatCurrency(
																			highlight.lastPrice,
																			highlight.lastPriceCurrency ?? highlight.baseCurrency
																	  )}`
																	: "No underlying price"}
															</div>
														</div>
													</div>

													<div className="text-right flex flex-col items-end gap-1">
														<div className="text-sm font-semibold text-slate-900">
															{formatCurrency(highlight.marketValue, highlight.baseCurrency)}
														</div>
														<div className="text-xs text-slate-500">Ratio {formatRatio(highlight.ratio)}</div>
														<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.classes}`}>
															{badge.label}
														</span>
													</div>
												</Link>
											);
										})}
										{aggregated.highlights.length === 0 ? (
											<div className="text-sm text-slate-500 py-6 text-center">No positions with value summaries yet.</div>
										) : null}
									</div>
								</div>
							</div>

							{/* Right column */}
							<div className="flex flex-col gap-6">
								{/* Next Actions */}
								<div className="rounded-2xl border border-border-light bg-white shadow-sm p-6">
									<div className="flex items-center justify-between">
										<h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Next Actions</h3>
										<span className="text-xs text-slate-400">Auto-derived</span>
									</div>

									<div className="mt-4 flex flex-col gap-3">
										{nextActions.map((action, index) => (
											<div key={`${action.title}-${index}`} className="p-4 rounded-xl border border-border-light bg-slate-50">
												<div className="flex items-center gap-2 text-xs uppercase font-semibold tracking-wider text-slate-600">
													<span
														className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${action.tone === "positive"
																? "bg-emerald-100 text-emerald-700"
																: action.tone === "warn"
																	? "bg-amber-100 text-amber-700"
																	: "bg-slate-100 text-slate-500"
															}`}
													>
														<span className="material-symbols-outlined text-sm">{action.icon}</span>
													</span>
													<span>{action.badge}</span>
												</div>
												<div className="mt-2 text-sm font-bold text-slate-900">{action.title}</div>
												<p className="text-xs text-slate-500 mt-1">{action.description}</p>
											</div>
										))}
									</div>
								</div>

								{/* Exposure by currency */}
								<div className="rounded-2xl border border-border-light bg-white shadow-sm p-6">
									<h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Exposure by Currency</h3>

									<div className="mt-4 flex flex-col gap-3">
										{aggregated.exposuresByCurrency.length === 0 ? (
											<p className="text-sm text-slate-500">Add priced positions to see currency totals.</p>
										) : (
											aggregated.exposuresByCurrency.slice(0, 5).map((exposure) => {
												const maxValue = aggregated.exposuresByCurrency[0]?.value ?? 1;
												const width = Math.max(8, Math.round((exposure.value / maxValue) * 100));
												return (
													<div key={exposure.currency}>
														<div className="flex items-center justify-between text-sm font-semibold text-slate-700">
															<span>{exposure.currency}</span>
															<span>{formatCurrency(exposure.value, exposure.currency)}</span>
														</div>
														<div className="mt-2 h-2 rounded-full bg-slate-100">
															<div className="h-full rounded-full bg-slate-900" style={{ width: `${width}%` }} />
														</div>
													</div>
												);
											})
										)}
									</div>
								</div>

								{/* Signals + recent activity (FIXED CLOSING TAGS) */}
								<div className="rounded-2xl border border-border-light bg-white shadow-sm p-6">
									<h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Signals & Activity</h3>

									<div className="mt-4 flex flex-col gap-3">
										{signals.map((signal, index) => (
											<div
												key={`${signal.title}-${index}`}
												className="flex items-center justify-between rounded-xl border border-border-light px-4 py-3"
											>
												<div className="flex items-center gap-3">
													<span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${signalSeverityTone(signal.severity)}`}>
														<span className="material-symbols-outlined text-base">{signal.icon}</span>
													</span>
													<div>
														<div className="text-sm font-semibold text-slate-900">{signal.title}</div>
														<div className="text-xs text-slate-500">{signal.context}</div>
													</div>
												</div>
											</div>
										))}
									</div>

									<div className="mt-6 border-t border-border-light pt-4">
										<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Recent Activity</h4>
										<div className="mt-3 flex flex-col gap-3">
											{aggregated.recentActivity.slice(0, 5).map((activity) => (
												<div key={`${activity.id}-${activity.updatedAt}`} className="flex items-center justify-between text-sm">
													<div className="font-semibold text-slate-800">{activity.name}</div>
													<div className="text-xs text-slate-500">{formatRelativeTime(activity.updatedAt)}</div>
												</div>
											))}
											{aggregated.recentActivity.length === 0 ? (
												<p className="text-sm text-slate-500">No project changes recorded yet.</p>
											) : null}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				) : null}
			</div>

			<CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} />
		</div>
	);
}

function KpiCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
	return (
		<div className="rounded-2xl border border-border-light bg-white shadow-sm p-4">
			<div className="text-xs font-bold uppercase text-slate-500 tracking-wider">{label}</div>
			<div className="mt-2 text-3xl font-black text-slate-900">{value}</div>
			<p className="text-xs text-slate-500 mt-1">{subtitle}</p>
		</div>
	);
}

/** -------- helpers (missing in your snippet) -------- */

function formatNumber(value: number | null | undefined) {
	if (value == null || !Number.isFinite(value)) return "—";
	return new Intl.NumberFormat("de-DE").format(value);
}

function formatCurrency(value: number | null | undefined, currency: string) {
	if (value == null || !Number.isFinite(value)) return "—";
	// If currency code is invalid, fallback to number formatting
	try {
		return new Intl.NumberFormat("de-DE", {
			style: "currency",
			currency: currency || "EUR",
			maximumFractionDigits: 0,
		}).format(value);
	} catch {
		return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value)} ${currency}`;
	}
}

function formatRatio(value: number | null | undefined) {
	if (value == null || !Number.isFinite(value)) return "—";
	return value.toFixed(2);
}

function formatRelativeTime(
	iso: string,
	options?: { justNowLabel?: string; justNowThresholdSeconds?: number }
) {
	const stamp = Date.parse(iso);
	if (!Number.isFinite(stamp)) return "—";

	const diff = Date.now() - stamp;
	const sec = Math.round(diff / 1000);
	const justNowThreshold = options?.justNowThresholdSeconds ?? 60;
	if (sec <= justNowThreshold) return options?.justNowLabel ?? "Just now";
	const min = Math.round(sec / 60);
	if (min < 60) return `${min}m ago`;
	const h = Math.round(min / 60);
	if (h < 48) return `${h}h ago`;
	const d = Math.round(h / 24);
	return `${d}d ago`;
}

function getRiskBadge(profile: ProjectHighlight["riskProfile"]) {
	if (!profile) return { label: "Custom", classes: "bg-slate-100 text-slate-600" };
	if (profile === "conservative") return { label: "Conservative", classes: "bg-emerald-100 text-emerald-700" };
	if (profile === "balanced") return { label: "Balanced", classes: "bg-sky-100 text-sky-700" };
	return { label: "Aggressive", classes: "bg-rose-100 text-rose-700" };
}

function getProjectAccent(projectId: string, customColor?: string | null) {
	if (customColor && customColor.trim()) {
		return { style: { backgroundColor: customColor }, className: "" as string };
	}
	const idx = Math.abs(projectId.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0));
	return { className: accentPalette[idx % accentPalette.length], style: undefined as any };
}

function signalSeverityTone(severity: DashboardSignal["severity"]) {
	if (severity === "alert") return "bg-rose-100 text-rose-700";
	if (severity === "warn") return "bg-amber-100 text-amber-700";
	return "bg-slate-100 text-slate-600";
}
