"use client";

import { useEffect, useMemo, useState } from "react";

import { AssetLookupHero } from "@/components/optionsschein-rechner/AssetLookupHero";
import { InfoCallout } from "@/components/optionsschein-rechner/InfoCallout";
import { KpiTilesRow } from "@/components/optionsschein-rechner/KpiTilesRow";
import { PositionSelect } from "@/components/optionsschein-rechner/PositionSelect";
import { ResultsCards } from "@/components/optionsschein-rechner/ResultsCards";
import { ScenarioComparisonTable } from "@/components/optionsschein-rechner/ScenarioComparisonTable";

const scenarioCount = 5;

type PositionItem = {
  id: string;
  projectId: string | null;
  projectName: string;
  baseCurrency: string;
  name?: string;
  isin: string;
  side: "put" | "call";
  strike?: number;
  expiry?: string;
  ratio?: number;
  underlyingPrice?: number;
  volatility?: number;
  rate?: number;
  dividendYield?: number;
  marketPrice?: number;
  computed?: { fairValue: number; delta: number };
};

type LookupInstrument = {
  isin: string;
  name?: string;
  type: "call" | "put";
  strike: number;
  expiry: string;
  currency: string;
  ratio?: number;
  underlyingSymbol?: string;
  price?: number;
};

type SelectedInstrument =
  | { kind: "position"; data: PositionItem }
  | { kind: "lookup"; data: LookupInstrument };

type ScenarioInput = {
  underlyingPrice: number | "";
  ratePct: number | "";
  volatilityPct: number | "";
  dividendYieldPct: number | "";
  fxRate: number | "";
  valuationDate: string;
};

type ScenarioResult = {
  fairValue: number | null;
  intrinsicValue: number | null;
  timeValue: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  impliedVolatilityUsed: number | null;
  breakEven: number | null;
  premium: number | null;
  omega: number | null;
  absChange: number | null;
  relChange: number | null;
  currency: string;
  valuationDate: string | null;
};

type CalculateResponse = {
  referencePrice: number | null;
  results: ScenarioResult[];
};

type PositionListResponse = {
  positions: PositionItem[];
};

type LookupResponse = {
  isin: string;
  name?: string;
  type: "call" | "put";
  strike: number;
  expiry: string;
  currency: string;
  ratio?: number;
  underlying?: string;
  price?: number;
};

function createEmptyScenario(): ScenarioInput {
  return {
    underlyingPrice: "",
    ratePct: "",
    volatilityPct: "",
    dividendYieldPct: "",
    fxRate: "",
    valuationDate: "",
  };
}

function formatMaybe(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return "—";
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function formatCurrency(value: number | null | undefined, currency: string) {
  if (value === null || value === undefined) return "—";
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(2)} ${currency}`;
}

export default function OptionsscheinRechnerPage() {
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedInstrument, setSelectedInstrument] = useState<SelectedInstrument | null>(null);
  const [lookupValue, setLookupValue] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioInput[]>(
    Array.from({ length: scenarioCount }, () => createEmptyScenario())
  );
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [referencePrice, setReferencePrice] = useState<number | null>(null);
  const [manualReference, setManualReference] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const filteredPositions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return positions;
    return positions.filter((position) => {
      const text = `${position.isin} ${position.projectName} ${position.side}`.toLowerCase();
      return text.includes(query);
    });
  }, [positions, search]);

  const positionOptions = useMemo(
    () =>
      filteredPositions.map((position) => ({
        id: position.id,
        label: `${position.name ?? position.isin} · ${position.projectName} · ${position.side.toUpperCase()}`,
      })),
    [filteredPositions]
  );

  const statusQuoResult = results[0] ?? null;
  const referenceDisplay = useMemo(() => {
    if (manualReference !== "") return Number(manualReference);
    if (selectedInstrument?.kind === "position") {
      return (
        selectedInstrument.data.marketPrice ??
        selectedInstrument.data.computed?.fairValue ??
        referencePrice ??
        null
      );
    }
    if (selectedInstrument?.kind === "lookup") {
      return selectedInstrument.data.price ?? referencePrice ?? null;
    }
    return referencePrice ?? null;
  }, [manualReference, referencePrice, selectedInstrument]);

  function syncStatusQuo(instrument: SelectedInstrument | null) {
    if (!instrument) return;
    const today = new Date().toISOString().slice(0, 10);
    const base = instrument.kind === "position" ? instrument.data : null;

    const statusScenario: ScenarioInput = {
      underlyingPrice: base?.underlyingPrice ?? "",
      ratePct: base?.rate !== undefined ? Number((base.rate * 100).toFixed(4)) : "",
      volatilityPct:
        base?.volatility !== undefined ? Number((base.volatility * 100).toFixed(4)) : "",
      dividendYieldPct:
        base?.dividendYield !== undefined ? Number((base.dividendYield * 100).toFixed(4)) : "",
      fxRate: "",
      valuationDate: today,
    };

    setScenarios((prev) => {
      const next = [...prev];
      next[0] = statusScenario;
      return next;
    });
  }

  async function loadPositions() {
    setError(null);
    try {
      const response = await fetch("/api/optionsschein/positions");
      const data = (await response.json().catch(() => null)) as PositionListResponse | null;

      if (!response.ok || !data) {
        throw new Error("Positions konnten nicht geladen werden.");
      }

      setPositions(data.positions ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Positions konnten nicht geladen werden.";
      setError(message);
    }
  }

  async function handleLookup() {
    if (!lookupValue.trim()) return;
    setLookupLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/isin/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isin: lookupValue.trim() }),
      });
      const payload = (await response.json().catch(() => null)) as LookupResponse | { error?: string } | null;

      if (!response.ok || !payload || "error" in payload) {
        throw new Error("ISIN lookup fehlgeschlagen.");
      }

      const instrument: LookupInstrument = {
        isin: payload.isin,
        name: payload.name,
        type: payload.type ?? "call",
        strike: payload.strike,
        expiry: payload.expiry,
        currency: payload.currency ?? "EUR",
        ratio: payload.ratio,
        underlyingSymbol: payload.underlying,
        price: payload.price,
      };

      setSelectedInstrument({ kind: "lookup", data: instrument });
      setSelectedId(null);
      syncStatusQuo({ kind: "lookup", data: instrument });
      setResults([]);
      setReferencePrice(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "ISIN lookup fehlgeschlagen.";
      setError(message);
    } finally {
      setLookupLoading(false);
    }
  }

  useEffect(() => {
    void loadPositions();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const match = positions.find((position) => position.id === selectedId) ?? null;
    if (match) {
      const instrument = { kind: "position" as const, data: match };
      setSelectedInstrument(instrument);
      syncStatusQuo(instrument);
      setResults([]);
      setReferencePrice(null);
      setManualReference("");
    }
  }, [selectedId, positions]);

  useEffect(() => {
    if (!selectedInstrument) {
      setWarning(null);
      return;
    }

    if (selectedInstrument.kind === "position") {
      const position = selectedInstrument.data;
      const missing = [
        !position.strike && "Basispreis",
        !position.expiry && "Fälligkeit",
        !position.ratio && "Bezugsverhältnis",
        !position.underlyingPrice && "Basiswertkurs",
        position.volatility === undefined && "Volatilität",
        position.rate === undefined && "Zinssatz",
      ].filter(Boolean);

      setWarning(
        missing.length
          ? `Fehlende Stammdaten: ${missing.join(", ")}. Bitte ergänzen.`
          : null
      );
    } else {
      setWarning(null);
    }
  }, [selectedInstrument]);

  function updateScenario(index: number, field: keyof ScenarioInput, value: ScenarioInput[keyof ScenarioInput]) {
    setScenarios((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function handleCalculate() {
    if (!selectedInstrument) return;
    setError(null);
    setLoading(true);

    try {
      const payload = {
        positionId: selectedInstrument.kind === "position" ? selectedInstrument.data.id : undefined,
        instrument:
          selectedInstrument.kind === "lookup"
            ? {
                isin: selectedInstrument.data.isin,
                side: selectedInstrument.data.type,
                strike: selectedInstrument.data.strike,
                expiry: selectedInstrument.data.expiry,
                ratio: selectedInstrument.data.ratio,
                dividendYield: undefined,
                currency: selectedInstrument.data.currency,
                price: selectedInstrument.data.price,
              }
            : undefined,
        scenarios: scenarios.map((scenario) => ({
          underlyingPrice:
            scenario.underlyingPrice === "" ? undefined : Number(scenario.underlyingPrice),
          rate: scenario.ratePct === "" ? undefined : Number(scenario.ratePct) / 100,
          volatility:
            scenario.volatilityPct === "" ? undefined : Number(scenario.volatilityPct) / 100,
          dividendYield:
            scenario.dividendYieldPct === "" ? undefined : Number(scenario.dividendYieldPct) / 100,
          fxRate: scenario.fxRate === "" ? undefined : Number(scenario.fxRate),
          valuationDate: scenario.valuationDate || undefined,
        })),
        referencePriceOverride: manualReference === "" ? undefined : Number(manualReference),
      };

      const response = await fetch("/api/optionsschein/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as CalculateResponse | { error?: string } | null;

      if (!response.ok || !data || "error" in data) {
        throw new Error((data && "error" in data && data.error) || "Berechnung fehlgeschlagen.");
      }

      setReferencePrice(data.referencePrice ?? null);
      setResults(data.results ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Berechnung fehlgeschlagen.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleLoadCurrent() {
    if (!selectedInstrument) return;
    syncStatusQuo(selectedInstrument);
  }

  const currency =
    statusQuoResult?.currency ??
    (selectedInstrument?.kind === "position"
      ? selectedInstrument.data.baseCurrency
      : selectedInstrument?.kind === "lookup"
        ? selectedInstrument.data.currency
        : "EUR");

  const kpiTiles = [
    {
      label: "Basispreis",
      value: selectedInstrument
        ? formatMaybe(
            selectedInstrument.kind === "position"
              ? selectedInstrument.data.strike
              : selectedInstrument.data.strike
          )
        : "—",
    },
    {
      label: "Aufgeld",
      value: statusQuoResult?.premium === null || statusQuoResult?.premium === undefined
        ? "—"
        : formatPercent(statusQuoResult.premium * 100),
    },
    {
      label: "Break-even",
      value: statusQuoResult?.breakEven ? formatMaybe(statusQuoResult.breakEven) : "—",
    },
    {
      label: "Delta",
      value: statusQuoResult?.delta !== null && statusQuoResult?.delta !== undefined
        ? formatMaybe(statusQuoResult.delta, 4)
        : selectedInstrument?.kind === "position"
          ? formatMaybe(selectedInstrument.data.computed?.delta, 4)
          : "—",
    },
    {
      label: "Impl. Vola",
      value:
        statusQuoResult?.impliedVolatilityUsed !== null &&
        statusQuoResult?.impliedVolatilityUsed !== undefined
          ? formatPercent(statusQuoResult.impliedVolatilityUsed * 100)
          : scenarios[0]?.volatilityPct !== ""
            ? formatPercent(Number(scenarios[0].volatilityPct))
            : "—",
      helper: "input",
    },
  ];

  const details = [
    { label: "Fairer Wert", value: formatCurrency(statusQuoResult?.fairValue, currency) },
    { label: "Intrinsischer Wert", value: formatCurrency(statusQuoResult?.intrinsicValue, currency) },
    { label: "Zeitwert", value: formatCurrency(statusQuoResult?.timeValue, currency) },
    { label: "Theta", value: formatMaybe(statusQuoResult?.theta, 4) },
    { label: "Vega", value: formatMaybe(statusQuoResult?.vega, 4) },
    { label: "Gamma", value: formatMaybe(statusQuoResult?.gamma, 4) },
    { label: "Omega", value: formatMaybe(statusQuoResult?.omega, 4) },
    { label: "Bewertungsstichtag", value: scenarios[0]?.valuationDate || "—" },
  ];

  const resultCards = Array.from({ length: scenarioCount }, (_, index) => {
    const res = results[index];
    const title = index === 0 ? "Status Quo" : `Scenario ${index}`;
    const deltaText =
      res?.absChange !== null && res?.absChange !== undefined && res?.relChange !== null
        ? `${res.absChange >= 0 ? "+" : ""}${formatMaybe(res.absChange)} ${currency} (${res.relChange.toFixed(2)}%)`
        : "—";
    const tone =
      res?.absChange === null || res?.absChange === undefined
        ? "neutral"
        : res.absChange >= 0
          ? "positive"
          : "negative";

    return {
      title,
      value: res?.fairValue !== null && res?.fairValue !== undefined
        ? formatCurrency(res.fairValue, currency)
        : "—",
      delta: deltaText,
      deltaTone: tone as "positive" | "negative" | "neutral",
    };
  });

  const selectionRow = (
    <PositionSelect
      options={positionOptions}
      selectedId={selectedId}
      onSelect={setSelectedId}
      searchValue={search}
      onSearchChange={setSearch}
    />
  );

  const isEmpty = !selectedInstrument;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-background-light dark:bg-background-dark p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {isEmpty ? (
          <>
            <AssetLookupHero
              lookupValue={lookupValue}
              onLookupValueChange={setLookupValue}
              onLookup={handleLookup}
              loading={lookupLoading}
              positionSelect={selectionRow}
            />
            <ScenarioComparisonTable
              scenarios={scenarios}
              onScenarioChange={updateScenario}
              disabled
            />
            {error ? (
              <div className="rounded-lg border border-red-200/70 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                    Optionsschein-Rechner
                  </h1>
                  <p className="text-sm text-slate-500">
                    Professional warrant valuation and scenario analysis tool based on Black-Scholes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200/70 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  Export PDF
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  {selectionRow}
                  <div className="mt-4 rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    {selectedInstrument.kind === "position" ? (
                      <span>
                        {selectedInstrument.data.isin} · {selectedInstrument.data.projectName} · {selectedInstrument.data.side.toUpperCase()}
                      </span>
                    ) : (
                      <span>
                        {selectedInstrument.data.name ?? selectedInstrument.data.isin} · {selectedInstrument.data.type.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 grid gap-2">
                    <label className="text-xs font-bold uppercase text-slate-500">ISIN Lookup</label>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2">
                      <span className="material-symbols-outlined text-base text-slate-400">search</span>
                      <input
                        value={lookupValue}
                        onChange={(event) => setLookupValue(event.target.value)}
                        placeholder="DE000… or Asset Name"
                        className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleLookup}
                        className="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
                      >
                        Lookup
                      </button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="text-xs font-bold uppercase text-slate-500">Referenzkurs</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={manualReference}
                      onChange={(event) =>
                        setManualReference(
                          event.target.value === "" ? "" : Number(event.target.value)
                        )
                      }
                      placeholder="Pflicht falls leer"
                      className="mt-2 w-full rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
                    />
                  </div>
                </div>

                <KpiTilesRow tiles={kpiTiles} details={details} />
              </div>

              {warning ? (
                <div className="rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {warning}
                </div>
              ) : null}
              {error ? (
                <div className="rounded-lg border border-red-200/70 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              ) : null}
              <div className="rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Referenzkurs: {referenceDisplay === null ? "—" : referenceDisplay.toFixed(4)}
              </div>
            </div>

            <ScenarioComparisonTable
              scenarios={scenarios}
              onScenarioChange={updateScenario}
              onLoadCurrent={handleLoadCurrent}
              disabled={false}
            />

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleCalculate}
                disabled={!selectedInstrument || loading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-base">calculate</span>
                {loading ? "Berechnung..." : "Fairen Wert berechnen"}
              </button>
            </div>

            <ResultsCards cards={resultCards} />

            <InfoCallout
              title="Hinweis zur Berechnung"
              description="Die Berechnungen basieren auf dem Black-Scholes-Modell. Historische Volatilitaeten koennen von zukuenftigen Marktschwankungen abweichen. Bitte beachten Sie den Zeitwertverlust (Theta), der bei laengeren Zeitraeumen in den Szenarien erheblich ins Gewicht faellt."
            />
          </>
        )}
      </div>
    </div>
  );
}
