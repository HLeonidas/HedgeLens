"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

type ExchangeRate = {
	from: string;
	to: string;
	rate: number;
	fetchedAt: string;
	source: "alpha_vantage" | "manual";
};

type RiskFreeRate = {
	region: "US" | "EU";
	rate: number;
	fetchedAt: string;
	source: "manual";
};

export default function SettingsPage() {
	const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
	const [theme, setTheme] = useState<"light" | "dark">("light");
	const [fxRate, setFxRate] = useState<ExchangeRate | null>(null);
	const [fxLoading, setFxLoading] = useState(false);
	const [fxError, setFxError] = useState<string | null>(null);
	const [manualRate, setManualRate] = useState<number | "">("");
	const [showManualFxModal, setShowManualFxModal] = useState(false);
	const [riskFreeRates, setRiskFreeRates] = useState<Record<string, RiskFreeRate>>({});
	const [riskFreeLoading, setRiskFreeLoading] = useState(false);
	const [riskFreeError, setRiskFreeError] = useState<string | null>(null);
	const [manualRiskFreeUs, setManualRiskFreeUs] = useState<number | "">("");
	const [manualRiskFreeEu, setManualRiskFreeEu] = useState<number | "">("");
	const [showRiskFreeModal, setShowRiskFreeModal] = useState<"US" | "EU" | null>(null);
	const [preferredCurrency, setPreferredCurrency] = useState("EUR");
	const [prefSaving, setPrefSaving] = useState(false);
	const [prefError, setPrefError] = useState<string | null>(null);
	const preferredCurrencyRef = useRef<HTMLSelectElement | null>(null);

	useEffect(() => {
		let ignore = false;
		async function loadMe() {
			try {
				const response = await fetch("/api/me");
				if (!response.ok) {
					setIsAdmin(false);
					return;
				}
				const data = (await response.json()) as {
					user?: { role?: string; preferred_currency?: string };
				};
				if (ignore) return;
				setIsAdmin(data.user?.role === "admin");
				if (data.user?.preferred_currency) {
					setPreferredCurrency(data.user.preferred_currency);
				}
			} catch {
				if (!ignore) setIsAdmin(false);
			}
		}

		void loadMe();
		return () => {
			ignore = true;
		};
	}, []);

	useEffect(() => {
		const stored = localStorage.getItem("theme");
		const initial = stored === "dark" || stored === "light" ? stored : "light";
		setTheme(initial);
		document.documentElement.classList.toggle("dark", initial === "dark");
		if (!stored) {
			localStorage.setItem("theme", initial);
		}
	}, []);

	useEffect(() => {
		let ignore = false;
		async function loadFx() {
			setFxLoading(true);
			setFxError(null);
			try {
				const response = await fetch("/api/exchange-rate?from=EUR&to=USD");
				const payload = (await response.json().catch(() => null)) as
					| { rate?: ExchangeRate; error?: string }
					| null;
				if (!response.ok || !payload?.rate) {
					throw new Error(payload?.error ?? "Failed to load FX rate");
				}
				if (!ignore) {
					setFxRate(payload.rate);
					setManualRate(payload.rate.rate);
				}
			} catch (err) {
				if (!ignore) setFxError(err instanceof Error ? err.message : "Failed to load FX rate");
			} finally {
				if (!ignore) setFxLoading(false);
			}
		}

		void loadFx();
		return () => {
			ignore = true;
		};
	}, []);

	useEffect(() => {
		let ignore = false;
		async function loadRiskFreeRates() {
			setRiskFreeLoading(true);
			setRiskFreeError(null);
			try {
				const [usResponse, euResponse] = await Promise.all([
					fetch("/api/risk-free-rate?region=US"),
					fetch("/api/risk-free-rate?region=EU"),
				]);
				const [usPayload, euPayload] = await Promise.all([
					usResponse.json().catch(() => null),
					euResponse.json().catch(() => null),
				]) as Array<{ rate?: RiskFreeRate; error?: string } | null>;

				if (!usResponse.ok || !usPayload?.rate) {
					throw new Error(usPayload?.error ?? "Failed to load US risk free rate");
				}
				if (!euResponse.ok || !euPayload?.rate) {
					throw new Error(euPayload?.error ?? "Failed to load EU risk free rate");
				}

				if (!ignore) {
					setRiskFreeRates({
						US: usPayload.rate,
						EU: euPayload.rate,
					});
					setManualRiskFreeUs(Number((usPayload.rate.rate * 100).toFixed(4)));
					setManualRiskFreeEu(Number((euPayload.rate.rate * 100).toFixed(4)));
				}
			} catch (err) {
				if (!ignore) {
					setRiskFreeError(
						err instanceof Error ? err.message : "Failed to load risk free rates"
					);
				}
			} finally {
				if (!ignore) setRiskFreeLoading(false);
			}
		}

		void loadRiskFreeRates();
		return () => {
			ignore = true;
		};
	}, []);

	function handleThemeChange(nextTheme: "light" | "dark") {
		setTheme(nextTheme);
		localStorage.setItem("theme", nextTheme);
		document.documentElement.classList.toggle("dark", nextTheme === "dark");
	}

	async function handleSaveRiskFreeRate(region: "US" | "EU") {
		const value = region === "US" ? manualRiskFreeUs : manualRiskFreeEu;
		if (value === "" || !Number.isFinite(Number(value))) {
			setRiskFreeError("Invalid risk free rate");
			return;
		}
		setRiskFreeLoading(true);
		setRiskFreeError(null);
		try {
			const response = await fetch("/api/risk-free-rate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					region,
					rate: Number(value) / 100,
				}),
			});
			const payload = (await response.json().catch(() => null)) as
				| { rate?: RiskFreeRate; error?: string }
				| null;
			if (!response.ok || !payload?.rate) {
				throw new Error(payload?.error ?? "Failed to update risk free rate");
			}
			const nextRate = payload.rate;
			setRiskFreeRates((prev) => ({ ...prev, [region]: nextRate }));
		} catch (err) {
			setRiskFreeError(
				err instanceof Error ? err.message : "Failed to update risk free rate"
			);
		} finally {
			setRiskFreeLoading(false);
		}
	}

	async function handlePreferredCurrencyChange(next: string) {
		setPreferredCurrency(next);
		setPrefSaving(true);
		setPrefError(null);
		try {
			const response = await fetch("/api/me", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ preferred_currency: next }),
			});
			const payload = (await response.json().catch(() => null)) as
				| { user?: { preferred_currency?: string }; error?: string }
				| null;
			if (!response.ok || !payload?.user) {
				throw new Error(payload?.error ?? "Failed to update currency");
			}
		} catch (err) {
			setPrefError(err instanceof Error ? err.message : "Failed to update currency");
		} finally {
			setPrefSaving(false);
		}
	}

	const currencySymbol = useMemo(() => {
		const map: Record<string, string> = {
			EUR: "€",
			USD: "$",
			GBP: "£",
			CHF: "CHF",
			JPY: "¥",
			AUD: "A$",
			CAD: "C$",
			SEK: "kr",
			NOK: "kr",
			DKK: "kr",
		};
		return map[preferredCurrency] ?? preferredCurrency;
	}, [preferredCurrency]);

	async function handleRefreshFx() {
		setFxLoading(true);
		setFxError(null);
		try {
			const response = await fetch("/api/exchange-rate?from=EUR&to=USD&force=1");
			const payload = (await response.json().catch(() => null)) as
				| { rate?: ExchangeRate; error?: string }
				| null;
			if (!response.ok || !payload?.rate) {
				throw new Error(payload?.error ?? "Failed to refresh FX rate");
			}
			setFxRate(payload.rate);
			setManualRate(payload.rate.rate);
		} catch (err) {
			setFxError(err instanceof Error ? err.message : "Failed to refresh FX rate");
		} finally {
			setFxLoading(false);
		}
	}

	async function handleManualFx() {
		if (manualRate === "" || !Number.isFinite(Number(manualRate))) {
			setFxError("Invalid rate");
			return;
		}
		setFxLoading(true);
		setFxError(null);
		try {
			const response = await fetch("/api/exchange-rate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ from: "EUR", to: "USD", rate: Number(manualRate) }),
			});
			const payload = (await response.json().catch(() => null)) as
				| { rate?: ExchangeRate; error?: string }
				| null;
			if (!response.ok || !payload?.rate) {
				throw new Error(payload?.error ?? "Failed to update FX rate");
			}
			setFxRate(payload.rate);
		} catch (err) {
			setFxError(err instanceof Error ? err.message : "Failed to update FX rate");
		} finally {
			setFxLoading(false);
		}
	}

	return (
		<div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
			<div className="mx-auto w-full max-w-6xl flex flex-col gap-5">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h2>
						<p className="text-sm text-slate-500 mt-1">
							Manage your account, team permissions, and active sessions.
						</p>
					</div>
				</div>

				<div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
					<div className="mb-4">
						<h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
							Appearance
						</h3>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<button
							type="button"
							onClick={() => handleThemeChange("light")}
							className={`rounded-2xl border p-4 text-left transition-all ${theme === "light"
									? "border-blue-500 ring-2 ring-blue-500/30 shadow-sm"
									: "border-border-light hover:border-slate-300"
								}`}
						>
							<div className="h-28 rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
								<div className="h-2 w-10 rounded-full bg-slate-200" />
								<div className="mt-3 h-10 rounded-lg bg-slate-100" />
								<div className="mt-2 h-6 rounded-lg bg-slate-50" />
							</div>
							<p className="mt-3 text-sm font-semibold text-slate-900">Light Mode</p>
						</button>
						<button
							type="button"
							onClick={() => handleThemeChange("dark")}
							className={`rounded-2xl border p-4 text-left transition-all ${theme === "dark"
									? "border-blue-500 ring-2 ring-blue-500/30 shadow-sm"
									: "border-border-light hover:border-slate-300"
								}`}
						>
							<div className="h-28 rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-inner">
								<div className="h-2 w-10 rounded-full bg-slate-700" />
								<div className="mt-3 h-10 rounded-lg bg-slate-900" />
								<div className="mt-2 h-6 rounded-lg bg-slate-800" />
							</div>
							<p className="mt-3 text-sm font-semibold text-slate-900">Dark Mode</p>
						</button>
					</div>
				</div>

				<div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div>
							<h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
								Market Data
							</h3>
							<p className="text-xs text-slate-500 mt-1 font-semibold">
								Exchange rates and display currency.
							</p>
						</div>
						<div className="flex items-center gap-2 rounded-full border border-border-light bg-slate-50 px-3 py-1.5">
							<span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
								Preferred
							</span>
							<select
								ref={preferredCurrencyRef}
								value={preferredCurrency}
								onChange={(event) => handlePreferredCurrencyChange(event.target.value)}
								disabled={prefSaving}
								className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
							>
								<option value="EUR">EUR</option>
								<option value="USD">USD</option>
								<option value="GBP">GBP</option>
								<option value="CHF">CHF</option>
								<option value="JPY">JPY</option>
								<option value="AUD">AUD</option>
								<option value="CAD">CAD</option>
								<option value="SEK">SEK</option>
								<option value="NOK">NOK</option>
								<option value="DKK">DKK</option>
							</select>
						</div>
					</div>
					<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
						<div className="text-[11px] text-slate-500">
							{fxRate
								? `Last update: ${new Date(fxRate.fetchedAt).toLocaleString()} · ${fxRate.source === "manual" ? "Manual" : "Alpha Vantage"}`
								: "No FX data loaded yet."}
						</div>
						{isAdmin ? (
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setShowManualFxModal(true)}
									className="inline-flex items-center gap-2 rounded-full border border-border-light bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
								>
									<span className="material-symbols-outlined text-[14px]">edit</span>
									Set manually
								</button>
								<button
									type="button"
									onClick={handleRefreshFx}
									disabled={fxLoading}
									className="inline-flex items-center gap-2 rounded-full border border-border-light bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
								>
									<span className="material-symbols-outlined text-[14px]">
										{fxLoading ? "sync" : "update"}
									</span>
									{fxLoading ? "Refreshing..." : "Refresh"}
								</button>
							</div>
						) : null}
					</div>
					<div className="mt-4 grid gap-3 sm:grid-cols-2">
						<div className="rounded-2xl bg-slate-50 px-4 py-3">
							<div className="flex items-center justify-between text-xs uppercase text-slate-500 font-semibold">
								<span>EUR → USD</span>
								<span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white">
									<span className="material-symbols-outlined text-slate-500 text-[14px]">
										trending_up
									</span>
								</span>
							</div>
							<p className="mt-1 text-2xl font-bold text-slate-900">
								{fxRate ? fxRate.rate.toFixed(4) : "—"}
							</p>
						</div>
						<div className="rounded-2xl bg-slate-50 px-4 py-3">
							<div className="flex items-center justify-between text-xs uppercase text-slate-500 font-semibold">
								<span>USD → EUR</span>
								<span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white">
									<span className="material-symbols-outlined text-slate-500 text-[14px]">
										trending_down
									</span>
								</span>
							</div>
							<p className="mt-1 text-2xl font-bold text-slate-900">
								{fxRate ? (1 / fxRate.rate).toFixed(4) : "—"}
							</p>
						</div>
					</div>
					{prefError ? <p className="mt-3 text-xs text-rose-600">{prefError}</p> : null}
					{fxError ? <p className="text-xs text-rose-600 mt-3">{fxError}</p> : null}
				</div>

				<div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
					<div className="flex flex-wrap items-center gap-4 mb-4">
						<div className="flex-1">
							<h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
								Risk-Free Rates
							</h3>
						</div>
					</div>
					<div className="grid gap-3 md:grid-cols-2">
						{(["US", "EU"] as const).map((region) => {
							const rate = riskFreeRates[region];
							const display = rate ? (rate.rate * 100).toFixed(4) : "—";
							const manualValue = region === "US" ? manualRiskFreeUs : manualRiskFreeEu;
							return (
								<div
									key={region}
									className="rounded-2xl bg-slate-50 px-4 py-3"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="text-xs uppercase text-slate-500 font-semibold">
												{region} Risk-Free
											</p>
											<p className="mt-1 text-2xl font-bold text-slate-900">
												{display}%
											</p>
											<p className="text-[10px] text-slate-400 mt-1">
												{rate
													? `Last update: ${new Date(rate.fetchedAt).toLocaleString()} · Manual`
													: "No data loaded yet."}
											</p>
										</div>
										{isAdmin ? (
											<button
												type="button"
												onClick={() => setShowRiskFreeModal(region)}
												className="inline-flex items-center gap-2 rounded-full border border-border-light bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
											>
												<span className="material-symbols-outlined text-[14px]">edit</span>
												Set manually
											</button>
										) : null}
									</div>
								</div>
							);
						})}
					</div>
					{riskFreeError ? <p className="text-xs text-rose-600 mt-4">{riskFreeError}</p> : null}
				</div>

				{showRiskFreeModal ? (
					<div className="fixed inset-0 z-50 flex items-center justify-center px-4">
						<div
							className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
							onClick={() => setShowRiskFreeModal(null)}
						/>
						<div className="relative w-full max-w-md rounded-2xl border border-border-light bg-white shadow-2xl">
							<div className="flex items-center justify-between border-b border-border-light px-5 py-4">
								<div>
									<h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
										Set {showRiskFreeModal} Risk-Free
									</h3>
									<p className="text-xs text-slate-500 mt-1">
										Manual override for pricing inputs.
									</p>
								</div>
								<button
									type="button"
									onClick={() => setShowRiskFreeModal(null)}
									className="rounded-full p-2 hover:bg-slate-100"
								>
									<span className="material-symbols-outlined text-base">close</span>
								</button>
							</div>
							<div className="px-5 py-4">
								<label className="text-[10px] font-semibold uppercase text-slate-400">
									Manual rate (%)
								</label>
								<input
									type="number"
									step={0.0001}
									min={0}
									value={showRiskFreeModal === "US" ? manualRiskFreeUs : manualRiskFreeEu}
									onChange={(event) =>
										showRiskFreeModal === "US"
											? setManualRiskFreeUs(
													event.target.value === "" ? "" : Number(event.target.value)
												)
											: setManualRiskFreeEu(
													event.target.value === "" ? "" : Number(event.target.value)
												)
									}
									className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm bg-white"
									placeholder="e.g. 4.50"
									disabled={riskFreeLoading}
								/>
								{riskFreeError ? (
									<p className="mt-2 text-xs text-rose-600">{riskFreeError}</p>
								) : null}
							</div>
							<div className="flex items-center justify-end gap-2 border-t border-border-light px-5 py-4">
								<button
									type="button"
									onClick={() => setShowRiskFreeModal(null)}
									className="rounded-lg border border-border-light px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={() => handleSaveRiskFreeRate(showRiskFreeModal)}
									disabled={riskFreeLoading}
									className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
								>
									Save
								</button>
							</div>
						</div>
					</div>
				) : null}

				{isAdmin ? (
					<div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
						<div>
							<h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
								Admin Tools
							</h3>
							<p className="text-xs text-slate-500 mt-1 font-semibold">
								Administrative maintenance & cache controls.
							</p>
						</div>
						<div className="mt-5 grid grid-cols-2 gap-4 sm:flex sm:items-start sm:gap-5">
							<Link
								href="/settings/onvista-cache"
								className="group flex h-28 w-full min-w-[140px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
							>
								<span className="material-symbols-outlined text-[30px] text-slate-600 transition-colors group-hover:text-slate-900">
									database
								</span>
								<span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
									Onvista Cache
								</span>
							</Link>
							<Link
								href="/settings/users"
								className="group flex h-28 w-full min-w-[140px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
							>
								<span className="material-symbols-outlined text-[30px] text-slate-600 transition-colors group-hover:text-slate-900">
									group
								</span>
								<span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
									User Management
								</span>
							</Link>
						</div>
					</div>
				) : null}

				<div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
								Session
							</p>
							<h3 className="text-lg font-bold text-slate-900 mt-1">
								Logout of this device
							</h3>
							<p className="text-xs text-slate-500 mt-2 max-w-md">
								Sign out to end your current session. You can sign in again at any time.
							</p>
						</div>
						<button
							type="button"
							onClick={() => signOut({ callbackUrl: "/signin" })}
							className="inline-flex items-center gap-2 rounded-full border border-slate-900/20 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
						>
							<span className="material-symbols-outlined text-[16px]">logout</span>
							Logout
						</button>
					</div>
				</div>
			</div>

			<div
				className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${showManualFxModal ? "" : "hidden"
					}`}
				onClick={() => setShowManualFxModal(false)}
			/>
			<div
				className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${showManualFxModal ? "" : "pointer-events-none"
					}`}
				onClick={() => setShowManualFxModal(false)}
				aria-hidden={!showManualFxModal}
			>
				<div
					className={`w-full max-w-lg bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out ${showManualFxModal ? "scale-100 opacity-100" : "scale-95 opacity-0"
						}`}
					onClick={(event) => event.stopPropagation()}
				>
					<div className="p-6 border-b border-border-light flex items-center justify-between">
						<div>
							<h3 className="text-lg font-bold text-slate-900">Manual Override</h3>
							<p className="text-sm text-slate-500 mt-1">Cached for 48h · EUR/USD</p>
						</div>
						<button
							type="button"
							onClick={() => setShowManualFxModal(false)}
							className="p-2 hover:bg-slate-100 rounded-full transition-colors"
						>
							<span className="material-symbols-outlined">close</span>
						</button>
					</div>
					<div className="p-6">
						<label className="text-xs font-bold uppercase text-slate-500">
							Manual rate
						</label>
						<input
							type="number"
							min={0}
							step={0.0001}
							value={manualRate}
							onChange={(event) =>
								setManualRate(event.target.value === "" ? "" : Number(event.target.value))
							}
							className="mt-2 w-full rounded-lg border border-border-light px-4 py-2 text-sm bg-slate-50"
							placeholder="Enter manual rate value..."
						/>
						{fxError ? <p className="text-xs text-rose-600 mt-2">{fxError}</p> : null}
					</div>
					<div className="p-6 border-t border-border-light bg-slate-50 flex gap-3 rounded-b-2xl">
						<button
							type="button"
							onClick={() => setShowManualFxModal(false)}
							className="flex-1 px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleManualFx}
							disabled={fxLoading}
							className="flex-1 px-5 py-3 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 disabled:opacity-60"
						>
							Save Override
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
