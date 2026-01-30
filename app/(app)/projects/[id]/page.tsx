
"use client";

import { Menu } from "@headlessui/react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  underlyingSymbol?: string | null;
  color?: string | null;
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
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [showDeletePosition, setShowDeletePosition] = useState(false);
  const [deletePositionTarget, setDeletePositionTarget] = useState<Position | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBaseCurrency, setEditBaseCurrency] = useState("");
  const [editUnderlyingSymbol, setEditUnderlyingSymbol] = useState("");
  const [editColor, setEditColor] = useState("#2563eb");

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
  function resetPositionForm() {
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
  }

  async function handleSavePosition() {
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

      const response = editingPositionId
        ? await fetch(`/api/projects/${projectId}/positions/${editingPositionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/projects/${projectId}/positions`, {
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

      resetPositionForm();
      setEditingPositionId(null);
      setShowPositionModal(false);
      await loadProject();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to add position";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePosition() {
    if (!projectId || !deletePositionTarget) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/positions/${deletePositionTarget.id}`,
        {
        method: "DELETE",
        }
      );
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
      setShowDeletePosition(false);
      setDeletePositionTarget(null);
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

  useEffect(() => {
    if (!project) return;
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    setEditBaseCurrency(project.baseCurrency ?? "EUR");
    setEditUnderlyingSymbol(project.underlyingSymbol ?? "");
    setEditColor(project.color ?? "#2563eb");
  }, [project]);

  function openAddPosition() {
    resetPositionForm();
    setEditingPositionId(null);
    setShowPositionModal(true);
  }

  function openEditPosition(position: Position) {
    setEditingPositionId(position.id);
    setIsin(position.isin);
    setName(position.name ?? "");
    setSide(position.side);
    setSize(position.size);
    setEntryPrice(position.entryPrice);
    setPricingMode(position.pricingMode ?? "market");
    setMarketPrice(position.marketPrice ?? "");
    setUnderlyingSymbol(position.underlyingSymbol ?? "");
    setUnderlyingPrice(position.underlyingPrice ?? "");
    setStrike(position.strike ?? "");
    setExpiry(position.expiry ?? "");
    setVolatilityPct(position.volatility ? position.volatility * 100 : "");
    setRatePct(position.rate ? position.rate * 100 : 3);
    setDividendYieldPct(position.dividendYield ? position.dividendYield * 100 : 0);
    setRatio(position.ratio ?? 1);
    setShowPositionModal(true);
  }

  function openDeletePosition(position: Position) {
    setDeletePositionTarget(position);
    setShowDeletePosition(true);
  }

  async function handleUpdateProject() {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          baseCurrency: editBaseCurrency.trim(),
          description: editDescription.trim() || undefined,
          underlyingSymbol: editUnderlyingSymbol.trim(),
          color: editColor.trim() || undefined,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | { project?: Project }
        | null;

      if (!response.ok) {
        const errorMessage =
          payload && "error" in payload ? payload.error ?? "Unable to update project" : "Unable to update project";
        throw new Error(errorMessage);
      }

      setShowEditProject(false);
      await loadProject();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update project";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProject() {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to delete project");
      }
      window.location.href = "/projects";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete project";
      setError(message);
    } finally {
      setLoading(false);
      setShowDeleteProject(false);
    }
  }

  function projectColor(projectIdValue: string) {
    if (project?.color) {
      return { style: { backgroundColor: project.color }, textClass: "text-white", className: "" };
    }
    const palette = [
      { bg: "bg-blue-100", text: "text-blue-600" },
      { bg: "bg-emerald-100", text: "text-emerald-600" },
      { bg: "bg-amber-100", text: "text-amber-600" },
      { bg: "bg-rose-100", text: "text-rose-600" },
      { bg: "bg-indigo-100", text: "text-indigo-600" },
      { bg: "bg-teal-100", text: "text-teal-600" },
    ];
    const index = Math.abs(
      projectIdValue.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
    );
    const picked = palette[index % palette.length];
    return { className: `${picked.bg} ${picked.text}`, textClass: "", style: undefined };
  }

  function getRiskBadge(profile: Project["riskProfile"]) {
    if (!profile) return { label: "Custom", classes: "bg-yellow-100 text-yellow-600 border-yellow-200" };
    if (profile === "conservative") return { label: "Conservative", classes: "bg-emerald-100 text-emerald-600 border-emerald-200" };
    if (profile === "balanced") return { label: "Balanced", classes: "bg-yellow-100 text-yellow-600 border-yellow-200" };
    return { label: "Aggressive", classes: "bg-red-100 text-red-600 border-red-200" };
  }

  function timeToExpiry(expiryValue?: string) {
    if (!expiryValue) return "—";
    const diff = Date.parse(expiryValue) - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (!Number.isFinite(days)) return "—";
    return days <= 0 ? "Expired" : `${days}d`;
  }

  function tradingViewSrc(symbol?: string | null) {
    if (!symbol) return "";
    const encoded = encodeURIComponent(symbol);
    return `https://s.tradingview.com/widgetembed/?symbol=${encoded}&interval=D&style=1&locale=en&hide_top_toolbar=1&hide_side_toolbar=1&allow_symbol_change=1&withdateranges=1&hideideas=1&theme=light`;
  }

  if (!project) {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="w-full max-w-xl">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-800 border-t-transparent" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Project loading</h3>
            <p className="mt-2 text-sm text-slate-500">
              {error ? error : "Fetching project details and positions."}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center ${projectColor(project.id).className} ${projectColor(project.id).textClass}`}
                style={projectColor(project.id).style}
              >
                <span className="material-symbols-outlined text-xl">folder</span>
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                  {project.name}
                </h2>
                {project.description ? (
                  <p className="text-sm text-slate-500 mt-1">{project.description}</p>
                ) : (
                  <p className="text-sm text-slate-500 mt-1">
                    Strategy container for warrant positions and analytics.
                  </p>
                )}
                {project.underlyingSymbol ? (
                  <p className="text-xs text-slate-500 mt-1">
                    Underlying:{" "}
                    <span className="font-semibold text-slate-700">
                      {project.underlyingSymbol}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
            <Menu as="div" className="relative inline-flex items-center">
              <Menu.Button className="p-2 rounded-lg border border-border-light text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                <span className="material-symbols-outlined text-lg">more_vert</span>
              </Menu.Button>
              <Menu.Items
                anchor="bottom end"
                portal
                className="z-50 w-52 rounded-xl border border-border-light bg-white shadow-xl ring-1 ring-black/5 overflow-hidden py-1"
              >
                <Menu.Item>
                  {({ active }) => (
                    <button
                      type="button"
                      onClick={() => setShowEditProject(true)}
                      className={[
                        "w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 flex items-center gap-2",
                        active ? "bg-slate-50" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                      Edit project
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      type="button"
                      onClick={() => setShowDeleteProject(true)}
                      className={[
                        "w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 flex items-center gap-2",
                        active ? "bg-rose-50" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                      Delete project
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Menu>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-surface-light border border-border-light p-4 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 uppercase">Base Currency</p>
              <p className="text-2xl font-bold mt-1">{project.baseCurrency}</p>
            </div>
            <div className="bg-surface-light border border-border-light p-4 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 uppercase">Risk Profile</p>
              <div className="mt-2">
                <span
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getRiskBadge(project.riskProfile).classes}`}
                >
                  {getRiskBadge(project.riskProfile).label}
                </span>
              </div>
            </div>
            <div className="bg-surface-light border border-border-light p-4 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 uppercase">Put/Call Ratio</p>
              <p className="text-2xl font-bold mt-1">
                {ratioSummary.ratio === null ? "—" : ratioSummary.ratio.toFixed(2)}
              </p>
            </div>
            <div className="bg-surface-light border border-border-light p-4 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 uppercase">Positions</p>
              <p className="text-2xl font-bold mt-1">{positions.length}</p>
            </div>
            <div className="bg-surface-light border border-border-light p-4 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Value</p>
              <p className="text-2xl font-bold mt-1">
                {valueSummary.totalMarketValue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wider">
              Positions
            </h3>
            <button
              type="button"
              onClick={openAddPosition}
              className="h-11 w-11 rounded-lg border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center"
              aria-label="Add position"
            >
              <span className="material-symbols-outlined text-lg">add</span>
            </button>
          </div>
          {positions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <span className="material-symbols-outlined text-2xl">playlist_add</span>
              </div>
              <h4 className="text-base font-semibold text-slate-800">No positions yet</h4>
              <p className="mt-2 text-sm text-slate-500">
                Add a put or call position to start tracking this strategy.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border-light bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full min-w-[980px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-border-light">
                      <th className="px-6 py-4">Instrument</th>
                      <th className="px-6 py-4">Side</th>
                      <th className="px-6 py-4">Size</th>
                      <th className="px-6 py-4">Pricing Mode</th>
                      <th className="px-6 py-4">Value</th>
                      <th className="px-6 py-4">Leverage</th>
                      <th className="px-6 py-4">Time to Expiry</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light relative z-0">
                    {positions.map((position, index) => {
                      const mode = position.pricingMode ?? "market";
                      const displayValue =
                        mode === "model"
                          ? position.computed?.fairValue
                          : position.marketPrice ?? position.entryPrice;
                      const isLastRow = index === positions.length - 1;
                      return (
                        <tr key={position.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900">
                                {position.name ?? position.isin}
                              </span>
                              <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                                {position.isin}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-700 capitalize">
                            {position.side}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">{position.size}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 capitalize">
                            {mode}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {displayValue === undefined ? "—" : displayValue.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {position.ratio ?? 1}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {timeToExpiry(position.expiry)}
                          </td>
                          <td className="px-6 py-4 text-right relative overflow-visible">
                            <Menu as="div" className="relative inline-flex items-center">
                              <Menu.Button
                                onClick={(event) => event.stopPropagation()}
                                className="p-1.5 hover:bg-slate-100 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                              >
                                <span className="material-symbols-outlined text-lg text-slate-500">
                                  more_vert
                                </span>
                              </Menu.Button>
                              <Menu.Items
                                anchor={isLastRow ? "top end" : "bottom end"}
                                portal
                                className="z-50 w-52 rounded-xl border border-border-light bg-white shadow-xl ring-1 ring-black/5 overflow-hidden py-1"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      type="button"
                                      onClick={() => openEditPosition(position)}
                                      className={[
                                        "w-full px-3 py-2 text-left text-xs font-semibold text-slate-600 flex items-center gap-2",
                                        active ? "bg-slate-50" : "",
                                      ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    >
                                      <span className="material-symbols-outlined text-base">edit</span>
                                      Edit position
                                    </button>
                                  )}
                                </Menu.Item>
                                {mode === "model" ? (
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        type="button"
                                        onClick={() => handleRecompute(position.id)}
                                        className={[
                                          "w-full px-3 py-2 text-left text-xs font-semibold text-slate-600 flex items-center gap-2",
                                          active ? "bg-slate-50" : "",
                                        ]
                                          .filter(Boolean)
                                          .join(" ")}
                                        disabled={loading}
                                      >
                                        <span className="material-symbols-outlined text-base">
                                          sync
                                        </span>
                                        Recompute model
                                      </button>
                                    )}
                                  </Menu.Item>
                                ) : null}
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      type="button"
                                      onClick={() => openDeletePosition(position)}
                                      className={[
                                        "w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 flex items-center gap-2",
                                        active ? "bg-rose-50" : "",
                                      ]
                                        .filter(Boolean)
                                        .join(" ")}
                                      disabled={loading}
                                    >
                                      <span className="material-symbols-outlined text-base">delete</span>
                                      Delete position
                                    </button>
                                  )}
                                </Menu.Item>
                              </Menu.Items>
                            </Menu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">
              Underlying Chart
            </h3>
            {project.underlyingSymbol ? (
              <span className="text-xs font-semibold text-slate-500">
                {project.underlyingSymbol}
              </span>
            ) : null}
          </div>
          {project.underlyingSymbol ? (
            <div className="rounded-2xl border border-border-light bg-white shadow-sm overflow-hidden">
              <iframe
                title="TradingView chart"
                src={tradingViewSrc(project.underlyingSymbol)}
                className="w-full h-[420px]"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              Add an underlying asset (e.g. NASDAQ:COIN) to see the TradingView chart.
            </div>
          )}
        </div>
      </div>

      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${
          showPositionModal ? "" : "hidden"
        }`}
        onClick={() => setShowPositionModal(false)}
      />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${
          showPositionModal ? "" : "pointer-events-none"
        }`}
        onClick={() => setShowPositionModal(false)}
        aria-hidden={!showPositionModal}
      >
        <div
          className={`w-full max-w-2xl bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out ${
            showPositionModal ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="p-6 border-b border-border-light flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {editingPositionId ? "Edit Position" : "Add Position"}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Manage warrants and pricing inputs for this project.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPositionModal(false)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">ISIN</label>
                <input
                  value={isin}
                  onChange={(event) => setIsin(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm font-mono bg-slate-50"
                  placeholder="DE000..."
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Side</label>
                <select
                  value={side}
                  onChange={(event) => setSide(event.target.value as Position["side"])}
                  className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
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
                  className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
                />
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
                  className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Pricing mode</label>
                <select
                  value={pricingMode}
                  onChange={(event) =>
                    setPricingMode(event.target.value as "market" | "model")
                  }
                  className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
                >
                  <option value="market">Market</option>
                  <option value="model">Model</option>
                </select>
              </div>
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
                  className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
                />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Underlying symbol</label>
                  <input
                    value={underlyingSymbol}
                    onChange={(event) => setUnderlyingSymbol(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
                    placeholder="Optional"
                  />
                </div>
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
                    className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
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
                    className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Expiry</label>
                  <input
                    type="date"
                    value={expiry}
                    onChange={(event) => setExpiry(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
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
                    className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
                  />
                </div>
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
                    className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
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
                    className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
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
                    className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
                  />
                </div>
              </div>
            )}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <div className="p-6 border-t border-border-light bg-slate-50 flex gap-3 rounded-b-2xl">
            <button
              type="button"
              onClick={() => setShowPositionModal(false)}
              className="flex-1 px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSavePosition}
              disabled={!canAdd || loading}
              className="flex-1 px-5 py-3 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all disabled:opacity-60"
            >
              {loading ? "Saving..." : editingPositionId ? "Update Position" : "Add Position"}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${
          showEditProject ? "" : "hidden"
        }`}
        onClick={() => setShowEditProject(false)}
      />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${
          showEditProject ? "" : "pointer-events-none"
        }`}
        onClick={() => setShowEditProject(false)}
        aria-hidden={!showEditProject}
      >
        <div
          className={`w-full max-w-md bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out ${
            showEditProject ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="p-6 border-b border-border-light flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Edit Project</h3>
              <p className="text-sm text-slate-500 mt-1">Update project metadata.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowEditProject(false)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Project name</label>
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Base currency</label>
              <input
                value={editBaseCurrency}
                onChange={(event) => setEditBaseCurrency(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50 uppercase"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Underlying asset</label>
              <input
                value={editUnderlyingSymbol}
                onChange={(event) => setEditUnderlyingSymbol(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
                placeholder="NASDAQ:COIN"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Project color</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={editColor}
                  onChange={(event) => setEditColor(event.target.value)}
                  className="h-11 w-16 rounded-lg border border-border-light bg-transparent p-1"
                />
                <input
                  value={editColor}
                  onChange={(event) => setEditColor(event.target.value)}
                  className="flex-1 rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50 font-mono uppercase"
                  placeholder="#2563eb"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Description</label>
              <textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
                rows={4}
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <div className="p-6 border-t border-border-light bg-slate-50 flex gap-3 rounded-b-2xl">
            <button
              type="button"
              onClick={() => setShowEditProject(false)}
              className="flex-1 px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdateProject}
              className="flex-1 px-5 py-3 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${
          showDeleteProject ? "" : "hidden"
        }`}
        onClick={() => setShowDeleteProject(false)}
      />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${
          showDeleteProject ? "" : "pointer-events-none"
        }`}
        onClick={() => setShowDeleteProject(false)}
        aria-hidden={!showDeleteProject}
      >
        <div
          className={`w-full max-w-md bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out ${
            showDeleteProject ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="p-6 border-b border-border-light flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">warning</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Projekt löschen</h3>
              <p className="text-sm text-slate-500 mt-1">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600">
              Möchten Sie das Projekt{" "}
              <span className="font-semibold text-slate-900">{project.name}</span> wirklich
              löschen? Alle Positionen werden entfernt.
            </p>
          </div>
          <div className="p-6 border-t border-border-light bg-slate-50 flex gap-3 rounded-b-2xl">
            <button
              type="button"
              onClick={() => setShowDeleteProject(false)}
              className="flex-1 px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleDeleteProject}
              className="flex-1 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
            >
              Projekt löschen
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${
          showDeletePosition ? "" : "hidden"
        }`}
        onClick={() => setShowDeletePosition(false)}
      />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${
          showDeletePosition ? "" : "pointer-events-none"
        }`}
        onClick={() => setShowDeletePosition(false)}
        aria-hidden={!showDeletePosition}
      >
        <div
          className={`w-full max-w-md bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out ${
            showDeletePosition ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="p-6 border-b border-border-light flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">warning</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Position löschen</h3>
              <p className="text-sm text-slate-500 mt-1">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600">
              Möchten Sie die Position
              <span className="font-semibold text-slate-900">
                {deletePositionTarget ? ` ${deletePositionTarget.name ?? deletePositionTarget.isin}` : ""}
              </span>
              wirklich löschen?
            </p>
          </div>
          <div className="p-6 border-t border-border-light bg-slate-50 flex gap-3 rounded-b-2xl">
            <button
              type="button"
              onClick={() => setShowDeletePosition(false)}
              className="flex-1 px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleDeletePosition}
              className="flex-1 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
              disabled={loading}
            >
              Position löschen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
