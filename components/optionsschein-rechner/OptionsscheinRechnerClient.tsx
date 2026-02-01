
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Highcharts from "highcharts";

import { InfoCallout } from "@/components/optionsschein-rechner/InfoCallout";
import { KpiTilesRow } from "@/components/optionsschein-rechner/KpiTilesRow";

const scenarioLimit = 5;

type PositionItem = {
  id: string;
  projectId: string | null;
  projectName: string;
  baseCurrency: string;
  currency?: string;
  projectLogoUrl?: string | null;
  projectUnderlyingName?: string | null;
  name?: string;
  isin: string;
  side: "put" | "call";
  size: number;
  entryPrice: number;
  pricingMode: "market" | "model";
  underlyingSymbol?: string;
  strike?: number;
  expiry?: string;
  ratio?: number;
  underlyingPrice?: number;
  volatility?: number;
  rate?: number;
  dividendYield?: number;
  marketPrice?: number;
  computed?: {
    fairValue: number;
    intrinsicValue: number;
    timeValue: number;
    breakEven?: number | null;
    agio?: {
      absolute?: number | null;
      percent?: number | null;
    };
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    omega?: number | null;
    iv?: number;
    asOf: string;
  };
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

type BaseInputs = {
  underlyingPrice: number | "";
  volatilityPct: number | "";
  ratePct: number | "";
  dividendYieldPct: number | "";
  fxRate: number | "";
  valuationDate: string;
};

type ScenarioRow = {
  id: string;
  name: string;
  changePct: number | "";
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
  issuer?: string;
  type: "call" | "put";
  underlyingName?: string;
  strike: number;
  expiry: string;
  currency: string;
  ratio?: number;
  underlying?: string;
  settlementType?: "cash" | "physical";
  multiplier?: number;
  price?: number;
  bid?: number;
  ask?: number;
  underlyingPrice?: number;
  volatility?: number;
  rate?: number;
  dividendYield?: number;
  fxRate?: number;
  valuationDate?: string;
  computed?: PositionItem["computed"];
};

type ProjectSummary = {
  id: string;
  name: string;
  baseCurrency?: string;
};

type ProjectsResponse = {
  projects: ProjectSummary[];
};

type OptionsscheinRechnerClientProps = {
  initialInstrumentId?: string;
};

type TimeValuePoint = {
  date: string;
  fairValue: number | null;
  intrinsicValue: number | null;
  timeValue: number | null;
};

function createScenarioId() {
  return `scenario-${Math.random().toString(36).slice(2, 10)}`;
}

function createBaseInputs(): BaseInputs {
  const today = new Date().toISOString().slice(0, 10);
  return {
    underlyingPrice: "",
    volatilityPct: "",
    ratePct: "",
    dividendYieldPct: "",
    fxRate: "",
    valuationDate: today,
  };
}

function createBaselineScenario(): ScenarioRow {
  return { id: createScenarioId(), name: "Status Quo", changePct: 0 };
}

function createScenarioRow(index: number): ScenarioRow {
  return { id: createScenarioId(), name: `Scenario ${index}`, changePct: 5 };
}

function formatMaybe(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return "—";
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function formatPercent(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return "—";
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

function formatCurrency(value: number | null | undefined, currency: string) {
  if (value === null || value === undefined) return "—";
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(2)} ${currency}`;
}

function buildCurveDates(startDate: string, endDate: string, points = 6) {
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
  if (end <= start) return [startDate];
  const steps = Math.max(2, points);
  const stepMs = (end - start) / (steps - 1);
  const dates = Array.from({ length: steps }, (_, index) => {
    const date = new Date(start + stepMs * index);
    return date.toISOString().slice(0, 10);
  });
  return Array.from(new Set(dates));
}

function withMassiveProxy(url: string) {
  try {
    return `/api/massive/logo?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}

export function OptionsscheinRechnerClient({ initialInstrumentId }: OptionsscheinRechnerClientProps) {
  const router = useRouter();

  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [positionsLoaded, setPositionsLoaded] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [search, setSearch] = useState("");
  const [selectedInstrument, setSelectedInstrument] = useState<SelectedInstrument | null>(null);
  const [lookupValue, setLookupValue] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [baseInputs, setBaseInputs] = useState<BaseInputs>(() => createBaseInputs());
  const [scenarios, setScenarios] = useState<ScenarioRow[]>(() => [createBaselineScenario()]);
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [referencePrice, setReferencePrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [projectSelection, setProjectSelection] = useState("");
  const [entryPrice, setEntryPrice] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [timeValuePoints, setTimeValuePoints] = useState<TimeValuePoint[]>([]);
  const [timeValueLoading, setTimeValueLoading] = useState(false);
  const [timeValueError, setTimeValueError] = useState<string | null>(null);
  const timeValueChartRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<Highcharts.Chart | null>(null);
  const [initialPending, setInitialPending] = useState(Boolean(initialInstrumentId));
  const positionLookupRef = useRef<Record<string, boolean>>({});

  const filteredPositions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return positions;
    return positions.filter((position) => {
      const text = `${position.isin} ${position.projectName} ${position.side} ${position.name ?? ""}`.toLowerCase();
      return text.includes(query);
    });
  }, [positions, search]);

  const isinProjectMatches = useMemo(() => {
    if (selectedInstrument?.kind !== "lookup") return [];
    const isin = selectedInstrument.data.isin.trim().toUpperCase();
    if (!isin) return [];
    return positions.filter(
      (position) =>
        position.projectId &&
        position.isin.trim().toUpperCase() === isin
    );
  }, [positions, selectedInstrument]);

  const statusQuoResult = results[0] ?? null;
  const positionComputed =
    selectedInstrument?.kind === "position" ? selectedInstrument.data.computed ?? null : null;
  const currency =
    statusQuoResult?.currency ??
    (selectedInstrument?.kind === "position"
      ? selectedInstrument.data.currency ?? selectedInstrument.data.baseCurrency
      : selectedInstrument?.kind === "lookup"
        ? selectedInstrument.data.currency
        : "EUR");

  const referenceDisplay =
    referencePrice ??
    (selectedInstrument?.kind === "position"
      ? selectedInstrument.data.marketPrice ?? selectedInstrument.data.computed?.fairValue ?? null
      : selectedInstrument?.kind === "lookup"
        ? selectedInstrument.data.price ?? null
        : null);

  const baseUnderlying = baseInputs.underlyingPrice === "" ? null : Number(baseInputs.underlyingPrice);
  const baseRate = baseInputs.ratePct === "" ? null : Number(baseInputs.ratePct) / 100;
  const baseVol = baseInputs.volatilityPct === "" ? null : Number(baseInputs.volatilityPct) / 100;
  const baseDividend = baseInputs.dividendYieldPct === "" ? null : Number(baseInputs.dividendYieldPct) / 100;
  const baseFx = baseInputs.fxRate === "" ? null : Number(baseInputs.fxRate);
  const expiryDate =
    selectedInstrument?.kind === "position"
      ? selectedInstrument.data.expiry ?? null
      : selectedInstrument?.kind === "lookup"
        ? selectedInstrument.data.expiry
        : null;
  const premiumFallback = useMemo(() => {
    const breakEven =
      statusQuoResult?.breakEven ??
      positionComputed?.breakEven ??
      null;
    const underlying =
      baseUnderlying ??
      (selectedInstrument?.kind === "position"
        ? selectedInstrument.data.underlyingPrice ?? null
        : null);
    if (!breakEven || !underlying || !Number.isFinite(breakEven) || !Number.isFinite(underlying)) {
      return null;
    }
    if (underlying <= 0) return null;
    return (breakEven - underlying) / underlying;
  }, [baseUnderlying, positionComputed?.breakEven, selectedInstrument, statusQuoResult?.breakEven]);

  const metricsSections = [
    {
      title: "Contract & Market",
      items: [
        {
          label: "Strike",
          value: selectedInstrument
            ? formatMaybe(
                selectedInstrument.kind === "position"
                  ? selectedInstrument.data.strike
                  : selectedInstrument.data.strike
              )
            : "—",
        },
        {
          label: "Premium",
          value:
            statusQuoResult?.premium !== null && statusQuoResult?.premium !== undefined
              ? formatPercent(statusQuoResult.premium * 100)
              : positionComputed?.agio?.percent !== null &&
                  positionComputed?.agio?.percent !== undefined
                ? formatPercent(positionComputed.agio.percent)
                : premiumFallback !== null
                  ? formatPercent(premiumFallback * 100)
                  : "—",
        },
        {
          label: "Break-even",
          value:
            statusQuoResult?.breakEven !== null && statusQuoResult?.breakEven !== undefined
              ? formatMaybe(statusQuoResult.breakEven)
              : positionComputed?.breakEven !== null && positionComputed?.breakEven !== undefined
                ? formatMaybe(positionComputed.breakEven)
                : "—",
        },
        {
          label: "Implied volatility",
          value:
            statusQuoResult?.impliedVolatilityUsed !== null &&
            statusQuoResult?.impliedVolatilityUsed !== undefined
              ? formatPercent(statusQuoResult.impliedVolatilityUsed * 100)
              : baseInputs.volatilityPct !== ""
                ? formatPercent(Number(baseInputs.volatilityPct))
                : "—",
        },
        { label: "Valuation date", value: baseInputs.valuationDate || "—" },
      ],
    },
    {
      title: "Valuation",
      items: [
        {
          label: "Fair value",
          value: formatCurrency(statusQuoResult?.fairValue ?? positionComputed?.fairValue ?? null, currency),
        },
        {
          label: "Intrinsic value",
          value: formatCurrency(
            statusQuoResult?.intrinsicValue ?? positionComputed?.intrinsicValue ?? null,
            currency
          ),
        },
        {
          label: "Time value",
          value: formatCurrency(statusQuoResult?.timeValue ?? positionComputed?.timeValue ?? null, currency),
        },
      ],
    },
    {
      title: "Greeks",
      items: [
        { label: "Delta", value: formatMaybe(statusQuoResult?.delta ?? positionComputed?.delta, 4) },
        { label: "Gamma", value: formatMaybe(statusQuoResult?.gamma ?? positionComputed?.gamma, 4) },
        { label: "Theta", value: formatMaybe(statusQuoResult?.theta ?? positionComputed?.theta, 4) },
        { label: "Vega", value: formatMaybe(statusQuoResult?.vega ?? positionComputed?.vega, 4) },
        { label: "Omega", value: formatMaybe(statusQuoResult?.omega ?? positionComputed?.omega, 4) },
      ],
    },
  ];

  const missingInputs = useMemo(() => {
    if (!selectedInstrument) return [];
    const missing: string[] = [];
    if (baseInputs.underlyingPrice === "") missing.push("Underlying price");
    if (baseInputs.volatilityPct === "") missing.push("Volatility");
    if (baseInputs.ratePct === "") missing.push("Rate");
    if (!baseInputs.valuationDate) missing.push("Valuation date");
    return missing;
  }, [baseInputs, selectedInstrument]);

  const canCalculate = Boolean(selectedInstrument);

  const canSaveProjectModel =
    selectedInstrument?.kind === "position" &&
    Boolean(selectedInstrument.data.projectId) &&
    baseUnderlying !== null &&
    baseVol !== null &&
    baseRate !== null &&
    selectedInstrument.data.strike &&
    selectedInstrument.data.expiry;

  const canAddToProject =
    selectedInstrument?.kind === "lookup" &&
    projectSelection &&
    entryPrice !== "" &&
    quantity !== "" &&
    baseUnderlying !== null &&
    baseVol !== null &&
    baseRate !== null;

  const resetScenarios = useCallback(() => {
    setScenarios([createBaselineScenario()]);
  }, []);

  const hydrateInputs = useCallback(
    (instrument: SelectedInstrument, overrideInputs?: Partial<BaseInputs>) => {
      const today = new Date().toISOString().slice(0, 10);

      if (instrument.kind === "position") {
        const base = instrument.data;
        setBaseInputs({
          underlyingPrice: base.underlyingPrice ?? "",
          ratePct: base.rate !== undefined ? Number((base.rate * 100).toFixed(4)) : "",
          volatilityPct:
            base.volatility !== undefined ? Number((base.volatility * 100).toFixed(4)) : "",
          dividendYieldPct:
            base.dividendYield !== undefined ? Number((base.dividendYield * 100).toFixed(4)) : "",
          fxRate: "",
          valuationDate: base.computed?.asOf?.slice(0, 10) ?? today,
        });
      } else {
        setBaseInputs({
          underlyingPrice: "",
          ratePct: "",
          volatilityPct: "",
          dividendYieldPct: "",
          fxRate: "",
          valuationDate: today,
          ...overrideInputs,
        });
      }

      resetScenarios();
      setResults([]);
      setReferencePrice(null);
      setError(null);
      setSaveMessage(null);
      setWarning(null);
      setEntryPrice("");
      setQuantity("");
      setProjectSelection("");
    },
    [resetScenarios]
  );

  async function loadPositions() {
    setError(null);
    try {
      const response = await fetch("/api/optionsschein/positions");
      const data = (await response.json().catch(() => null)) as PositionListResponse | null;

      if (!response.ok || !data) {
        throw new Error("Positions could not be loaded.");
      }

      setPositions(data.positions ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Positions could not be loaded.";
      setError(message);
    } finally {
      setPositionsLoaded(true);
    }
  }

  async function loadProjects() {
    try {
      const response = await fetch("/api/projects");
      const data = (await response.json().catch(() => null)) as ProjectsResponse | null;
      if (!response.ok || !data) return;
      setProjects(data.projects ?? []);
    } catch {
      setProjects([]);
    }
  }

  async function performLookup(isin: string, options?: { skipNav?: boolean }) {
    setLookupLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/isin/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isin }),
      });
      const payload = (await response.json().catch(() => null)) as
        | LookupResponse
        | { error?: string }
        | null;

      if (!response.ok || !payload || "error" in payload) {
        throw new Error("ISIN lookup fehlgeschlagen.");
      }

      if (!("isin" in payload)) {
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
      const lookupInputs: Partial<BaseInputs> = {
        underlyingPrice:
          payload.underlyingPrice === null || payload.underlyingPrice === undefined
            ? ""
            : Number(payload.underlyingPrice),
        ratePct:
          payload.rate === null || payload.rate === undefined
            ? ""
            : Number((payload.rate * 100).toFixed(4)),
        volatilityPct:
          payload.volatility === null || payload.volatility === undefined
            ? ""
            : Number((payload.volatility * 100).toFixed(4)),
        dividendYieldPct:
          payload.dividendYield === null || payload.dividendYield === undefined
            ? ""
            : Number((payload.dividendYield * 100).toFixed(4)),
        fxRate:
          payload.fxRate === null || payload.fxRate === undefined ? "" : Number(payload.fxRate),
        valuationDate: payload.valuationDate ?? undefined,
      };
      hydrateInputs({ kind: "lookup", data: instrument }, lookupInputs);
      if (!options?.skipNav) {
        router.push(`/analysis/optionsschein-rechner/${encodeURIComponent(instrument.isin)}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "ISIN lookup fehlgeschlagen.";
      setError(message);
    } finally {
      setLookupLoading(false);
    }
  }

  function handlePositionSelect(position: PositionItem, options?: { skipNav?: boolean }) {
    setSelectedInstrument({ kind: "position", data: position });
    hydrateInputs({ kind: "position", data: position });
    void hydratePositionFromLookup(position);
    if (!options?.skipNav) {
      router.push(`/analysis/optionsschein-rechner/${position.id}`);
    }
  }

  async function hydratePositionFromLookup(position: PositionItem) {
    if (!position.isin) return;
    if (positionLookupRef.current[position.id]) return;
    const needsLookup =
      position.strike === undefined ||
      position.expiry === undefined ||
      position.underlyingPrice === undefined ||
      position.volatility === undefined ||
      position.rate === undefined;
    if (!needsLookup) return;

    positionLookupRef.current[position.id] = true;
    try {
      const response = await fetch("/api/isin/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isin: position.isin }),
      });
      const payload = (await response.json().catch(() => null)) as
        | LookupResponse
        | { error?: string }
        | null;
      if (!response.ok || !payload || "error" in payload || !("isin" in payload)) {
        return;
      }

      const mergedComputed = (() => {
        if (!position.computed) return payload.computed ?? undefined;
        if (!payload.computed) return position.computed;
        return {
          ...payload.computed,
          ...position.computed,
          fairValue: position.computed.fairValue ?? payload.computed.fairValue,
          intrinsicValue: position.computed.intrinsicValue ?? payload.computed.intrinsicValue,
          timeValue: position.computed.timeValue ?? payload.computed.timeValue,
          breakEven: position.computed.breakEven ?? payload.computed.breakEven,
          delta: position.computed.delta ?? payload.computed.delta,
          gamma: position.computed.gamma ?? payload.computed.gamma,
          theta: position.computed.theta ?? payload.computed.theta,
          vega: position.computed.vega ?? payload.computed.vega,
          omega: position.computed.omega ?? payload.computed.omega,
          iv: position.computed.iv ?? payload.computed.iv,
          agio: position.computed.agio ?? payload.computed.agio,
          asOf: position.computed.asOf ?? payload.computed.asOf,
        };
      })();

      const merged: PositionItem = {
        ...position,
        name: position.name ?? payload.name,
        strike: position.strike ?? payload.strike,
        expiry: position.expiry ?? payload.expiry,
        ratio: position.ratio ?? payload.ratio,
        underlyingSymbol: position.underlyingSymbol ?? payload.underlying,
        marketPrice: position.marketPrice ?? payload.price,
        underlyingPrice: position.underlyingPrice ?? payload.underlyingPrice,
        volatility: position.volatility ?? payload.volatility,
        rate: position.rate ?? payload.rate,
        dividendYield: position.dividendYield ?? payload.dividendYield,
        computed: mergedComputed,
      };

      setSelectedInstrument((current) => {
        if (!current || current.kind !== "position") return current;
        if (current.data.id !== position.id) return current;
        return { kind: "position", data: merged };
      });

      setBaseInputs((prev) => {
        const shouldReplaceNumber = (value: number | "") =>
          value === "" || !Number.isFinite(Number(value)) || Number(value) <= 0;
        const nextUnderlying =
          shouldReplaceNumber(prev.underlyingPrice) && payload.underlyingPrice !== undefined
            ? Number(payload.underlyingPrice)
            : prev.underlyingPrice;
        const nextVol =
          shouldReplaceNumber(prev.volatilityPct) && payload.volatility !== undefined
            ? Number((payload.volatility * 100).toFixed(4))
            : prev.volatilityPct;
        const nextFx =
          shouldReplaceNumber(prev.fxRate) && payload.fxRate !== undefined
            ? Number(payload.fxRate)
            : prev.fxRate;

        return {
          ...prev,
          underlyingPrice: nextUnderlying,
          ratePct:
            prev.ratePct === "" && payload.rate !== undefined
              ? Number((payload.rate * 100).toFixed(4))
              : prev.ratePct,
          volatilityPct: nextVol,
          dividendYieldPct:
            prev.dividendYieldPct === "" && payload.dividendYield !== undefined
              ? Number((payload.dividendYield * 100).toFixed(4))
              : prev.dividendYieldPct,
          fxRate: nextFx,
          valuationDate: prev.valuationDate || payload.valuationDate || prev.valuationDate,
        };
      });
    } catch {
      // Ignore lookup failures; position remains as-is.
    }
  }

  async function handleLookup() {
    if (!lookupValue.trim()) return;
    await performLookup(lookupValue.trim());
  }

  const handleCalculate = useCallback(async () => {
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
        scenarios: scenarios.map((scenario, index) => {
          const changePct = index === 0 ? 0 : scenario.changePct === "" ? 0 : Number(scenario.changePct);
          const underlyingPrice =
            baseUnderlying !== null ? Number((baseUnderlying * (1 + changePct / 100)).toFixed(6)) : undefined;

          return {
            underlyingPrice,
            rate: baseRate ?? undefined,
            volatility: baseVol ?? undefined,
            dividendYield: baseDividend ?? undefined,
            fxRate: baseFx ?? undefined,
            valuationDate: baseInputs.valuationDate || undefined,
          };
        }),
      };

      const response = await fetch("/api/optionsschein/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as CalculateResponse | { error?: string } | null;

      if (!response.ok || !data || "error" in data) {
        throw new Error((data && "error" in data && data.error) || "Calculation failed.");
      }

      if (!("referencePrice" in data)) {
        throw new Error("Calculation failed.");
      }

      setReferencePrice(data.referencePrice ?? null);
      setResults(data.results ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Calculation failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [baseDividend, baseFx, baseInputs.valuationDate, baseRate, baseUnderlying, baseVol, scenarios, selectedInstrument]);

  async function handleSaveModelInputs() {
    if (selectedInstrument?.kind !== "position") return;
    if (!canSaveProjectModel) return;
    if (!selectedInstrument.data.projectId) return;

    setSaving(true);
    setSaveMessage(null);
    setError(null);

    try {
      const payload = {
        pricingMode: "model",
        underlyingPrice: baseUnderlying ?? undefined,
        volatility: baseVol ?? undefined,
        rate: baseRate ?? undefined,
        dividendYield: baseDividend ?? undefined,
      };

      const response = await fetch(
        `/api/projects/${selectedInstrument.data.projectId}/positions/${selectedInstrument.data.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = (await response.json().catch(() => null)) as
        | { position?: PositionItem; error?: string }
        | null;

      if (!response.ok || !data || data.error) {
        throw new Error(data?.error ?? "Save failed.");
      }

      if (data.position) {
        const nextPosition: PositionItem = {
          ...data.position,
          projectId: selectedInstrument.data.projectId,
          projectName: selectedInstrument.data.projectName,
          baseCurrency: selectedInstrument.data.baseCurrency,
        };
        setSelectedInstrument({ kind: "position", data: nextPosition });
        setPositions((prev) => prev.map((item) => (item.id === nextPosition.id ? nextPosition : item)));
      }

      setSaveMessage("Modelldaten wurden gespeichert.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddToProject() {
    if (selectedInstrument?.kind !== "lookup") return;
    if (!canAddToProject) return;

    setSaving(true);
    setSaveMessage(null);
    setError(null);

    try {
      const payload = {
        name: selectedInstrument.data.name ?? selectedInstrument.data.isin,
        isin: selectedInstrument.data.isin,
        side: selectedInstrument.data.type,
        size: Number(quantity),
        entryPrice: Number(entryPrice),
        pricingMode: "model",
        underlyingSymbol: selectedInstrument.data.underlyingSymbol,
        underlyingPrice: baseUnderlying ?? undefined,
        strike: selectedInstrument.data.strike,
        expiry: selectedInstrument.data.expiry,
        volatility: baseVol ?? undefined,
        rate: baseRate ?? undefined,
        dividendYield: baseDividend ?? undefined,
        ratio: selectedInstrument.data.ratio,
        marketPrice: selectedInstrument.data.price,
      };

      const response = await fetch(`/api/projects/${projectSelection}/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as
        | { position?: PositionItem; error?: string }
        | null;

      if (!response.ok || !data || data.error) {
        throw new Error(data?.error ?? "Save failed.");
      }

      const projectMeta = projects.find((project) => project.id === projectSelection);
      const nextPosition: PositionItem = {
        ...(data.position as PositionItem),
        projectId: projectSelection,
        projectName: projectMeta?.name ?? "Project",
        baseCurrency: projectMeta?.baseCurrency ?? "EUR",
      };

      setPositions((prev) => [nextPosition, ...prev]);
      setSelectedInstrument({ kind: "position", data: nextPosition });
      router.push(`/analysis/optionsschein-rechner/${nextPosition.id}`);
      setSaveMessage("Position added to the project.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function updateBaseInput(field: keyof BaseInputs, value: BaseInputs[keyof BaseInputs]) {
    setBaseInputs((prev) => ({ ...prev, [field]: value }));
  }

  function updateScenario(id: string, field: "name" | "changePct", value: string | number | "") {
    setScenarios((prev) =>
      prev.map((scenario) => (scenario.id === id ? { ...scenario, [field]: value } : scenario))
    );
  }

  function handleRemoveScenario(id: string) {
    setScenarios((prev) =>
      prev.filter((scenario, index) => (index === 0 ? true : scenario.id !== id))
    );
  }

  function handleAddScenario() {
    setScenarios((prev) => {
      if (prev.length >= scenarioLimit) return prev;
      return [...prev, createScenarioRow(prev.length)];
    });
  }

  function handleResetSelection() {
    setSelectedInstrument(null);
    setResults([]);
    setReferencePrice(null);
    setError(null);
    setWarning(null);
    setSaveMessage(null);
    setLookupValue("");
    setSearch("");
    setBaseInputs(createBaseInputs());
    resetScenarios();
    router.push("/analysis/optionsschein-rechner");
  }

  useEffect(() => {
    void loadPositions();
  }, []);

  useEffect(() => {
    if (selectedInstrument?.kind === "lookup" && projects.length === 0) {
      void loadProjects();
    }
  }, [projects.length, selectedInstrument]);

  useEffect(() => {
    if (!initialInstrumentId || selectedInstrument) return;
    const isIsin = /^[A-Z0-9]{12}$/i.test(initialInstrumentId);
    const match = positions.find((position) => position.id === initialInstrumentId);
    if (match) {
      handlePositionSelect(match, { skipNav: true });
      setInitialPending(false);
      return;
    }
    if (!positionsLoaded && !isIsin) return;
    if (isIsin) {
      setLookupValue(initialInstrumentId);
      void (async () => {
        await performLookup(initialInstrumentId, { skipNav: true });
        setInitialPending(false);
      })();
    }
  }, [initialInstrumentId, positions, positionsLoaded, selectedInstrument]);

  useEffect(() => {
    if (!initialInstrumentId || selectedInstrument) return;
    const isIsin = /^[A-Z0-9]{12}$/i.test(initialInstrumentId);
    if (isIsin || !positionsLoaded) return;
    const match = positions.find((position) => position.id === initialInstrumentId);
    if (!match) {
      setError("Warrant could not be loaded.");
      setInitialPending(false);
    }
  }, [initialInstrumentId, positions, positionsLoaded, selectedInstrument]);

  useEffect(() => {
    if (!selectedInstrument) {
      setWarning(null);
      return;
    }

    if (selectedInstrument.kind === "position") {
      const position = selectedInstrument.data;
      const missing = [!position.strike && "Strike", !position.expiry && "Expiry", !position.ratio && "Ratio"].filter(Boolean);

      setWarning(missing.length ? `Missing base data: ${missing.join(", ")}.` : null);
    } else {
      setWarning(null);
    }
  }, [selectedInstrument]);

  useEffect(() => {
    if (!canCalculate) return;
    const handle = window.setTimeout(() => {
      void handleCalculate();
    }, 450);

    return () => window.clearTimeout(handle);
  }, [baseInputs, canCalculate, handleCalculate, scenarios]);

  useEffect(() => {
    if (!timeValueChartRef.current) return;
    if (timeValuePoints.length === 0) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      return;
    }

    const categories = timeValuePoints.map((point) => point.date);
    const timeValueSeries = timeValuePoints.map((point) => point.timeValue);
    const fairValueSeries = timeValuePoints.map((point) => point.fairValue);
    const intrinsicSeries = timeValuePoints.map((point) => point.intrinsicValue);

    const options: Highcharts.Options = {
      chart: {
        type: "line",
        backgroundColor: "transparent",
        height: 260,
        spacing: [10, 10, 10, 10],
      },
      title: { text: undefined },
      xAxis: {
        categories,
        tickmarkPlacement: "on",
        lineColor: "#cbd5f5",
        labels: { style: { color: "#64748b", fontSize: "11px" } },
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: "rgba(148, 163, 184, 0.2)",
        labels: { style: { color: "#64748b", fontSize: "11px" } },
      },
      legend: {
        itemStyle: { color: "#64748b", fontSize: "11px" },
        itemHoverStyle: { color: "#0f172a" },
      },
      tooltip: {
        shared: true,
        valueDecimals: 2,
        valueSuffix: ` ${currency}`,
      },
      series: [
        {
          type: "line",
          name: "Time value",
          data: timeValueSeries,
          color: "#0f172a",
          lineWidth: 2,
        },
        {
          type: "line",
          name: "Fairer Wert",
          data: fairValueSeries,
          color: "#2563eb",
          dashStyle: "ShortDash",
        },
        {
          type: "line",
          name: "Intrinsisch",
          data: intrinsicSeries,
          color: "#16a34a",
          dashStyle: "Dot",
        },
      ],
      credits: { enabled: false },
    };

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = Highcharts.chart(timeValueChartRef.current, options);
    } else {
      chartInstanceRef.current.update(options, true, true);
    }
  }, [currency, timeValuePoints]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedInstrument) {
      setTimeValuePoints([]);
      setTimeValueError(null);
      return;
    }
    if (!expiryDate || !baseInputs.valuationDate) {
      setTimeValuePoints([]);
      setTimeValueError(null);
      return;
    }
    if (baseUnderlying === null || baseVol === null || baseRate === null) {
      setTimeValuePoints([]);
      setTimeValueError(null);
      return;
    }

    const dates = buildCurveDates(baseInputs.valuationDate, expiryDate, 6);
    if (dates.length === 0) {
      setTimeValuePoints([]);
      setTimeValueError("Invalid time series data.");
      return;
    }
    if (Date.parse(expiryDate) <= Date.parse(baseInputs.valuationDate)) {
      setTimeValuePoints([]);
      setTimeValueError("Expiry is before the valuation date.");
      return;
    }

    const handle = window.setTimeout(async () => {
      setTimeValueLoading(true);
      setTimeValueError(null);
      try {
        const payload = {
          positionId:
            selectedInstrument.kind === "position" ? selectedInstrument.data.id : undefined,
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
          scenarios: dates.map((date) => ({
            underlyingPrice: baseUnderlying,
            rate: baseRate ?? undefined,
            volatility: baseVol ?? undefined,
            dividendYield: baseDividend ?? undefined,
            fxRate: baseFx ?? undefined,
            valuationDate: date,
          })),
        };

        const response = await fetch("/api/optionsschein/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = (await response.json().catch(() => null)) as
          | CalculateResponse
          | { error?: string }
          | null;

        if (!response.ok || !data || "error" in data) {
          throw new Error(
            (data && "error" in data && data.error) || "Time value simulation failed."
          );
        }

        if (!("results" in data)) {
          throw new Error("Time value simulation failed.");
        }

        const points = data.results.map((result, index) => ({
          date: dates[index] ?? baseInputs.valuationDate,
          fairValue: result.fairValue ?? null,
          intrinsicValue: result.intrinsicValue ?? null,
          timeValue: result.timeValue ?? null,
        }));

        setTimeValuePoints(points);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Time value simulation failed.";
        setTimeValueError(message);
      } finally {
        setTimeValueLoading(false);
      }
    }, 600);

    return () => window.clearTimeout(handle);
  }, [
    baseDividend,
    baseFx,
    baseInputs.valuationDate,
    baseRate,
    baseUnderlying,
    baseVol,
    expiryDate,
    selectedInstrument,
  ]);
  const isResolvingInitial = initialPending && !selectedInstrument;

  if (!selectedInstrument) {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar bg-background-light dark:bg-background-dark p-4 sm:p-6 lg:p-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Warrant Calculator
            </h1>
            <p className="text-sm text-slate-500">
              Scenario-based valuation of warrants with Greeks, break-even, and price response.
            </p>
          </div>

          {isResolvingInitial ? (
            <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="material-symbols-outlined text-base">hourglass_empty</span>
                Loading warrant data...
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    Select from project
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select an existing warrant position for analysis.
                  </p>
                </div>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search ISIN or project"
                  className="rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm focus:outline-none"
                />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Project</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">ISIN</th>
                      <th className="px-3 py-2 text-left">Typ</th>
                      <th className="px-3 py-2 text-left">Strike</th>
                      <th className="px-3 py-2 text-left">Expiry</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                    {filteredPositions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-500">
                          No warrant positions found.
                        </td>
                      </tr>
                    ) : (
                      filteredPositions.map((position) => (
                        <tr key={position.id} className="hover:bg-slate-50/70">
                          <td className="px-3 py-3 text-slate-500">{position.projectName}</td>
                          <td className="px-3 py-3 text-slate-700">
                            {position.name ?? "—"}
                          </td>
                          <td className="px-3 py-3 text-slate-700">{position.isin}</td>
                          <td className="px-3 py-3 text-slate-500">
                            {position.side.toUpperCase()}
                          </td>
                          <td className="px-3 py-3 text-slate-500">
                            {position.strike ? position.strike.toFixed(2) : "—"}
                          </td>
                          <td className="px-3 py-3 text-slate-500">{position.expiry ?? "—"}</td>
                          <td className="px-3 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handlePositionSelect(position)}
                              className="rounded-full border border-slate-200/70 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Enter ISIN manually
              </h2>
              <p className="text-xs text-slate-500 mt-2">
                Ad-hoc analysis without a project. Data is not saved.
              </p>
              <div className="mt-4 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <label className="text-xs font-bold uppercase text-slate-500">ISIN</label>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2">
                  <span className="material-symbols-outlined text-base text-slate-400">search</span>
                  <input
                    value={lookupValue}
                    onChange={(event) => setLookupValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleLookup();
                      }
                    }}
                    placeholder="DE000..."
                    className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={lookupLoading}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-base">travel_explore</span>
                  {lookupLoading ? "Searching..." : "Analyze ISIN"}
                </button>
              </div>
            </div>
          </div>
          )}

          {error ? (
            <div className="rounded-lg border border-red-200/70 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-background-light dark:bg-background-dark p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Warrant Calculator
            </h1>
            <p className="text-base text-slate-500 mt-1">
              {selectedInstrument.kind === "position"
                ? selectedInstrument.data.name ?? selectedInstrument.data.isin
                : selectedInstrument.data.name ?? selectedInstrument.data.isin}
            </p>
          </div>
          {selectedInstrument.kind === "position" && selectedInstrument.data.projectId ? (
            <button
              type="button"
              onClick={() => router.push(`/projects/${selectedInstrument.data.projectId}`)}
              className="flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-3 py-2 text-[11px] text-slate-500 hover:border-slate-300 hover:shadow-sm transition"
              aria-label={`Open project ${selectedInstrument.data.projectName}`}
            >
              {selectedInstrument.data.projectLogoUrl ? (
                <img
                  src={withMassiveProxy(selectedInstrument.data.projectLogoUrl)}
                  alt={selectedInstrument.data.projectUnderlyingName ?? selectedInstrument.data.projectName}
                  className="h-6 w-6 rounded-full border border-slate-100 object-contain bg-white"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-semibold">
                  {(selectedInstrument.data.projectUnderlyingName ?? selectedInstrument.data.projectName ?? "OS")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
              <div className="leading-tight text-left">
                <div className="text-[11px] font-semibold text-slate-700">
                  {selectedInstrument.data.projectUnderlyingName ?? selectedInstrument.data.projectName}
                </div>
                <div className="text-[10px] text-slate-400">
                  {selectedInstrument.data.underlyingSymbol ?? selectedInstrument.data.projectName}
                </div>
              </div>
            </button>
          ) : selectedInstrument.kind === "lookup" && isinProjectMatches.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const match = isinProjectMatches[0];
                  if (match) {
                    router.push(`/analysis/optionsschein-rechner/${match.id}`);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm hover:border-slate-300"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                Open position
              </button>
              <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200/70 bg-white px-3 py-2 text-[11px] text-slate-500">
              <span className="uppercase tracking-wider text-[10px] text-slate-400">
                Already in
              </span>
              {isinProjectMatches.map((match) => {
                const logoUrl = match.projectLogoUrl ? withMassiveProxy(match.projectLogoUrl) : null;
                return (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => {
                      if (match.projectId) {
                        router.push(`/projects/${match.projectId}`);
                      }
                    }}
                    className="flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-2 py-1"
                    aria-label={`Open project ${match.projectName}`}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={match.projectUnderlyingName ?? match.projectName}
                        className="h-5 w-5 rounded-full border border-slate-100 object-contain bg-white"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[9px] font-semibold">
                        {(match.projectUnderlyingName ?? match.projectName ?? "OS")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                    <div className="leading-tight text-left">
                      <div className="text-[11px] font-semibold text-slate-700">
                        {match.projectUnderlyingName ?? match.projectName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {match.underlyingSymbol ?? match.projectName}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            </div>
          ) : null}
        </div>
        {loading ? (
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1">
              Calculation running...
            </span>
          </div>
        ) : null}

        <KpiTilesRow sections={metricsSections} />

        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Scenario inputs
              </h3>
              <p className="text-xs text-slate-500">
                Adjust inputs per scenario and compare model outcomes.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCalculate}
              disabled={!canCalculate || loading}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              {loading ? "Calculating..." : "Calculate fair value"}
            </button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[180px_repeat(5,minmax(140px,1fr))] gap-2 text-xs text-slate-500">
                <div />
                {Array.from({ length: scenarioLimit }, (_, index) => {
                  const scenario = scenarios[index];
                  return (
                    <div
                      key={`scenario-header-${index}`}
                      className="flex items-center justify-between rounded-full border border-slate-200/70 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600"
                    >
                      <span>{scenario ? scenario.name : `Scenario ${index + 1}`}</span>
                      {scenario && index > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveScenario(scenario.id)}
                          className="inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700"
                          aria-label={`Remove ${scenario.name}`}
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 grid grid-cols-[180px_repeat(5,minmax(140px,1fr))] gap-2 text-xs text-slate-600">
                <div className="rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-3 font-semibold">
                  Underlying price
                  <div className="mt-1 text-[10px] text-slate-400">
                    Current {formatMaybe(baseUnderlying, 2)}
                  </div>
                </div>
                {Array.from({ length: scenarioLimit }, (_, index) => {
                  const scenario = scenarios[index];
                  const changePct = scenario ? (index === 0 ? 0 : scenario.changePct) : "";
                  return (
                    <div key={`row-underlying-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                      {scenario ? (
                        <input
                          type="number"
                          min={-100}
                          step={0.5}
                          value={index === 0 ? 0 : changePct}
                          onChange={(event) =>
                            updateScenario(
                              scenario.id,
                              "changePct",
                              event.target.value === "" ? "" : Number(event.target.value)
                            )
                          }
                          disabled={index === 0}
                          className="w-full rounded-lg border border-slate-200/70 bg-white px-2 py-1 text-sm text-slate-700 disabled:opacity-60"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={handleAddScenario}
                          disabled={scenarios.length >= scenarioLimit}
                          className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 hover:border-slate-400 disabled:opacity-60"
                        >
                          Add scenario
                        </button>
                      )}
                      <div className="mt-1 text-[10px] text-slate-400">% change</div>
                    </div>
                  );
                })}

                <div className="rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-3 font-semibold">
                  Risk-free rate (%)
                  <div className="mt-1 text-[10px] text-slate-400">
                    Current {formatMaybe(baseRate ? baseRate * 100 : null, 2)}%
                  </div>
                </div>
                {Array.from({ length: scenarioLimit }, (_, index) => (
                  <div key={`row-rate-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={baseInputs.ratePct}
                      onChange={(event) =>
                        updateBaseInput(
                          "ratePct",
                          event.target.value === "" ? "" : Number(event.target.value)
                        )
                      }
                      className="w-full rounded-lg border border-slate-200/70 bg-white px-2 py-1 text-sm text-slate-700"
                    />
                  </div>
                ))}

                <div className="rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-3 font-semibold">
                  Volatility (%)
                  <div className="mt-1 text-[10px] text-slate-400">
                    Current {formatMaybe(baseVol ? baseVol * 100 : null, 2)}%
                  </div>
                </div>
                {Array.from({ length: scenarioLimit }, (_, index) => (
                  <div key={`row-vol-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={baseInputs.volatilityPct}
                      onChange={(event) =>
                        updateBaseInput(
                          "volatilityPct",
                          event.target.value === "" ? "" : Number(event.target.value)
                        )
                      }
                      className="w-full rounded-lg border border-slate-200/70 bg-white px-2 py-1 text-sm text-slate-700"
                    />
                  </div>
                ))}

                <div className="rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-3 font-semibold">
                  FX rate (optional)
                  <div className="mt-1 text-[10px] text-slate-400">
                    Current {formatMaybe(baseFx, 4)}
                  </div>
                </div>
                {Array.from({ length: scenarioLimit }, (_, index) => (
                  <div key={`row-fx-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.0001}
                      value={baseInputs.fxRate}
                      onChange={(event) =>
                        updateBaseInput(
                          "fxRate",
                          event.target.value === "" ? "" : Number(event.target.value)
                        )
                      }
                      className="w-full rounded-lg border border-slate-200/70 bg-white px-2 py-1 text-sm text-slate-700"
                    />
                  </div>
                ))}

                <div className="rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-3 font-semibold">
                  Valuation date
                  <div className="mt-1 text-[10px] text-slate-400">
                    Current {baseInputs.valuationDate || "—"}
                  </div>
                </div>
                {Array.from({ length: scenarioLimit }, (_, index) => (
                  <div key={`row-date-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                    <input
                      type="date"
                      value={baseInputs.valuationDate}
                      onChange={(event) => updateBaseInput("valuationDate", event.target.value)}
                      className="w-full rounded-lg border border-slate-200/70 bg-white px-2 py-1 text-sm text-slate-700"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {missingInputs.length > 0 ? (
            <div className="mt-4 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Missing inputs: {missingInputs.join(", ")}.
            </div>
          ) : null}

          <div className="mt-6 overflow-x-auto">
            <div className="min-w-[860px] rounded-xl border border-slate-200/70 bg-white">
              <div className="grid grid-cols-[180px_repeat(5,minmax(140px,1fr))] border-b border-slate-200/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <div className="px-4 py-3">Result</div>
                {Array.from({ length: scenarioLimit }, (_, index) => (
                  <div key={`result-head-${index}`} className="px-4 py-3">
                    {scenarios[index]?.name ?? `Scenario ${index + 1}`}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[180px_repeat(5,minmax(140px,1fr))] border-b border-slate-200/70 text-sm text-slate-700">
                <div className="px-4 py-3 font-semibold">Fair value</div>
                {Array.from({ length: scenarioLimit }, (_, index) => (
                  <div key={`result-fair-${index}`} className="px-4 py-3">
                    {formatCurrency(results[index]?.fairValue ?? null, currency)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[180px_repeat(5,minmax(140px,1fr))] border-b border-slate-200/70 text-sm text-slate-700">
                <div className="px-4 py-3 font-semibold">Absolute change</div>
                {Array.from({ length: scenarioLimit }, (_, index) => {
                  const value = results[index]?.absChange ?? null;
                  return (
                    <div key={`result-abs-${index}`} className="px-4 py-3">
                      {value === null ? "—" : `${formatMaybe(value)} ${currency}`}
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-[180px_repeat(5,minmax(140px,1fr))] text-sm text-slate-700">
                <div className="px-4 py-3 font-semibold">Relative change</div>
                {Array.from({ length: scenarioLimit }, (_, index) => {
                  const value = results[index]?.relChange ?? null;
                  return (
                    <div key={`result-rel-${index}`} className="px-4 py-3">
                      {value === null ? "—" : `${formatMaybe(value)}%`}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {selectedInstrument.kind === "position" ? (
          <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  Save model values
                </h3>
                <p className="text-xs text-slate-500">
                  Changes are saved to the project and loaded next time.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveModelInputs}
                disabled={!canSaveProjectModel || saving}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-base">save</span>
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Add to project (ad hoc)
              </h3>
              <p className="text-xs text-slate-500">
                Save the analyzed ISIN as a project position (buy-in price &amp; quantity required).
              </p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-xs font-semibold text-slate-500">
                Target project
                <select
                  value={projectSelection}
                  onChange={(event) => setProjectSelection(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900"
                >
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-500">
                Buy-in price
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={entryPrice}
                  onChange={(event) =>
                    setEntryPrice(event.target.value === "" ? "" : Number(event.target.value))
                  }
                  className="mt-2 w-full rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900"
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                Quantity
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(event.target.value === "" ? "" : Number(event.target.value))
                  }
                  className="mt-2 w-full rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900"
                />
              </label>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleAddToProject}
                disabled={!canAddToProject || saving}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-base">library_add</span>
                {saving ? "Saving..." : "Add to project"}
              </button>
            </div>
          </div>
        )}

        {warning ? (
          <div className="rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {warning}
          </div>
        ) : null}
        {saveMessage ? (
          <div className="rounded-lg border border-emerald-200/70 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {saveMessage}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-red-200/70 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Time value until expiry
              </h3>
              <p className="text-xs text-slate-500">
                Time value simulation until {expiryDate ?? "Expiry"}.
              </p>
            </div>
            {timeValueLoading ? (
              <span className="rounded-full border border-slate-200/70 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
                Simulation running...
              </span>
            ) : null}
          </div>

          {timeValueError ? (
            <div className="mt-4 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {timeValueError}
            </div>
          ) : null}

          {timeValuePoints.length === 0 ? (
            <div className="mt-4 rounded-lg border border-slate-200/70 bg-white px-3 py-8 text-center text-xs text-slate-500">
              No time value simulation available.
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-slate-200/70 bg-white p-3">
              <div ref={timeValueChartRef} />
            </div>
          )}
        </div>

        <InfoCallout
          title="Calculation note"
          description="Model values are approximations and may differ from issuer prices. Time value decay (theta) has a stronger impact over longer horizons."
        />
      </div>
    </div>
  );
}
