"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Project = {
  id: string;
  name: string;
  baseCurrency: string;
  riskProfile: "conservative" | "balanced" | "aggressive" | null;
  createdAt: string;
  updatedAt: string;
};

type PositionComputed = {
  fairValue: number;
  intrinsicValue: number;
  timeValue: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv?: number;
  asOf: string;
};

type TimeValuePoint = { day: number; value: number };

type Position = {
  id: string;
  projectId: string;
  name?: string;
  isin: string;
  side: "put" | "call";
  size: number;
  entryPrice: number;
  pricingMode?: "market" | "model";
  underlyingSymbol?: string;
  underlyingPrice?: number;
  strike?: number;
  expiry?: string;
  volatility?: number;
  rate?: number;
  dividendYield?: number;
  ratio?: number;
  marketPrice?: number;
  computed?: PositionComputed;
  timeValueCurve?: TimeValuePoint[];
  createdAt: string;
  updatedAt?: string;
};

type RatioSummary = {
  totalPuts: number;
  totalCalls: number;
  ratio: number | null;
};

type ValueSummary = {
  totalMarketValue: number;
  totalIntrinsicValue: number;
  totalTimeValue: number;
};

type ProjectDetailResponse = {
  project: Project;
  positions: Position[];
  ratioSummary: RatioSummary;
  valueSummary: ValueSummary;
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;
  const [project, setProject] = useState<Project | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [ratioSummary, setRatioSummary] = useState<RatioSummary>({
    totalPuts: 0,
    totalCalls: 0,
    ratio: null,
  });
  const [valueSummary, setValueSummary] = useState<ValueSummary>({
    totalMarketValue: 0,
    totalIntrinsicValue: 0,
    totalTimeValue: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isin, setIsin] = useState("");
  const [name, setName] = useState("");
  const [side, setSide] = useState<Position["side"]>("call");
  const [size, setSize] = useState(1);
  const [entryPrice, setEntryPrice] = useState<number | "">("");
  const [pricingMode, setPricingMode] = useState<"market" | "model">("market");
  const [marketPrice, setMarketPrice] = useState<number | "">("");
  const [underlyingSymbol, setUnderlyingSymbol] = useState("");
  const [underlyingPrice, setUnderlyingPrice] = useState<number | "">("");
  const [strike, setStrike] = useState<number | "">("");
  const [expiry, setExpiry] = useState("");
  const [volatilityPct, setVolatilityPct] = useState<number | "">("");
  const [ratePct, setRatePct] = useState<number | "">(3);
  const [dividendYieldPct, setDividendYieldPct] = useState<number | "">(0);
  const [ratio, setRatio] = useState<number | "">(1);

  const canAdd = useMemo(() => {
    const baseValid = Boolean(isin.trim()) && Number(size) > 0 && entryPrice !== "";
    if (!baseValid) return false;

    if (pricingMode === "market") {
      return marketPrice !== "";
    }

    return (
      underlyingPrice !== "" &&
      strike !== "" &&
      Boolean(expiry) &&
      volatilityPct !== "" &&
      ratePct !== ""
    );
  }, [
    isin,
    size,
    entryPrice,
    pricingMode,
    marketPrice,
    underlyingPrice,
    strike,
    expiry,
    volatilityPct,
    ratePct,
  ]);

  async function loadProject() {
    if (!projectId) return;
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = (await response.json().catch(() => null)) as
        | ProjectDetailResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          data && "error" in data ? data.error || "Failed to load" : "Failed to load"
        );
      }

      if (data && "project" in data) {
        setProject(data.project);
        setPositions(data.positions ?? []);
        setRatioSummary(data.ratioSummary ?? { totalPuts: 0, totalCalls: 0, ratio: null });
        setValueSummary(
          data.valueSummary ?? { totalMarketValue: 0, totalIntrinsicValue: 0, totalTimeValue: 0 }
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load project";
      setError(message);
    }
  }

  async function handleAddPosition() {
    if (!projectId || !canAdd) return;
    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: name.trim() || undefined,
        isin: isin.trim(),
        side,
        size: Number(size),
        entryPrice: Number(entryPrice),
        pricingMode,
        marketPrice: pricingMode === "market" ? Number(marketPrice) : undefined,
        underlyingSymbol: underlyingSymbol.trim() || undefined,
        underlyingPrice: pricingMode === "model" ? Number(underlyingPrice) : undefined,
        strike: pricingMode === "model" ? Number(strike) : undefined,
        expiry: pricingMode === "model" ? expiry : undefined,
        volatility: pricingMode === "model" ? Number(volatilityPct) / 100 : undefined,
        rate: pricingMode === "model" ? Number(ratePct) / 100 : undefined,
        dividendYield:
          pricingMode === "model" ? Number(dividendYieldPct || 0) / 100 : undefined,
        ratio: ratio === "" ? undefined : Number(ratio),
      };

      const response = await fetch(`/api/projects/${projectId}/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as
        | { error?: string }
        | { position?: Position }
        | null;

      if (!response.ok) {
        const errorMessage =
          result && "error" in result
            ? result.error ?? "Unable to add position"
            : "Unable to add position";
        throw new Error(errorMessage);
      }

      setIsin("");
      setName("");
      setSide("call");
      setSize(1);
      setEntryPrice("");
      setMarketPrice("");
      setUnderlyingSymbol("");
      setUnderlyingPrice("");
      setStrike("");
      setExpiry("");
      setVolatilityPct("");
      setRatePct(3);
      setDividendYieldPct(0);
      setRatio(1);
      await loadProject();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to add position";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePosition(positionId: string) {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/positions/${positionId}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        const errorMessage =
          payload && "error" in payload ? payload.error ?? "Unable to delete position" : "Unable to delete position";
        throw new Error(errorMessage);
      }

      await loadProject();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete position";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecompute(positionId: string) {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/positions/${positionId}/recompute`,
        { method: "POST" }
      );
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        const errorMessage =
          payload && "error" in payload ? payload.error ?? "Unable to recompute" : "Unable to recompute";
        throw new Error(errorMessage);
      }

      await loadProject();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to recompute";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProject();
  }, [projectId]);

  if (!project) {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          {error ? error : "Loading project..."}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{project.name}</h2>
        <div className="text-sm text-slate-500 mt-1">
          Base {project.baseCurrency}
          {project.riskProfile ? ` · ${project.riskProfile}` : ""}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.4fr] gap-6">
        <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            Add Position
          </h3>
          <div className="grid gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">ISIN</label>
              <input
                value={isin}
                onChange={(event) => setIsin(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm font-mono"
                placeholder="DE000..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Side</label>
                <select
                  value={side}
                  onChange={(event) => setSide(event.target.value as Position["side"])}
                  className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm bg-white"
                >
                  <option value="call">Call</option>
                  <option value="put">Put</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Size</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={size}
                  onChange={(event) => setSize(Number(event.target.value))}
                  className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Entry price</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={entryPrice}
                onChange={(event) =>
                  setEntryPrice(event.target.value === "" ? "" : Number(event.target.value))
                }
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Pricing</label>
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-border-light bg-slate-50 p-1">
                {(["market", "model"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPricingMode(mode)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                      pricingMode === mode
                        ? "bg-slate-900 text-white"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Model pricing values are approximations based on Black–Scholes inputs.
              </p>
            </div>

            {pricingMode === "market" ? (
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Market price</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={marketPrice}
                  onChange={(event) =>
                    setMarketPrice(event.target.value === "" ? "" : Number(event.target.value))
                  }
                  className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                />
              </div>
            ) : (
              <div className="grid gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Underlying symbol</label>
                  <input
                    value={underlyingSymbol}
                    onChange={(event) => setUnderlyingSymbol(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                    placeholder="Optional"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Underlying price</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={underlyingPrice}
                      onChange={(event) =>
                        setUnderlyingPrice(event.target.value === "" ? "" : Number(event.target.value))
                      }
                      className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Strike</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={strike}
                      onChange={(event) => setStrike(event.target.value === "" ? "" : Number(event.target.value))}
                      className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Expiry</label>
                    <input
                      type="date"
                      value={expiry}
                      onChange={(event) => setExpiry(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Ratio</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={ratio}
                      onChange={(event) => setRatio(event.target.value === "" ? "" : Number(event.target.value))}
                      className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Volatility %</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={volatilityPct}
                      onChange={(event) =>
                        setVolatilityPct(event.target.value === "" ? "" : Number(event.target.value))
                      }
                      className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                      placeholder="25"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Rate %</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={ratePct}
                      onChange={(event) => setRatePct(event.target.value === "" ? "" : Number(event.target.value))}
                      className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Dividend %</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={dividendYieldPct}
                      onChange={(event) =>
                        setDividendYieldPct(event.target.value === "" ? "" : Number(event.target.value))
                      }
                      className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleAddPosition}
              disabled={!canAdd || loading}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "Saving..." : "Add position"}
            </button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
              Put/Call Summary
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="rounded-xl border border-border-light bg-slate-50 p-4">
                <div className="text-xs uppercase text-slate-500">Total puts</div>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {ratioSummary.totalPuts}
                </div>
              </div>
              <div className="rounded-xl border border-border-light bg-slate-50 p-4">
                <div className="text-xs uppercase text-slate-500">Total calls</div>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {ratioSummary.totalCalls}
                </div>
              </div>
              <div className="rounded-xl border border-border-light bg-slate-50 p-4">
                <div className="text-xs uppercase text-slate-500">Ratio</div>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {ratioSummary.ratio === null ? "—" : ratioSummary.ratio.toFixed(2)}
                </div>
                {ratioSummary.ratio === null ? (
                  <div className="text-[11px] text-slate-400 mt-1">
                    Add a call position to compute.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
              Value Summary
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="rounded-xl border border-border-light bg-slate-50 p-4">
                <div className="text-xs uppercase text-slate-500">Total market value</div>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {valueSummary.totalMarketValue.toFixed(2)}
                </div>
              </div>
              <div className="rounded-xl border border-border-light bg-slate-50 p-4">
                <div className="text-xs uppercase text-slate-500">Total intrinsic</div>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {valueSummary.totalIntrinsicValue.toFixed(2)}
                </div>
              </div>
              <div className="rounded-xl border border-border-light bg-slate-50 p-4">
                <div className="text-xs uppercase text-slate-500">Total time value</div>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {valueSummary.totalTimeValue.toFixed(2)}
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Market totals use manual market prices or model fair values multiplied by size and ratio.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Positions
          </h3>
          <p className="text-xs text-slate-500">Model values are approximate.</p>
        </div>
        {positions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No positions yet. Add a put or call to start tracking.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border-light">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">ISIN</th>
                  <th className="px-4 py-3 text-left font-semibold">Side</th>
                  <th className="px-4 py-3 text-left font-semibold">Pricing</th>
                  <th className="px-4 py-3 text-right font-semibold">Size</th>
                  <th className="px-4 py-3 text-right font-semibold">Value</th>
                  <th className="px-4 py-3 text-right font-semibold">Entry</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {positions.map((position) => {
                  const mode = position.pricingMode ?? "market";
                  const ratioValue = position.ratio ?? 1;
                  const displayValue =
                    mode === "model"
                      ? position.computed?.fairValue
                      : position.marketPrice ?? position.entryPrice;
                  const secondaryValue =
                    mode === "model" && position.computed
                      ? `Intrinsic ${position.computed.intrinsicValue.toFixed(2)} · Time ${position.computed.timeValue.toFixed(2)}`
                      : position.marketPrice === undefined
                        ? "Using entry price"
                        : "";

                  return (
                    <Fragment key={position.id}>
                      <tr className="bg-white">
                        <td className="px-4 py-3 font-mono text-slate-700">{position.isin}</td>
                        <td className="px-4 py-3 text-slate-600 capitalize">{position.side}</td>
                        <td className="px-4 py-3 text-slate-600 capitalize">{mode}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{position.size}</td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {displayValue === undefined ? "—" : displayValue.toFixed(2)}
                          {secondaryValue ? (
                            <div className="text-[11px] text-slate-400 mt-1">{secondaryValue}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {position.entryPrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {mode === "model" ? (
                              <button
                                type="button"
                                onClick={() => handleRecompute(position.id)}
                                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                                disabled={loading}
                              >
                                Recompute
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedId(expandedId === position.id ? null : position.id)
                              }
                              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                            >
                              {expandedId === position.id ? "Hide" : "Details"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePosition(position.id)}
                              className="text-xs font-semibold text-red-600 hover:text-red-700"
                              disabled={loading}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === position.id ? (
                        <tr className="bg-slate-50">
                          <td colSpan={7} className="px-4 py-4 text-xs text-slate-600">
                            <div className="grid gap-3 md:grid-cols-3">
                              <div>
                                <div className="font-semibold text-slate-700">Model inputs</div>
                                <div className="mt-2 space-y-1">
                                  <div>Underlying: {position.underlyingSymbol || "—"}</div>
                                  <div>Underlying price: {position.underlyingPrice ?? "—"}</div>
                                  <div>Strike: {position.strike ?? "—"}</div>
                                  <div>Expiry: {position.expiry ?? "—"}</div>
                                  <div>Volatility: {position.volatility ?? "—"}</div>
                                  <div>Rate: {position.rate ?? "—"}</div>
                                  <div>Dividend yield: {position.dividendYield ?? "—"}</div>
                                  <div>Ratio: {ratioValue}</div>
                                </div>
                              </div>
                              <div>
                                <div className="font-semibold text-slate-700">Greeks</div>
                                <div className="mt-2 space-y-1">
                                  <div>Delta: {position.computed?.delta ?? "—"}</div>
                                  <div>Gamma: {position.computed?.gamma ?? "—"}</div>
                                  <div>Theta: {position.computed?.theta ?? "—"}</div>
                                  <div>Vega: {position.computed?.vega ?? "—"}</div>
                                  <div>As of: {position.computed?.asOf ?? "—"}</div>
                                </div>
                              </div>
                              <div>
                                <div className="font-semibold text-slate-700">Time value curve</div>
                                <div className="mt-2 rounded-lg border border-border-light bg-white p-3 font-mono text-[11px] text-slate-500 max-h-40 overflow-auto">
                                  {position.timeValueCurve
                                    ? JSON.stringify(position.timeValueCurve, null, 2)
                                    : "No curve generated."}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
