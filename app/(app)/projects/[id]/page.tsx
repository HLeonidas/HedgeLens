
"use client";

import { Menu, Popover } from "@headlessui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

type Project = {
	id: string;
	name: string;
	description?: string | null;
	underlyingSymbol?: string | null;
	color?: string | null;
	baseCurrency: string;
	riskProfile: "conservative" | "balanced" | "aggressive" | null;
	tickerInfo?: {
		source: "alpha_vantage";
		symbol: string;
		overview: Record<string, string>;
		quote: Record<string, string>;
	} | null;
	tickerFetchedAt?: string | null;
	massiveTickerInfo?: {
		source: "massive";
		symbol: string;
		payload: Record<string, unknown>;
	} | null;
	massiveTickerFetchedAt?: string | null;
	massiveMarketInfo?: {
		source: "massive";
		symbol: string;
		market: "stocks" | "crypto";
		payload: Record<string, unknown>;
	} | null;
	massiveMarketFetchedAt?: string | null;
	massivePrevBarInfo?: {
		source: "massive";
		symbol: string;
		payload: Record<string, unknown>;
	} | null;
	massivePrevBarFetchedAt?: string | null;
	underlyingLastPrice?: number | null;
	underlyingLastPriceUpdatedAt?: string | null;
	underlyingLastPriceSource?: "alpha_quote" | "massive_prev" | "manual" | null;
	underlyingLastPriceCurrency?: string | null;
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
  side: "put" | "call" | "spot";
  currency?: string;
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

type ExchangeRate = {
  from: string;
  to: string;
  rate: number;
  fetchedAt: string;
  source: "alpha_vantage" | "manual";
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
	const [tickerLoading, setTickerLoading] = useState(false);
	const [tickerError, setTickerError] = useState<string | null>(null);
	const [massiveLoading, setMassiveLoading] = useState(false);
	const [massiveError, setMassiveError] = useState<string | null>(null);
  const [showTickerOverview, setShowTickerOverview] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("tickerOverviewOpen");
    return stored === null ? true : stored === "true";
  });
	const [massiveMarketLoading, setMassiveMarketLoading] = useState(false);
	const [massiveMarketError, setMassiveMarketError] = useState<string | null>(null);
	const [massivePrevLoading, setMassivePrevLoading] = useState(false);
	const [massivePrevError, setMassivePrevError] = useState<string | null>(null);
	const [underlyingPriceDraft, setUnderlyingPriceDraft] = useState<number | "">("");
	const [underlyingPriceCurrency, setUnderlyingPriceCurrency] = useState("USD");
	const [underlyingPriceLoading, setUnderlyingPriceLoading] = useState(false);
	const [underlyingPriceError, setUnderlyingPriceError] = useState<string | null>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [fxRates, setFxRates] = useState<Record<string, ExchangeRate>>({});
  const [fxError, setFxError] = useState<string | null>(null);
	const autoPrevRef = useRef(false);
	const autoMassiveRef = useRef(false);
	const [payloadModal, setPayloadModal] = useState<{
		title: string;
		payload: Record<string, unknown> | null;
	} | null>(null);
	const [showRiskScoreModal, setShowRiskScoreModal] = useState(false);
	const [showTickerDetails, setShowTickerDetails] = useState(false);
	const [showTickerModal, setShowTickerModal] = useState(false);
	const [tickerDraft, setTickerDraft] = useState("");
	const [tickerSaveError, setTickerSaveError] = useState<string | null>(null);
	const [tickerSaveLoading, setTickerSaveLoading] = useState(false);
	const [fetchMassiveAfterTicker, setFetchMassiveAfterTicker] = useState(true);
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
  const [positionCurrency, setPositionCurrency] = useState("EUR");
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
  const [positionCreateMode, setPositionCreateMode] = useState<"manual" | "lookup">("lookup");
	const [positionAssetType, setPositionAssetType] = useState<"options" | "spot">("options");
	const [lookupValue, setLookupValue] = useState("");
	const [lookupLoading, setLookupLoading] = useState(false);
	const [lookupError, setLookupError] = useState<string | null>(null);

  const canAdd = useMemo(() => {
    const baseValid = Boolean(isin.trim()) && Number(size) > 0 && entryPrice !== "";
    if (!baseValid) return false;

    if (positionAssetType === "spot") {
      return true;
    }

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
    positionAssetType,
    marketPrice,
    underlyingPrice,
    strike,
    expiry,
    volatilityPct,
    ratePct,
  ]);

  const totalValueBase = useMemo(() => {
    if (!project) return null;
    if (positions.length === 0) return 0;

    let total = 0;
    for (const position of positions) {
      const mode = position.pricingMode ?? "market";
      const displayValue =
        position.side === "spot"
          ? project.underlyingLastPrice ?? position.entryPrice
          : mode === "model"
            ? position.computed?.fairValue
            : position.marketPrice ?? position.entryPrice;
      if (displayValue === undefined) return null;

      const ratio = position.ratio ?? 1;
      const quantity = position.size * ratio;
      const currentValue = displayValue * quantity;

      const entryCurrency = (position.currency ?? project.baseCurrency ?? "EUR").toUpperCase();
      const currentCurrency =
        position.side === "spot"
          ? (
              project.underlyingLastPriceCurrency ??
              project.tickerInfo?.overview?.Currency ??
              project.baseCurrency ??
              entryCurrency
            ).toUpperCase()
          : entryCurrency;

      const converted = convertValue(
        currentValue,
        currentCurrency,
        (project.baseCurrency ?? entryCurrency).toUpperCase()
      );
      if (converted === null) return null;
      total += converted;
    }

    return total;
  }, [positions, project, fxRates]);

  const totalValueUsd = useMemo(() => {
    if (!project || totalValueBase === null) return null;
    const baseCurrency = (project.baseCurrency ?? "EUR").toUpperCase();
    return convertValue(totalValueBase, baseCurrency, "USD");
  }, [project, totalValueBase, fxRates]);

  const totalValueEur = useMemo(() => {
    if (!project || totalValueBase === null) return null;
    const baseCurrency = (project.baseCurrency ?? "EUR").toUpperCase();
    return convertValue(totalValueBase, baseCurrency, "EUR");
  }, [project, totalValueBase, fxRates]);

  const totalEntryBase = useMemo(() => {
    if (!project) return null;
    if (positions.length === 0) return 0;

    let total = 0;
    for (const position of positions) {
      const ratio = position.ratio ?? 1;
      const quantity = position.size * ratio;
      const entryValue = position.entryPrice * quantity;
      const entryCurrency = (position.currency ?? project.baseCurrency ?? "EUR").toUpperCase();
      const converted = convertValue(
        entryValue,
        entryCurrency,
        (project.baseCurrency ?? entryCurrency).toUpperCase()
      );
      if (converted === null) return null;
      total += converted;
    }

    return total;
  }, [positions, project, fxRates]);

  const totalPerformancePct = useMemo(() => {
    if (totalValueBase === null || totalEntryBase === null || totalEntryBase <= 0) return null;
    return (totalValueBase - totalEntryBase) / totalEntryBase;
  }, [totalValueBase, totalEntryBase]);

  const totalPerformanceAbsEur = useMemo(() => {
    if (!project || totalValueBase === null || totalEntryBase === null) return null;
    const baseCurrency = (project.baseCurrency ?? "EUR").toUpperCase();
    return convertValue(totalValueBase - totalEntryBase, baseCurrency, "EUR");
  }, [project, totalValueBase, totalEntryBase, fxRates]);

  const riskScoreDetails = useMemo(() => {
    if (!project) return null;
    let score = 40;

    const overview = project.tickerInfo?.overview ?? {};
    const totalExposure = positions.reduce(
      (sum, position) => sum + position.size * (position.ratio ?? 1),
      0
    );
    const optionsExposure = positions.reduce(
      (sum, position) =>
        position.side === "spot" ? sum : sum + position.size * (position.ratio ?? 1),
      0
    );
    const optionsShare = totalExposure > 0 ? optionsExposure / totalExposure : 0;
    const optionsImpact = optionsShare * 30;
    score += optionsImpact;

    const averageRatio =
      positions.length > 0
        ? positions.reduce((sum, position) => sum + (position.ratio ?? 1), 0) /
          positions.length
        : 1;
    const ratioImpact = averageRatio > 1 ? Math.min((averageRatio - 1) * 10, 10) : 0;
    score += ratioImpact;

    const beta = parseAlphaNumber(overview.Beta);
    const betaImpact =
      beta !== null ? Math.max(-10, Math.min(30, (beta - 1) * 15)) : 0;
    score += betaImpact;

    const marketCap = parseAlphaNumber(overview.MarketCapitalization);
    let marketCapImpact = 0;
    if (marketCap !== null) {
      if (marketCap < 2e9) marketCapImpact = 15;
      else if (marketCap < 1e10) marketCapImpact = 8;
      else if (marketCap < 5e10) marketCapImpact = 3;
    }
    score += marketCapImpact;

    const profitMargin = normalizePercentValue(overview.ProfitMargin);
    let marginImpact = 0;
    if (profitMargin !== null) {
      if (profitMargin < 0) marginImpact = 10;
      else if (profitMargin < 0.05) marginImpact = 5;
      else if (profitMargin > 0.2) marginImpact = -5;
    }
    score += marginImpact;

    const roa = normalizePercentValue(overview.ReturnOnAssetsTTM);
    const roaImpact = roa !== null && roa < 0 ? 6 : 0;
    score += roaImpact;

    const pe = parseAlphaNumber(overview.PERatio ?? overview.TrailingPE);
    let peImpact = 0;
    if (pe === null || pe <= 0) peImpact = 8;
    else if (pe > 60) peImpact = 10;
    else if (pe > 30) peImpact = 5;
    score += peImpact;

    const priceToBook = parseAlphaNumber(overview.PriceToBookRatio);
    let pbImpact = 0;
    if (priceToBook !== null) {
      if (priceToBook > 10) pbImpact = 10;
      else if (priceToBook > 5) pbImpact = 5;
    }
    score += pbImpact;

    const finalScore = Math.max(1, Math.min(100, Math.round(score)));

    return {
      score: finalScore,
      baseScore: 40,
      optionsShare,
      optionsImpact,
      averageRatio,
      ratioImpact,
      beta,
      betaImpact,
      marketCap,
      marketCapImpact,
      profitMargin,
      marginImpact,
      roa,
      roaImpact,
      pe,
      peImpact,
      priceToBook,
      pbImpact,
    };
  }, [project, positions]);

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

	async function handleFetchTickerInfo(type: "overview" | "quote") {
		if (!projectId) return;
		setTickerLoading(true);
		setTickerError(null);
		try {
			const response = await fetch(`/api/projects/${projectId}/ticker`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ type }),
			});
			const payload = (await response.json().catch(() => null)) as
				| {
					tickerInfo?: Project["tickerInfo"];
					fetchedAt?: string;
					underlyingLastPrice?: Project["underlyingLastPrice"];
					underlyingLastPriceUpdatedAt?: Project["underlyingLastPriceUpdatedAt"];
					underlyingLastPriceSource?: Project["underlyingLastPriceSource"];
					underlyingLastPriceCurrency?: Project["underlyingLastPriceCurrency"];
					error?: string;
				}
				| null;

			if (!response.ok || !payload || payload.error) {
				throw new Error(payload?.error ?? "Unable to fetch ticker info");
			}

			if (payload.tickerInfo) {
				setProject((prev) =>
					prev
						? {
							...prev,
							tickerInfo: payload.tickerInfo ?? null,
							tickerFetchedAt: payload.fetchedAt ?? new Date().toISOString(),
							underlyingLastPrice:
								payload.underlyingLastPrice ?? prev.underlyingLastPrice ?? null,
							underlyingLastPriceUpdatedAt:
								payload.underlyingLastPriceUpdatedAt ??
								prev.underlyingLastPriceUpdatedAt ??
								null,
							underlyingLastPriceSource:
								payload.underlyingLastPriceSource ??
								prev.underlyingLastPriceSource ??
								null,
							underlyingLastPriceCurrency:
								payload.underlyingLastPriceCurrency ??
								prev.underlyingLastPriceCurrency ??
								null,
						}
						: prev
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unable to fetch ticker info";
			setTickerError(message);
		} finally {
			setTickerLoading(false);
		}
	}

	async function handleFetchMassiveInfo(
		options?: { symbol?: string; applyMetadata?: boolean }
	) {
		if (!projectId) return;
		setMassiveLoading(true);
		setMassiveError(null);
		try {
			const response = await fetch(`/api/projects/${projectId}/ticker-massive`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ symbol: options?.symbol ?? project?.underlyingSymbol ?? "" }),
			});
			const payload = (await response.json().catch(() => null)) as
				| { tickerInfo?: Project["massiveTickerInfo"]; fetchedAt?: string; error?: string }
				| null;

			if (!response.ok || !payload || payload.error) {
				throw new Error(payload?.error ?? "Unable to fetch Massive data");
			}

			if (payload.tickerInfo) {
				setProject((prev) =>
					prev
						? {
							...prev,
							massiveTickerInfo: payload.tickerInfo ?? null,
							massiveTickerFetchedAt: payload.fetchedAt ?? new Date().toISOString(),
						}
						: prev
				);
				if (options?.applyMetadata) {
					const rawPayload = payload.tickerInfo?.payload as Record<string, unknown> | null;
					const results =
						rawPayload && typeof (rawPayload as any).results === "object"
							? ((rawPayload as any).results as Record<string, unknown>)
							: rawPayload;
					const nextName =
						results && typeof results.name === "string" ? results.name : undefined;
					const nextDescription =
						results && typeof results.description === "string"
							? results.description
							: undefined;
					const nextCurrency =
						results && typeof results.currency_name === "string"
							? results.currency_name.toUpperCase()
							: undefined;
					const nextSymbol =
						results && typeof results.ticker === "string" ? results.ticker : undefined;

					if (nextName || nextDescription || nextCurrency || nextSymbol) {
						await fetch(`/api/projects/${projectId}`, {
							method: "PUT",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								name: nextName,
								description: nextDescription,
								baseCurrency: nextCurrency,
								underlyingSymbol: nextSymbol,
							}),
						});
						await loadProject();
					}
				}
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unable to fetch Massive data";
			setMassiveError(message);
		} finally {
			setMassiveLoading(false);
		}
	}

	async function handleFetchMassiveMarket() {
		if (!projectId) return;
		setMassiveMarketLoading(true);
		setMassiveMarketError(null);
		try {
			const underlying = project?.underlyingSymbol ?? "";
			const market = underlying.toUpperCase().startsWith("X:") ? "crypto" : "stocks";
			const response = await fetch(`/api/projects/${projectId}/ticker-massive-market`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ symbol: underlying, market }),
			});
			const payload = (await response.json().catch(() => null)) as
				| { marketInfo?: Project["massiveMarketInfo"]; fetchedAt?: string; error?: string }
				| null;

			if (!response.ok || !payload || payload.error) {
				throw new Error(payload?.error ?? "Unable to fetch Massive market data");
			}

			if (payload.marketInfo) {
				setProject((prev) =>
					prev
						? {
							...prev,
							massiveMarketInfo: payload.marketInfo ?? null,
							massiveMarketFetchedAt: payload.fetchedAt ?? new Date().toISOString(),
						}
						: prev
				);
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Unable to fetch Massive market data";
			setMassiveMarketError(message);
		} finally {
			setMassiveMarketLoading(false);
		}
	}

	async function handleFetchMassivePrevBar() {
		if (!projectId) return;
		setMassivePrevLoading(true);
		setMassivePrevError(null);
		try {
			const response = await fetch(`/api/projects/${projectId}/ticker-massive-prev`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ symbol: project?.underlyingSymbol ?? "" }),
			});
			const payload = (await response.json().catch(() => null)) as
				| {
					prevBarInfo?: Project["massivePrevBarInfo"];
					fetchedAt?: string;
					underlyingLastPrice?: Project["underlyingLastPrice"];
					underlyingLastPriceUpdatedAt?: Project["underlyingLastPriceUpdatedAt"];
					underlyingLastPriceSource?: Project["underlyingLastPriceSource"];
					underlyingLastPriceCurrency?: Project["underlyingLastPriceCurrency"];
					error?: string;
				}
				| null;

			if (!response.ok || !payload || payload.error) {
				throw new Error(payload?.error ?? "Unable to fetch Massive prev bar");
			}

			if (payload.prevBarInfo) {
				setProject((prev) =>
					prev
						? {
							...prev,
							massivePrevBarInfo: payload.prevBarInfo ?? null,
							massivePrevBarFetchedAt: payload.fetchedAt ?? new Date().toISOString(),
							underlyingLastPrice:
								payload.underlyingLastPrice ?? prev.underlyingLastPrice ?? null,
							underlyingLastPriceUpdatedAt:
								payload.underlyingLastPriceUpdatedAt ??
								prev.underlyingLastPriceUpdatedAt ??
								null,
							underlyingLastPriceSource:
								payload.underlyingLastPriceSource ??
								prev.underlyingLastPriceSource ??
								null,
							underlyingLastPriceCurrency:
								payload.underlyingLastPriceCurrency ??
								prev.underlyingLastPriceCurrency ??
								null,
						}
						: prev
				);
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Unable to fetch Massive prev bar";
			setMassivePrevError(message);
		} finally {
			setMassivePrevLoading(false);
		}
	}
  function resetPositionForm() {
    setIsin("");
    setName("");
    setSide("call");
    setSize(1);
    setEntryPrice("");
    setPositionCurrency(project?.baseCurrency ?? "EUR");
    setMarketPrice("");
    setUnderlyingSymbol("");
    setUnderlyingPrice("");
    setStrike("");
    setExpiry("");
    setVolatilityPct("");
    setRatePct(3);
    setDividendYieldPct(0);
    setRatio(1);
    setLookupValue("");
    setLookupError(null);
    setPositionCreateMode("lookup");
    setPositionAssetType("options");
  }

	async function handleLookupInstrument() {
		if (!lookupValue.trim()) return;
		setLookupLoading(true);
		setLookupError(null);
		try {
			const response = await fetch("/api/isin/lookup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ isin: lookupValue.trim() }),
			});
			const payload = (await response.json().catch(() => null)) as
				| {
					isin?: string;
					name?: string;
					type?: "call" | "put";
					strike?: number;
					expiry?: string;
					currency?: string;
					ratio?: number;
					underlying?: string;
					price?: number;
					error?: string;
				}
				| null;

			if (!response.ok || !payload || payload.error) {
				throw new Error(payload?.error ?? "Lookup fehlgeschlagen");
			}

			if (!payload.isin) {
				throw new Error("Invalid response from the ISIN service.");
			}

			setIsin(payload.isin);
			setName(payload.name ?? "");
			setSide(payload.type ?? "call");
			setStrike(payload.strike ?? "");
			setExpiry(payload.expiry ?? "");
			setRatio(payload.ratio ?? 1);
			setUnderlyingSymbol(payload.underlying ?? "");
			if (payload.price !== undefined) {
				setPricingMode("market");
				setMarketPrice(payload.price);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Lookup fehlgeschlagen";
			setLookupError(message);
		} finally {
			setLookupLoading(false);
		}
	}

	async function handleSavePosition() {
		if (!projectId || !canAdd) return;
		setLoading(true);
		setError(null);

		try {
      const normalizedPricingMode =
        positionAssetType === "spot" ? "market" : pricingMode;
        const payload = {
          name: name.trim() || undefined,
          isin: isin.trim(),
          side: positionAssetType === "spot" ? "spot" : side,
          currency: positionCurrency.trim().toUpperCase() || undefined,
          size: Number(size),
          entryPrice: Number(entryPrice),
          pricingMode: normalizedPricingMode,
          marketPrice:
            normalizedPricingMode === "market"
              ? positionAssetType === "spot"
                ? Number(entryPrice)
                : Number(marketPrice)
              : undefined,
        underlyingSymbol: normalizedPricingMode === "model" ? underlyingSymbol.trim() || undefined : undefined,
        underlyingPrice:
          normalizedPricingMode === "model" ? Number(underlyingPrice) : undefined,
        strike: normalizedPricingMode === "model" ? Number(strike) : undefined,
        expiry: normalizedPricingMode === "model" ? expiry : undefined,
        volatility:
          normalizedPricingMode === "model" ? Number(volatilityPct) / 100 : undefined,
        rate: normalizedPricingMode === "model" ? Number(ratePct) / 100 : undefined,
        dividendYield:
          normalizedPricingMode === "model" ? Number(dividendYieldPct || 0) / 100 : undefined,
        ratio:
          normalizedPricingMode === "model" && ratio !== "" ? Number(ratio) : undefined,
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
    setUnderlyingPriceDraft(project.underlyingLastPrice ?? "");
    setUnderlyingPriceCurrency(
      (project.underlyingLastPriceCurrency ??
        project.tickerInfo?.overview?.Currency ??
        project.baseCurrency ??
        "USD").toUpperCase()
    );
    setTickerDraft(project.underlyingSymbol ?? "");
    setPositionCurrency(project.baseCurrency ?? "EUR");
  }, [project]);

  useEffect(() => {
    if (!project || editingPositionId) return;
    if (positionAssetType !== "spot") return;
    setName(project.name);
    setIsin(project.underlyingSymbol ?? "");
    setSide("spot");
    setPricingMode("market");
    setPositionCreateMode("manual");
    setUnderlyingSymbol("");
    setUnderlyingPrice("");
    setStrike("");
    setExpiry("");
    setVolatilityPct("");
    setRatePct(3);
    setDividendYieldPct(0);
    setRatio(1);
  }, [project, positionAssetType, editingPositionId]);

  useEffect(() => {
    if (!project?.underlyingSymbol) return;
    if (autoPrevRef.current) return;

    const hasPrice =
      project.underlyingLastPrice !== null &&
      project.underlyingLastPrice !== undefined;
    const lastUpdateMs = project.underlyingLastPriceUpdatedAt
      ? Date.parse(project.underlyingLastPriceUpdatedAt)
      : NaN;

    if (!hasPrice || !Number.isFinite(lastUpdateMs)) {
      autoPrevRef.current = true;
      void handleFetchMassivePrevBar();
      return;
    }

    const latestTradingDay = project.tickerInfo?.quote?.["07. latest trading day"];
    if (!latestTradingDay) return;
    const latestTradingDayMs = Date.parse(latestTradingDay);
    if (!Number.isFinite(latestTradingDayMs)) return;

    if (lastUpdateMs < latestTradingDayMs) {
      autoPrevRef.current = true;
      void handleFetchMassivePrevBar();
    }
  }, [
    project?.id,
    project?.underlyingSymbol,
    project?.tickerInfo?.quote,
    project?.underlyingLastPrice,
    project?.underlyingLastPriceUpdatedAt,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("tickerOverviewOpen", String(showTickerOverview));
  }, [showTickerOverview]);

  useEffect(() => {
    if (!project?.underlyingSymbol) return;
    if (project.massiveTickerInfo) return;
    if (autoMassiveRef.current) return;
    autoMassiveRef.current = true;
    void handleFetchMassiveInfo();
  }, [project?.id, project?.underlyingSymbol, project?.massiveTickerInfo]);

  useEffect(() => {
    if (!project || positions.length === 0) return;
    let cancelled = false;
    const baseCurrency = (project.baseCurrency ?? "EUR").toUpperCase();
    const tickerCurrency =
      project.underlyingLastPriceCurrency ?? project.tickerInfo?.overview?.Currency;
    async function loadRates() {
      setFxError(null);
      const currencies = new Set<string>();
      currencies.add(baseCurrency);
      positions.forEach((position) => {
        const entryCurrency = (position.currency ?? baseCurrency).toUpperCase();
        currencies.add(entryCurrency);
        if (position.side === "spot") {
          const spotCurrency = (tickerCurrency ?? baseCurrency ?? entryCurrency).toUpperCase();
          currencies.add(spotCurrency);
        }
      });

      const targets: Array<{ from: string; to: string }> = [];
      currencies.forEach((currency) => {
        if (currency !== "EUR") targets.push({ from: currency, to: "EUR" });
        if (currency !== "USD") targets.push({ from: currency, to: "USD" });
      });

      const responses = await Promise.allSettled(
        targets.map(async ({ from, to }) => {
          const response = await fetch(
            `/api/exchange-rate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(
              to
            )}`
          );
          const payload = (await response.json().catch(() => null)) as
            | { rate?: ExchangeRate; error?: string }
            | null;
          if (!response.ok || !payload?.rate) {
            throw new Error(payload?.error ?? "FX fetch failed");
          }
          return payload.rate;
        })
      );

      if (cancelled) return;
      const nextRates: Record<string, ExchangeRate> = {};
      responses.forEach((result) => {
        if (result.status === "fulfilled") {
          const rate = result.value;
          nextRates[rateKey(rate.from, rate.to)] = rate;
        }
      });
      setFxRates((prev) => ({ ...prev, ...nextRates }));

      const hasError = responses.some((result) => result.status === "rejected");
      if (hasError) {
        setFxError("FX rates could not be fully loaded.");
      }
    }

    void loadRates();
    return () => {
      cancelled = true;
    };
  }, [project, positions]);

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
    setPositionAssetType(position.side === "spot" ? "spot" : "options");
    setSize(position.size);
    setEntryPrice(position.entryPrice);
    setPositionCurrency(position.currency ?? project?.baseCurrency ?? "EUR");
    setPricingMode(position.side === "spot" ? "market" : position.pricingMode ?? "market");
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

	async function handleUpdateUnderlyingPrice() {
		if (!projectId) return;
		if (underlyingPriceDraft === "") {
			setUnderlyingPriceError("Please enter a price.");
			return;
		}
		setUnderlyingPriceLoading(true);
		setUnderlyingPriceError(null);
		try {
			const response = await fetch(`/api/projects/${projectId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					underlyingLastPrice: Number(underlyingPriceDraft),
					underlyingLastPriceCurrency: underlyingPriceCurrency.trim().toUpperCase(),
				}),
			});
			const payload = (await response.json().catch(() => null)) as
				| { error?: string }
				| { project?: Project }
				| null;

			if (!response.ok) {
				const errorMessage =
					payload && "error" in payload
						? payload.error ?? "Unable to update price"
						: "Unable to update price";
				throw new Error(errorMessage);
			}

			if (payload && "project" in payload && payload.project) {
				setProject(payload.project);
				setShowPriceModal(false);
			} else {
				await loadProject();
				setShowPriceModal(false);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unable to update price";
			setUnderlyingPriceError(message);
		} finally {
			setUnderlyingPriceLoading(false);
		}
	}

	async function handleUpdateTickerSymbol() {
		if (!projectId) return;
		const trimmed = tickerDraft.trim();
		if (!trimmed) {
			setTickerSaveError("Bitte einen Ticker eingeben.");
			return;
		}
		setTickerSaveLoading(true);
		setTickerSaveError(null);
		try {
			const response = await fetch(`/api/projects/${projectId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ underlyingSymbol: trimmed }),
			});
			const payload = (await response.json().catch(() => null)) as
				| { error?: string }
				| { project?: Project }
				| null;

			if (!response.ok) {
				const errorMessage =
					payload && "error" in payload
						? payload.error ?? "Unable to update ticker"
						: "Unable to update ticker";
				throw new Error(errorMessage);
			}

			if (payload && "project" in payload && payload.project) {
				setProject(payload.project);
			}

			setShowTickerModal(false);

			if (fetchMassiveAfterTicker) {
				await handleFetchMassiveInfo({ symbol: trimmed, applyMetadata: true });
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unable to update ticker";
			setTickerSaveError(message);
		} finally {
			setTickerSaveLoading(false);
		}
	}

  async function handleUpdateBaseCurrency(nextCurrency: string) {
    if (!projectId) return;
    const normalized = nextCurrency.trim().toUpperCase();
    if (!normalized) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseCurrency: normalized,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | { project?: Project }
        | null;

      if (!response.ok) {
        const errorMessage =
          payload && "error" in payload
            ? payload.error ?? "Unable to update currency"
            : "Unable to update currency";
        throw new Error(errorMessage);
      }

      if (payload && "project" in payload && payload.project) {
        setProject(payload.project);
      } else {
        await loadProject();
      }
      setShowCurrencyModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update currency";
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

	function riskIcon(profile: Project["riskProfile"]) {
		if (profile === "conservative") return "shield";
		if (profile === "balanced") return "balance";
		if (profile === "aggressive") return "show_chart";
		return "insights";
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

	function withMassiveApiKey(url: string) {
		try {
			const encoded = encodeURIComponent(url);
			return `/api/massive/logo?url=${encoded}`;
		} catch {
			return url;
		}
	}

	function getMassiveLogo(payload?: Record<string, unknown> | null) {
		if (!payload) return null;
		const results =
			(payload as Record<string, unknown>).results &&
				typeof (payload as Record<string, unknown>).results === "object"
				? ((payload as Record<string, unknown>).results as Record<string, unknown>)
				: payload;
		const branding = (results as { branding?: Record<string, unknown> }).branding;
		const iconUrl = branding?.icon_url || (branding as any)?.logo_url;
		if (typeof iconUrl === "string" && iconUrl.trim()) return iconUrl;
		if (typeof (results as any).icon_url === "string") return (results as any).icon_url;
		if (typeof (results as any).logo_url === "string") return (results as any).logo_url;
		return null;
	}

  function formatNumber(value: string, options?: Intl.NumberFormatOptions) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return value;
    return new Intl.NumberFormat("de-DE", options).format(parsed);
  }

  function formatMoney(value: number | null, currency: string) {
    if (value === null || !Number.isFinite(value)) return "—";
    return `${formatNumber(value.toString(), { maximumFractionDigits: 2 })} ${currency}`;
  }

	function formatPercent(value: number | null) {
		if (value === null || !Number.isFinite(value)) return "—";
		const sign = value > 0 ? "+" : "";
		return `${sign}${formatNumber((value * 100).toFixed(2))}%`;
	}

	function formatScoreDelta(value: number | null) {
		if (value === null || !Number.isFinite(value)) return "—";
		const sign = value > 0 ? "+" : "";
		return `${sign}${formatNumber(value.toString(), { maximumFractionDigits: 2 })}`;
	}

	function riskDescription(profile: Project["riskProfile"]) {
		switch (profile) {
			case "conservative":
				return "Kapitalerhalt im Fokus.";
			case "balanced":
				return "Ausgewogene Rendite/Risiko.";
			case "aggressive":
				return "Growth with higher risk.";
			default:
				return "Profile not set yet.";
		}
	}

	function parseAlphaNumber(value?: string) {
		if (!value) return null;
		const cleaned = value.replace(/,/g, "").trim();
		if (!cleaned || cleaned.toLowerCase() === "none" || cleaned.toLowerCase() === "n/a") {
			return null;
		}
		const parsed = Number(cleaned);
		return Number.isFinite(parsed) ? parsed : null;
	}

	function normalizePercentValue(value?: string) {
		const parsed = parseAlphaNumber(value);
		if (parsed === null) return null;
		return parsed > 1.5 ? parsed / 100 : parsed;
	}

	function riskScoreTone(score: number | null) {
		if (score === null) return "bg-slate-100 text-slate-500";
		if (score <= 35) return "bg-emerald-100 text-emerald-700";
		if (score <= 70) return "bg-amber-100 text-amber-700";
		return "bg-rose-100 text-rose-700";
	}

	function openPayloadModal(title: string, payload: Record<string, unknown> | null) {
		setPayloadModal({ title, payload });
	}

  function priceSourceLabel(source: Project["underlyingLastPriceSource"]) {
    switch (source) {
      case "alpha_quote":
        return "Latest price";
      case "massive_prev":
				return "Previous close";
			case "manual":
				return "Set manually";
			default:
				return "—";
    }
  }

  function rateKey(from: string, to: string) {
    return `${from.toUpperCase()}_${to.toUpperCase()}`;
  }

  function getRate(from: string, to: string) {
    if (from.toUpperCase() === to.toUpperCase()) return 1;
    return fxRates[rateKey(from, to)]?.rate ?? null;
  }

  function convertValue(value: number, from: string, to: string) {
    if (from.toUpperCase() === to.toUpperCase()) return value;
    const rate = getRate(from, to);
    if (rate === null) return null;
    return value * rate;
  }

	function formatCompact(value?: string) {
		if (!value) return "—";
		const parsed = Number(value);
		if (!Number.isFinite(parsed)) return value;
		return new Intl.NumberFormat("de-DE", {
			notation: "compact",
			maximumFractionDigits: 2,
		}).format(parsed);
	}

	function formatPercentValue(value?: string) {
		if (!value) return "—";
		if (value.includes("%")) return value;
		const parsed = Number(value);
		if (!Number.isFinite(parsed)) return value;
		return new Intl.NumberFormat("de-DE", {
			style: "percent",
			maximumFractionDigits: 2,
		}).format(parsed);
	}

	function formatMaybeNumeric(value?: string) {
		if (!value) return "—";
		if (value.includes("%")) return value;
		const parsed = Number(value);
		if (!Number.isFinite(parsed)) return value;
		return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(parsed);
	}

	function parseQuoteNumber(value?: string) {
		if (!value) return null;
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
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
							{(() => {
								const logoUrl = getMassiveLogo(project.massiveTickerInfo?.payload ?? null);
								const baseClasses =
									"w-12 aspect-square rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 bg-slate-100 text-slate-600";

								return (
									<div
										className={baseClasses}
										role="button"
										tabIndex={0}
										onClick={() => setShowTickerModal(true)}
										onKeyDown={(event) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												setShowTickerModal(true);
											}
										}}
									>
										{logoUrl ? (
											<img
												src={withMassiveApiKey(logoUrl)}
												alt={project.name}
												className="h-full w-full object-contain bg-transparent"
											/>
										) : (
											<span className="text-[10px] font-bold tracking-widest leading-none">
												{project.underlyingSymbol
													? project.underlyingSymbol.replace(/\s+/g, "").slice(-4).toUpperCase()
													: "—"}
											</span>
										)}
									</div>
								);
							})()}
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
								{project.underlyingSymbol ? null : null}
								<div className="mt-3 flex flex-wrap items-center gap-2">
									<button
										type="button"
										onClick={() =>
											project.underlyingSymbol
												? setShowTickerOverview((prev) => !prev)
												: null
										}
										disabled={!project.underlyingSymbol}
										className={`inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-3 py-1 text-xs font-semibold shadow-sm ${
											project.underlyingSymbol
												? "text-slate-700 hover:border-slate-300"
												: "text-slate-400 cursor-not-allowed"
										}`}
									>
										<span className="material-symbols-outlined text-base">
											{showTickerOverview ? "expand_less" : "expand_more"}
										</span>
										{showTickerOverview ? "Hide Ticker Overview" : "Show Ticker Overview"}
									</button>
									<Popover className="relative inline-flex group">
										<Popover.Button
											type="button"
											onClick={() => handleFetchTickerInfo("quote")}
											disabled={!project.underlyingSymbol || tickerLoading}
											className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 disabled:opacity-60"
										>
											<span className="material-symbols-outlined text-base">payments</span>
											{tickerLoading ? "Loading..." : "Latest price"}
										</Popover.Button>
										<Popover.Panel
											static
											className="pointer-events-none absolute left-0 top-full mt-2 w-max rounded-lg border border-border-light bg-white px-2.5 py-1 text-[11px] text-slate-600 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
										>
											Latest price aktualisiert:{" "}
											{project.tickerFetchedAt
												? new Date(project.tickerFetchedAt).toLocaleString()
												: "—"}
										</Popover.Panel>
									</Popover>

									<Popover className="relative inline-flex group">
										<Popover.Button
											type="button"
											onClick={handleFetchMassivePrevBar}
											disabled={!project.underlyingSymbol || massivePrevLoading}
											className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 disabled:opacity-60"
										>
											<span className="material-symbols-outlined text-base">history</span>
											{massivePrevLoading ? "Loading..." : "Previous close"}
										</Popover.Button>
										<Popover.Panel
											static
											className="pointer-events-none absolute left-0 top-full mt-2 w-max rounded-lg border border-border-light bg-white px-2.5 py-1 text-[11px] text-slate-600 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
										>
											Previous close updated:{" "}
											{project.massivePrevBarFetchedAt
												? new Date(project.massivePrevBarFetchedAt).toLocaleString()
												: "—"}
										</Popover.Panel>
									</Popover>
									{project.massivePrevBarFetchedAt ? (
										<span className="text-[11px] text-slate-400">
											Previous close updated:{" "}
											{new Date(project.massivePrevBarFetchedAt).toLocaleString()}
										</span>
									) : null}
								</div>
								{tickerError ? (
									<p className="mt-2 text-xs text-rose-600">{tickerError}</p>
								) : null}
								{massiveError ? (
									<p className="mt-2 text-xs text-rose-600">{massiveError}</p>
								) : null}
								{massivePrevError ? (
									<p className="mt-2 text-xs text-rose-600">{massivePrevError}</p>
								) : null}
							</div>
						</div>
						<Menu as="div" className="relative inline-flex items-center">
							<Menu.Button className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border-light text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
								<span className="material-symbols-outlined text-lg leading-none">more_vert</span>
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
											onClick={() =>
												openPayloadModal("Alpha Overview", project.tickerInfo?.overview ?? null)
											}
											className={[
												"w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 flex items-center gap-2",
												active ? "bg-slate-50" : "",
											]
												.filter(Boolean)
												.join(" ")}
										>
											<span className="material-symbols-outlined text-base">article</span>
											Alpha Overview
										</button>
									)}
								</Menu.Item>
								<Menu.Item>
									{({ active }) => (
										<button
											type="button"
											onClick={() =>
												openPayloadModal("Alpha Quote", project.tickerInfo?.quote ?? null)
											}
											className={[
												"w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 flex items-center gap-2",
												active ? "bg-slate-50" : "",
											]
												.filter(Boolean)
												.join(" ")}
										>
											<span className="material-symbols-outlined text-base">payments</span>
											Alpha Quote
										</button>
									)}
								</Menu.Item>
								<Menu.Item>
									{({ active }) => (
										<button
											type="button"
											onClick={() =>
												openPayloadModal(
													"Massive Ticker",
													project.massiveTickerInfo?.payload ?? null
												)
											}
											className={[
												"w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 flex items-center gap-2",
												active ? "bg-slate-50" : "",
											]
												.filter(Boolean)
												.join(" ")}
										>
											<span className="material-symbols-outlined text-base">insights</span>
											Massive Ticker
										</button>
									)}
								</Menu.Item>
								<Menu.Item>
									{({ active }) => (
										<button
											type="button"
											onClick={() =>
												openPayloadModal(
													"Massive Prev Bar",
													project.massivePrevBarInfo?.payload ?? null
												)
											}
											className={[
												"w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 flex items-center gap-2",
												active ? "bg-slate-50" : "",
											]
												.filter(Boolean)
												.join(" ")}
										>
											<span className="material-symbols-outlined text-base">history</span>
											Massive Prev Bar
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

					{project.underlyingSymbol && showTickerOverview ? (
						<div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
							{(() => {
								const overview = project.tickerInfo?.overview ?? {};
								const quote = project.tickerInfo?.quote ?? {};
								const nameValue = overview.Name ?? project.tickerInfo?.symbol ?? "—";
								const exchangeValue = overview.Exchange ?? "—";
								const currencyValue = overview.Currency ?? "—";
								const projectCurrency = project.baseCurrency ?? "EUR";
								const currencyMismatch =
									currencyValue !== "—" &&
									projectCurrency &&
									currencyValue.toUpperCase() !== projectCurrency.toUpperCase();
								const priceValue = quote["05. price"];
								const changePercentValue = quote["10. change percent"];
								const marketCapValue = overview.MarketCapitalization;
								const peValue = overview.PERatio;
								const sectorValue = overview.Sector;
								const industryValue = overview.Industry;
								const dividendValue = overview.DividendYield;
								const tradingDayValue = quote["07. latest trading day"];
								const high52Value = overview["52WeekHigh"];
								const low52Value = overview["52WeekLow"];
								const targetPriceValue = overview.AnalystTargetPrice;
								const betaValue = overview.Beta;
								const ma50Value = overview["50DayMovingAverage"];
								const ma200Value = overview["200DayMovingAverage"];
								const targetDeltaPercent = (() => {
									const price = parseAlphaNumber(priceValue);
									const target = parseAlphaNumber(targetPriceValue);
									if (price === null || target === null || price === 0) return null;
									return ((target - price) / price) * 100;
								})();
								const rangePosition = (() => {
									const low = parseAlphaNumber(low52Value);
									const high = parseAlphaNumber(high52Value);
									const price = parseAlphaNumber(priceValue);
									if (low === null || high === null || price === null) return null;
									if (high <= low) return null;
									const clamped = Math.max(low, Math.min(high, price));
									return ((clamped - low) / (high - low)) * 100;
								})();
								const trendLabel = (() => {
									const ma50 = parseAlphaNumber(ma50Value);
									const ma200 = parseAlphaNumber(ma200Value);
									if (ma50 === null || ma200 === null) return "—";
									return ma50 >= ma200 ? "Trend: Up" : "Trend: Down";
								})();
								const trendTone = (() => {
									const ma50 = parseAlphaNumber(ma50Value);
									const ma200 = parseAlphaNumber(ma200Value);
									if (ma50 === null || ma200 === null) return "bg-slate-100 text-slate-600";
									return ma50 >= ma200
										? "bg-emerald-100 text-emerald-700"
										: "bg-rose-100 text-rose-700";
								})();

								const hasOverviewData = Object.keys(overview).length > 0;

								return (
									<>
										<div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
											<div className="flex flex-col gap-1">
												<p className="text-xs font-bold uppercase text-slate-500">
													Ticker Overview
												</p>
												<p className="text-xs text-slate-500">
													{exchangeValue} · {currencyValue}
												</p>
												{currencyMismatch ? (
													<p className="text-[11px] text-amber-600">
														Note: ticker in {currencyValue}, project base {projectCurrency}.
													</p>
												) : null}
											</div>
											<div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-0">
												<span className="text-[11px] font-semibold text-slate-400">
													{project.tickerFetchedAt
														? new Date(project.tickerFetchedAt).toLocaleString()
														: "—"}
												</span>
												<Popover className="relative inline-flex group">
													<Popover.Button
														type="button"
														onClick={() => handleFetchTickerInfo("overview")}
														disabled={!project.underlyingSymbol || tickerLoading}
														className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 disabled:opacity-60"
													>
														<span className="material-symbols-outlined text-base">
															travel_explore
														</span>
														{tickerLoading ? "Loading..." : "Company data"}
													</Popover.Button>
													<Popover.Panel
														static
														className="pointer-events-none absolute left-0 top-full mt-2 w-max rounded-lg border border-border-light bg-white px-2.5 py-1 text-[11px] text-slate-600 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
													>
														Unternehmensdaten aktualisiert:{" "}
														{project.tickerFetchedAt
															? new Date(project.tickerFetchedAt).toLocaleString()
															: "—"}
													</Popover.Panel>
												</Popover>
												<Popover className="relative inline-flex group">
													<Popover.Button
														type="button"
														onClick={() => handleFetchMassiveInfo()}
														disabled={!project.underlyingSymbol || massiveLoading}
														className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 disabled:opacity-60"
													>
														<span className="material-symbols-outlined text-base">insights</span>
														{massiveLoading ? "Loading..." : "Company profile"}
													</Popover.Button>
													<Popover.Panel
														static
														className="pointer-events-none absolute left-0 top-full mt-2 w-max rounded-lg border border-border-light bg-white px-2.5 py-1 text-[11px] text-slate-600 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
													>
														Unternehmensprofil aktualisiert:{" "}
														{project.massiveTickerFetchedAt
															? new Date(project.massiveTickerFetchedAt).toLocaleString()
															: "—"}
													</Popover.Panel>
												</Popover>
											</div>
										</div>
										<div className={`mt-4 ${hasOverviewData ? "" : "relative"}`}>
											<div
												className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs text-slate-600 ${
													hasOverviewData ? "" : "blur-sm opacity-60 pointer-events-none"
												}`}
											>
												<div className="rounded-xl border border-slate-200/60 bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
													<p className="text-[10px] uppercase tracking-wider text-slate-400">
														Market Cap
													</p>
													<p className="mt-1 text-base font-semibold text-slate-900 leading-tight">
														{formatCompact(marketCapValue)}
													</p>
													<p className="mt-1 text-[11px] text-slate-400">
														PE {formatMaybeNumeric(peValue)}
													</p>
												</div>
												<div className="rounded-xl border border-slate-200/60 bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
													<p className="text-[10px] uppercase tracking-wider text-slate-400">Sector</p>
													<p className="mt-1 text-base font-semibold text-slate-900 leading-tight">
														{sectorValue ?? "—"}
													</p>
													<p className="mt-1 text-[11px] text-slate-400">
														{industryValue ?? "—"}
													</p>
												</div>
												<div className="rounded-xl border border-slate-200/60 bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
													<p className="text-[10px] uppercase tracking-wider text-slate-400">
														Dividend
													</p>
													<p className="mt-1 text-base font-semibold text-slate-900 leading-tight">
														{formatPercentValue(dividendValue)}
													</p>
													<p className="mt-1 text-[11px] text-slate-400">
														Last Trade {tradingDayValue ?? "—"}
													</p>
												</div>
												<div className="rounded-xl border border-slate-200/60 bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
													<p className="text-[10px] uppercase tracking-wider text-slate-400">
														52W Range
													</p>
													<div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
														<span>{formatMaybeNumeric(low52Value)}</span>
														<span>{formatMaybeNumeric(high52Value)}</span>
													</div>
													<div className="mt-2 h-1.5 rounded-full bg-slate-200/70 relative overflow-hidden">
														<div
															className="absolute top-0 h-1.5 rounded-full bg-slate-400/70"
															style={{
																width: rangePosition === null ? "0%" : `${rangePosition}%`,
															}}
														/>
														{rangePosition !== null ? (
															<span
																className="absolute -top-1 h-3 w-3 rounded-full border-2 border-white bg-slate-900"
																style={{ left: `calc(${rangePosition}% - 6px)` }}
															/>
														) : null}
													</div>
													<p className="mt-2 text-[11px] text-slate-500">Range · aktueller Punkt</p>
												</div>
												<div className="rounded-xl border border-slate-200/60 bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
													<p className="text-[10px] uppercase tracking-wider text-slate-400">
														Analyst Target
													</p>
													<p className="mt-1 text-base font-semibold text-slate-900 leading-tight">
														{formatMaybeNumeric(targetPriceValue)}
													</p>
													<div className="mt-2">
														{targetDeltaPercent === null ? (
															<span className="text-[11px] text-slate-400">—</span>
														) : (
															<span
																className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
																	targetDeltaPercent >= 0
																		? "bg-emerald-100 text-emerald-700"
																		: "bg-rose-100 text-rose-700"
																}`}
															>
																{targetDeltaPercent > 0 ? "+" : ""}
																{targetDeltaPercent.toFixed(1)}% vs price
															</span>
														)}
													</div>
												</div>
												<div className="rounded-xl border border-slate-200/60 bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
													<p className="text-[10px] uppercase tracking-wider text-slate-400">
														Beta / Trend
													</p>
													<p className="mt-1 text-base font-semibold text-slate-900 leading-tight">
														{formatMaybeNumeric(betaValue)}
													</p>
													<div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
														<span className={`rounded-full px-2 py-0.5 font-semibold ${trendTone}`}>
															{trendLabel}
														</span>
														<span>50d {formatMaybeNumeric(ma50Value)}</span>
														<span>·</span>
														<span>200d {formatMaybeNumeric(ma200Value)}</span>
													</div>
												</div>
											</div>
											{hasOverviewData ? null : (
												<div className="absolute inset-0 flex items-center justify-center">
													<div className="rounded-2xl border border-dashed border-slate-200 bg-white/90 p-6 text-center shadow-sm backdrop-blur-sm">
														<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-inner">
															<span className="material-symbols-outlined text-[22px]">
																travel_explore
															</span>
														</div>
														<h4 className="mt-3 text-sm font-semibold text-slate-900">
															No company overview yet
														</h4>
														<p className="mt-1 text-xs text-slate-500">
															Fetch Alpha Vantage data to unlock company metrics and price context.
														</p>
														<button
															type="button"
															onClick={() => handleFetchTickerInfo("overview")}
															disabled={!project.underlyingSymbol || tickerLoading}
															className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 disabled:opacity-60"
														>
															<span className="material-symbols-outlined text-base">
																travel_explore
															</span>
															{tickerLoading ? "Loading..." : "Load company data"}
														</button>
													</div>
												</div>
											)}
										</div>
										{hasOverviewData ? (
											<div className="mt-4 flex items-center gap-2">
												<button
													type="button"
													onClick={() => setShowTickerDetails((prev) => !prev)}
													className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300"
												>
													<span className="material-symbols-outlined text-base">
														{showTickerDetails ? "expand_less" : "expand_more"}
													</span>
													{showTickerDetails ? "Details ausblenden" : "Mehr anzeigen"}
												</button>
											</div>
										) : null}
										{showTickerDetails ? (
											<>
												{overview.Description ? (
													<p className="mt-3 text-xs text-slate-500 line-clamp-3">
														{overview.Description}
													</p>
												) : null}
												<div className="mt-4 grid gap-4 md:grid-cols-2">
													<div className="rounded-xl border border-slate-200/70 bg-slate-50 p-3">
														<p className="text-[11px] font-bold uppercase text-slate-500">
															Overview (full)
														</p>
														<div className="mt-2 max-h-64 overflow-y-auto text-[11px] text-slate-600 custom-scrollbar">
															{Object.keys(overview).length === 0 ? (
																<p className="text-slate-400">No overview data.</p>
															) : (
																<table className="min-w-full">
																	<tbody>
																		{Object.entries(overview)
																			.sort(([a], [b]) => a.localeCompare(b))
																			.map(([key, value]) => (
																				<tr key={key} className="border-b border-slate-200/70">
																					<td className="py-1 pr-2 align-top font-semibold text-slate-500">
																						{key}
																					</td>
																					<td className="py-1 text-slate-700">
																						{formatMaybeNumeric(value)}
																					</td>
																				</tr>
																			))}
																	</tbody>
																</table>
															)}
														</div>
													</div>
													<div className="rounded-xl border border-slate-200/70 bg-slate-50 p-3">
														<p className="text-[11px] font-bold uppercase text-slate-500">
															Global Quote (full)
														</p>
														<div className="mt-2 max-h-64 overflow-y-auto text-[11px] text-slate-600 custom-scrollbar">
															{Object.keys(quote).length === 0 ? (
																<p className="text-slate-400">No quote data.</p>
															) : (
																<table className="min-w-full">
																	<tbody>
																		{Object.entries(quote)
																			.sort(([a], [b]) => a.localeCompare(b))
																			.map(([key, value]) => (
																				<tr key={key} className="border-b border-slate-200/70">
																					<td className="py-1 pr-2 align-top font-semibold text-slate-500">
																						{key}
																					</td>
																					<td className="py-1 text-slate-700">
																						{formatMaybeNumeric(value)}
																					</td>
																				</tr>
																			))}
																	</tbody>
																</table>
															)}
														</div>
													</div>
												</div>
											</>
										) : null}
									</>
								);
							})()}
						</div>
					) : null}

					{/* {project.massiveTickerInfo ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase text-slate-500">Massive Payload (raw)</p>
                {project.massiveTickerFetchedAt ? (
                  <span className="text-[11px] text-slate-400">
                    {new Date(project.massiveTickerFetchedAt).toLocaleString()}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-slate-200/70 bg-slate-50 p-3 text-[11px] text-slate-600 custom-scrollbar">
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(project.massiveTickerInfo.payload, null, 2)}
                </pre>
              </div>
            </div>
          ) : null} */}

					<div className="grid grid-cols-1 md:grid-cols-6 gap-4">
						<button
							type="button"
							onClick={() => setShowRiskScoreModal(true)}
							className="bg-surface-light border border-border-light p-4 rounded-xl text-left transition-all hover:border-slate-300 hover:shadow-sm"
						>
							<div className="flex items-center justify-between">
								<p className="text-xs font-semibold text-slate-500 uppercase">Risk Profile</p>
								<span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase">
									<span className="material-symbols-outlined text-[14px]">info</span>
									Score
								</span>
							</div>
							<div className="mt-2 flex items-center justify-between gap-3">
								<span className="text-xl font-bold text-slate-900 leading-none">
									{getRiskBadge(project.riskProfile).label}
								</span>
								<span className="h-7 w-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
									<span className="material-symbols-outlined text-[15px] leading-none">
										{riskIcon(project.riskProfile)}
									</span>
								</span>
							</div>
							<span className="mt-2 block text-[11px] text-slate-500">
								{riskDescription(project.riskProfile)}
							</span>
						</button>
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
							<div className="mt-1 flex flex-col">
								<span className="text-2xl font-bold text-slate-900">
									{totalValueEur === null ? "—" : formatNumber(totalValueEur.toString())}
									<span className="ml-2 text-xs font-semibold text-slate-400 uppercase">
										EUR
									</span>
								</span>
								<span className="mt-1 text-xs text-slate-500 uppercase tracking-tighter">
									{formatMoney(totalValueUsd, "USD")}
								</span>
							</div>
						</div>
						<div className="bg-surface-light border border-border-light p-4 rounded-xl">
							<p className="text-xs font-semibold text-slate-500 uppercase">Performance</p>
							<div className="mt-1 flex flex-col">
								<span
									className={`text-2xl font-bold ${
										totalPerformancePct === null
											? "text-slate-400"
											: totalPerformancePct >= 0
												? "text-emerald-600"
												: "text-rose-600"
									}`}
								>
									{formatPercent(totalPerformancePct)}
								</span>
								<span className="mt-1 text-xs text-slate-500 uppercase tracking-tighter">
									{formatMoney(totalPerformanceAbsEur, "EUR")}
								</span>
							</div>
						</div>
						<button
							type="button"
							onClick={() => setShowPriceModal(true)}
							className="bg-surface-light border border-border-light p-4 rounded-xl text-left hover:border-slate-300 transition-colors"
						>
							<p className="text-xs font-semibold text-slate-500 uppercase">Underlying price</p>
							<p className="text-2xl font-bold mt-1">
								{project.underlyingLastPrice !== null &&
									project.underlyingLastPrice !== undefined
									? formatNumber(project.underlyingLastPrice.toString())
									: "—"}
								<span className="ml-2 text-xs font-semibold text-slate-400 uppercase">
									{project.underlyingLastPriceCurrency ??
										project.tickerInfo?.overview?.Currency ??
										project.baseCurrency}
								</span>
							</p>
							<p className="text-[11px] text-slate-400 mt-1">
								{project.underlyingLastPriceUpdatedAt
									? new Date(project.underlyingLastPriceUpdatedAt).toLocaleString()
									: "Kein Datum"}
								{project.underlyingLastPriceSource
									? ` · ${priceSourceLabel(project.underlyingLastPriceSource)}`
									: ""}
							</p>
						</button>
						{/* <div className="bg-surface-light border border-border-light p-4 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 uppercase">Ticker Movement</p>
              {project.tickerInfo?.quote ? (
                (() => {
                  const quote = project.tickerInfo?.quote ?? {};
                  const open = parseQuoteNumber(quote["02. open"]);
                  const high = parseQuoteNumber(quote["03. high"]);
                  const low = parseQuoteNumber(quote["04. low"]);
                  const price = parseQuoteNumber(quote["05. price"]);
                  const prevClose = parseQuoteNumber(quote["08. previous close"]);
                  const values = [
                    { label: "Open", value: open },
                    { label: "High", value: high },
                    { label: "Low", value: low },
                    { label: "Close", value: prevClose },
                    { label: "Price", value: price },
                  ].filter((item) => item.value !== null) as Array<{ label: string; value: number }>;

                  if (values.length === 0) {
                    return <p className="text-sm text-slate-400 mt-2">No quote data.</p>;
                  }

                  const min = Math.min(...values.map((v) => v.value));
                  const max = Math.max(...values.map((v) => v.value));
                  const range = max - min || 1;

                  return (
                    <div className="mt-3 space-y-2">
                      {values.map((item) => {
                        const width = ((item.value - min) / range) * 100;
                        return (
                          <div key={item.label} className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="w-10 uppercase">{item.label}</span>
                            <div className="flex-1">
                              <div className="h-2 rounded-full bg-slate-100">
                                <div
                                  className="h-2 rounded-full bg-slate-900"
                                  style={{ width: `${Math.max(6, width)}%` }}
                                />
                              </div>
                            </div>
                            <span className="w-16 text-right text-slate-700">
                              {formatMaybeNumeric(item.value.toString())}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <p className="text-sm text-slate-400 mt-2">Load a price to see movement.</p>
              )}
            </div> */}
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
          {fxError ? (
            <p className="mb-4 text-xs text-rose-600">{fxError}</p>
          ) : null}
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
						<div className="rounded-xl border border-border-light bg-white shadow-sm overflow-hidden">
							<div className="overflow-x-auto overflow-y-visible">
								<table className="w-full min-w-[980px] text-left border-collapse">
									<thead>
										<tr className="bg-slate-50/70 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-border-light">
											<th className="px-4 py-3">Instrument</th>
											<th className="px-4 py-3">Type/Shares</th>
											<th className="px-4 py-3">Entry</th>
											<th className="px-4 py-3">Value</th>
											<th className="px-4 py-3">Perf.</th>
											<th className="px-4 py-3">Lev.</th>
											<th className="px-4 py-3">TTE</th>
											<th className="px-4 py-3 text-right">Actions</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border-light relative z-0">
										{positions.map((position, index) => {
											const mode = position.pricingMode ?? "market";
											const displayValue =
												position.side === "spot"
													? project.underlyingLastPrice ?? position.entryPrice
													: mode === "model"
														? position.computed?.fairValue
														: position.marketPrice ?? position.entryPrice;
											const ratio = position.ratio ?? 1;
											const quantity = position.size * ratio;
											const currentValue =
												displayValue === undefined ? null : displayValue * quantity;
											const entryValue = position.entryPrice * quantity;
											const entryCurrency =
												(position.currency ?? project.baseCurrency ?? "EUR").toUpperCase();
											const currentCurrency =
												position.side === "spot"
													? (
															project.underlyingLastPriceCurrency ??
															project.tickerInfo?.overview?.Currency ??
															project.baseCurrency ??
															entryCurrency
														).toUpperCase()
													: entryCurrency;
											const entryValueInCurrent =
												entryValue > 0
													? convertValue(entryValue, entryCurrency, currentCurrency)
													: null;
											const performance =
												entryValueInCurrent !== null && currentValue !== null && entryValueInCurrent > 0
													? (currentValue - entryValueInCurrent) / entryValueInCurrent
													: null;
											const performanceAbsolute =
												entryValueInCurrent !== null && currentValue !== null
													? currentValue - entryValueInCurrent
													: null;
											const performanceAbsoluteEur =
												performanceAbsolute === null
													? null
													: convertValue(performanceAbsolute, currentCurrency, "EUR");
											const valueEur =
												currentValue === null ? null : convertValue(currentValue, currentCurrency, "EUR");
											const valueUsd =
												currentValue === null ? null : convertValue(currentValue, currentCurrency, "USD");
											const isLastRow = index === positions.length - 1;
											return (
												<tr key={position.id} className="hover:bg-slate-50/70 transition-colors">
													<td className="px-4 py-3">
														<div className="flex flex-col">
															<span className="text-sm font-semibold text-slate-900">
																{position.name ?? position.isin}
															</span>
															<span className="text-[10px] text-slate-500 uppercase tracking-tighter">
																{position.isin}
															</span>
														</div>
													</td>
													<td className="px-4 py-3">
														<div className="flex flex-col">
															<span className="text-sm font-medium text-slate-700 capitalize">
																{position.side === "spot" ? "Spot" : position.side}
															</span>
															<span className="text-[10px] text-slate-500 uppercase tracking-tighter">
																{position.size}
															</span>
														</div>
													</td>
													<td className="px-4 py-3 text-sm text-slate-700">
														<div className="flex flex-col">
															<span className="text-sm font-semibold">
																{formatNumber(position.entryPrice.toString(), {
																	maximumFractionDigits: 2,
																})}{" "}
																<span className="text-xs text-slate-400 uppercase">
																	{entryCurrency}
																</span>
															</span>
															<span className="text-[10px] text-slate-500 uppercase tracking-tighter">
																{entryCurrency === project.baseCurrency.toUpperCase()
																	? "Base currency"
																	: (() => {
																			const entryBase =
																				convertValue(
																					position.entryPrice,
																					entryCurrency,
																					project.baseCurrency
																				);
																			return entryBase === null
																				? "FX?"
																				: `${formatNumber(entryBase.toString(), {
																						maximumFractionDigits: 2,
																					})} ${project.baseCurrency.toUpperCase()}`;
																		})()}
															</span>
														</div>
													</td>
													<td className="px-4 py-3 text-sm text-slate-700">
														{currentValue === null ? (
															<span className="text-slate-400">—</span>
														) : (
															<div className="flex flex-col">
																<span className="text-sm font-semibold text-slate-800">
																	{formatMoney(valueEur, "EUR")}
																</span>
																<span className="text-[10px] text-slate-500 uppercase tracking-tighter">
																	{formatMoney(valueUsd, "USD")}
																</span>
															</div>
														)}
													</td>
													<td className="px-4 py-3 text-sm font-semibold">
														{performance === null ? (
															<span className="text-slate-400">—</span>
														) : (
															<div className="flex flex-col">
																<span
																	className={
																		performance >= 0 ? "text-emerald-600" : "text-rose-600"
																	}
																>
																	{formatPercent(performance)}
																</span>
																<span className="text-[10px] text-slate-500 uppercase tracking-tighter">
																	{formatMoney(performanceAbsoluteEur, "EUR")}
																</span>
															</div>
														)}
													</td>
													<td className="px-4 py-3 text-sm text-slate-700">
														{position.side === "spot" ? "—" : ratio}
													</td>
													<td className="px-4 py-3 text-sm text-slate-600">
														{position.side === "spot" ? "—" : timeToExpiry(position.expiry)}
													</td>
													<td className="px-4 py-3 text-right relative overflow-visible">
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
																{mode === "model" && position.side !== "spot" ? (
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
								className="w-full h-[560px]"
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
				className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${showPositionModal ? "" : "hidden"
					}`}
				onClick={() => setShowPositionModal(false)}
			/>
			<div
				className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${showPositionModal ? "" : "pointer-events-none"
					}`}
				onClick={() => setShowPositionModal(false)}
				aria-hidden={!showPositionModal}
			>
				<div
					className={`w-full max-w-2xl bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out ${showPositionModal ? "scale-100 opacity-100" : "scale-95 opacity-0"
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
						{!editingPositionId ? (
							<div className="flex flex-col gap-3">
								<div className="flex flex-wrap items-center gap-2">
									<button
										type="button"
										onClick={() => setPositionAssetType("options")}
										className={`rounded-full border px-3 py-1 text-xs font-semibold ${positionAssetType === "options"
												? "border-slate-900 bg-slate-900 text-white"
											: "border-slate-200 bg-white text-slate-600"
										}`}
								>
									Warrant
								</button>
								<button
									type="button"
									onClick={() => {
										setPositionAssetType("spot");
										setPositionCreateMode("manual");
										setPricingMode("market");
									}}
									className={`rounded-full border px-3 py-1 text-xs font-semibold ${positionAssetType === "spot"
											? "border-slate-900 bg-slate-900 text-white"
											: "border-slate-200 bg-white text-slate-600"
										}`}
									>
										Spot Aktie
									</button>
								</div>
								<div className="h-px w-full bg-slate-200/80" />
								{positionAssetType === "options" ? (
									<div className="flex flex-wrap items-center gap-2">
										<button
											type="button"
											onClick={() => setPositionCreateMode("manual")}
											className={`rounded-full border px-3 py-1 text-xs font-semibold ${positionCreateMode === "manual"
													? "border-slate-900 bg-slate-900 text-white"
													: "border-slate-200 bg-white text-slate-600"
												}`}
										>
											Manual
										</button>
										<button
											type="button"
											onClick={() => setPositionCreateMode("lookup")}
											className={`rounded-full border px-3 py-1 text-xs font-semibold ${positionCreateMode === "lookup"
													? "border-slate-900 bg-slate-900 text-white"
													: "border-slate-200 bg-white text-slate-600"
												}`}
										>
											WKN / ISIN
										</button>
									</div>
								) : null}
							</div>
						) : null}

						{!editingPositionId && positionCreateMode === "lookup" && positionAssetType === "options" ? (
							<div className="space-y-3">
								<label className="text-xs font-bold uppercase text-slate-500">
									WKN oder ISIN
								</label>
								<div className="flex items-center gap-2">
									<input
										value={lookupValue}
										onChange={(event) => setLookupValue(event.target.value)}
										className="flex-1 rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
										placeholder="z.B. DE000... oder WKN"
									/>
									<button
										type="button"
										onClick={handleLookupInstrument}
										disabled={lookupLoading}
										className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold disabled:opacity-60"
									>
										{lookupLoading ? "Suche..." : "Lookup"}
									</button>
								</div>
								{lookupError ? (
									<p className="text-xs text-rose-600">{lookupError}</p>
								) : null}
							</div>
						) : null}
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
								<label className="text-xs font-bold uppercase text-slate-500">
									{positionAssetType === "spot" ? "Ticker" : "ISIN"}
								</label>
								<input
									value={isin}
									onChange={(event) => setIsin(event.target.value)}
									className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm font-mono bg-slate-50"
									placeholder={positionAssetType === "spot" ? "AAPL" : "DE000..."}
								/>
							</div>
							{positionAssetType === "options" ? (
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
							) : null}
							<div>
								<label className="text-xs font-bold uppercase text-slate-500">
									{positionAssetType === "spot" ? "Shares" : "Size"}
								</label>
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
								<label className="text-xs font-bold uppercase text-slate-500">
									Entry price
								</label>
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
								<label className="text-xs font-bold uppercase text-slate-500">Currency</label>
								<select
									value={positionCurrency.toUpperCase()}
									onChange={(event) => setPositionCurrency(event.target.value)}
									className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50 uppercase"
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
							{positionAssetType === "options" ? (
								<div>
									<label className="text-xs font-bold uppercase text-slate-500">
										Pricing mode
									</label>
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
							) : null}
						</div>

						{pricingMode === "market" && positionAssetType === "options" ? (
							<div>
								<label className="text-xs font-bold uppercase text-slate-500">
									Market price
								</label>
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
						) : null}

						{pricingMode === "model" && positionAssetType === "options" ? (
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
						) : null}
						{error ? <p className="text-sm text-red-600">{error}</p> : null}
					</div>
					<div className="p-6 border-t border-border-light bg-slate-50 flex gap-3 rounded-b-2xl">
						<button
							type="button"
							onClick={() => setShowPositionModal(false)}
							className="flex-1 px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
						>
							Cancel
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
				className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${showEditProject ? "" : "hidden"
					}`}
				onClick={() => setShowEditProject(false)}
			/>
			<div
				className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${showEditProject ? "" : "pointer-events-none"
					}`}
				onClick={() => setShowEditProject(false)}
				aria-hidden={!showEditProject}
			>
				<div
					className={`w-full max-w-md bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out ${showEditProject ? "scale-100 opacity-100" : "scale-95 opacity-0"
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
				className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${showDeleteProject ? "" : "hidden"
					}`}
				onClick={() => setShowDeleteProject(false)}
			/>
			<div
				className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${showDeleteProject ? "" : "pointer-events-none"
					}`}
				onClick={() => setShowDeleteProject(false)}
				aria-hidden={!showDeleteProject}
			>
				<div
					className={`w-full max-w-md bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out ${showDeleteProject ? "scale-100 opacity-100" : "scale-95 opacity-0"
						}`}
					onClick={(event) => event.stopPropagation()}
				>
					<div className="p-6 border-b border-border-light flex items-start gap-4">
						<div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
							<span className="material-symbols-outlined text-xl">warning</span>
						</div>
						<div>
							<h3 className="text-lg font-bold text-slate-900">Delete project</h3>
							<p className="text-sm text-slate-500 mt-1">
								This action cannot be undone.
							</p>
						</div>
					</div>
					<div className="p-6">
						<p className="text-sm text-slate-600">
							Do you want to delete the project{" "}
							<span className="font-semibold text-slate-900">{project.name}</span>?
							All positions will be removed.
						</p>
					</div>
					<div className="p-6 border-t border-border-light bg-slate-50 flex gap-3 rounded-b-2xl">
						<button
							type="button"
							onClick={() => setShowDeleteProject(false)}
							className="flex-1 px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleDeleteProject}
							className="flex-1 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
						>
							Delete project
						</button>
					</div>
				</div>
			</div>

			<div
				className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${showDeletePosition ? "" : "hidden"
					}`}
				onClick={() => setShowDeletePosition(false)}
			/>
			<div
				className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${showDeletePosition ? "" : "pointer-events-none"
					}`}
				onClick={() => setShowDeletePosition(false)}
				aria-hidden={!showDeletePosition}
			>
				<div
					className={`w-full max-w-md bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out ${showDeletePosition ? "scale-100 opacity-100" : "scale-95 opacity-0"
						}`}
					onClick={(event) => event.stopPropagation()}
				>
					<div className="p-6 border-b border-border-light flex items-start gap-4">
						<div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
							<span className="material-symbols-outlined text-xl">warning</span>
						</div>
						<div>
							<h3 className="text-lg font-bold text-slate-900">Delete position</h3>
							<p className="text-sm text-slate-500 mt-1">
								This action cannot be undone.
							</p>
						</div>
					</div>
					<div className="p-6">
						<p className="text-sm text-slate-600">
							Do you want to delete the position
							<span className="font-semibold text-slate-900">
								{deletePositionTarget ? ` ${deletePositionTarget.name ?? deletePositionTarget.isin}` : ""}
							</span>
							?
						</p>
					</div>
					<div className="p-6 border-t border-border-light bg-slate-50 flex gap-3 rounded-b-2xl">
						<button
							type="button"
							onClick={() => setShowDeletePosition(false)}
							className="flex-1 px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleDeletePosition}
							className="flex-1 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
							disabled={loading}
						>
							Delete position
						</button>
					</div>
				</div>
			</div>

			<div
				className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${showTickerModal ? "" : "hidden"
					}`}
				onClick={() => setShowTickerModal(false)}
			/>
			<div
				className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${showTickerModal ? "" : "pointer-events-none"
					}`}
				onClick={() => setShowTickerModal(false)}
				aria-hidden={!showTickerModal}
			>
				<div
					className={`w-full max-w-sm bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out ${showTickerModal ? "scale-100 opacity-100" : "scale-95 opacity-0"
						}`}
					onClick={(event) => event.stopPropagation()}
				>
					<div className="p-6 border-b border-border-light flex items-center justify-between">
						<div>
							<h3 className="text-lg font-bold text-slate-900">Update Ticker</h3>
							<p className="text-sm text-slate-500 mt-1">
								Change the underlying symbol for this project.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setShowTickerModal(false)}
							className="p-2 hover:bg-slate-100 rounded-full transition-colors"
						>
							<span className="material-symbols-outlined">close</span>
						</button>
					</div>
					<div className="p-6 space-y-4">
						<div>
							<label className="text-xs font-bold uppercase text-slate-500">Ticker</label>
							<input
								value={tickerDraft}
								onChange={(event) => setTickerDraft(event.target.value)}
								className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
								placeholder="NASDAQ:COIN"
							/>
						</div>
						<div className="rounded-xl border border-border-light bg-white p-4 shadow-sm">
							<div className="flex items-start justify-between gap-4">
								<div>
									<div className="flex items-center gap-2">
										<p className="text-sm font-semibold text-slate-900">
											Auto-update from Massive
										</p>
									</div>
									<p className="mt-1 text-xs text-slate-500">
										When enabled, saving the ticker will also fetch Massive data and update
										name, description, base currency, and symbol automatically.
									</p>
								</div>
								<label className="relative inline-flex cursor-pointer items-center">
									<input
										type="checkbox"
										checked={fetchMassiveAfterTicker}
										onChange={(event) => setFetchMassiveAfterTicker(event.target.checked)}
										className="sr-only peer"
									/>
									<span className="h-7 w-12 rounded-full bg-slate-200 transition-colors peer-checked:bg-blue-600" />
									<span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
									<span className="absolute left-[5px] top-[5px] text-white opacity-0 transition-all peer-checked:translate-x-5 peer-checked:opacity-100">
										<span className="material-symbols-outlined text-[14px]">check</span>
									</span>
								</label>
							</div>
						</div>
						{tickerSaveError ? (
							<p className="text-sm text-rose-600">{tickerSaveError}</p>
						) : null}
					</div>
					<div className="p-6 border-t border-border-light bg-slate-50 flex gap-3 rounded-b-2xl">
						<button
							type="button"
							onClick={() => setShowTickerModal(false)}
							className="flex-1 px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleUpdateTickerSymbol}
							className="flex-1 px-5 py-3 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all disabled:opacity-60"
							disabled={tickerSaveLoading}
						>
							{tickerSaveLoading ? "Saving..." : "Save ticker"}
						</button>
					</div>
				</div>
			</div>

			<div
				className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${showPriceModal ? "" : "hidden"
					}`}
				onClick={() => setShowPriceModal(false)}
			/>
			<div
				className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${showPriceModal ? "" : "pointer-events-none"
					}`}
				onClick={() => setShowPriceModal(false)}
				aria-hidden={!showPriceModal}
			>
				<div
					className={`w-full max-w-sm bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out ${showPriceModal ? "scale-100 opacity-100" : "scale-95 opacity-0"
						}`}
					onClick={(event) => event.stopPropagation()}
				>
					<div className="p-6 border-b border-border-light flex items-center justify-between">
						<div>
							<h3 className="text-lg font-bold text-slate-900">Set price manually</h3>
							<p className="text-sm text-slate-500 mt-1">
								Update the latest underlying price.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setShowPriceModal(false)}
							className="p-2 hover:bg-slate-100 rounded-full transition-colors"
						>
							<span className="material-symbols-outlined">close</span>
						</button>
					</div>
					<div className="p-6 space-y-4">
						<div>
							<label className="text-xs font-bold uppercase text-slate-500">Price</label>
							<div className="mt-2 flex items-center gap-2 rounded-lg border border-border-light bg-slate-50 px-3 py-2">
								<input
									type="number"
									min={0}
									step={0.01}
									value={underlyingPriceDraft}
									onChange={(event) =>
										setUnderlyingPriceDraft(
											event.target.value === "" ? "" : Number(event.target.value)
										)
									}
									className="flex-1 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
									placeholder="0.00"
								/>
								<select
									value={underlyingPriceCurrency}
									onChange={(event) => setUnderlyingPriceCurrency(event.target.value)}
									className="bg-transparent text-xs font-semibold text-slate-500 uppercase focus:outline-none"
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
						{underlyingPriceError ? (
							<p className="text-sm text-rose-600">{underlyingPriceError}</p>
						) : null}
					</div>
					<div className="p-6 border-t border-border-light bg-slate-50 flex gap-3 rounded-b-2xl">
						<button
							type="button"
							onClick={() => setShowPriceModal(false)}
							className="flex-1 px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleUpdateUnderlyingPrice}
							disabled={underlyingPriceLoading}
							className="flex-1 px-5 py-3 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all disabled:opacity-60"
						>
							{underlyingPriceLoading ? "Saving..." : "Save price"}
						</button>
					</div>
				</div>
			</div>

			<div
				className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${showCurrencyModal ? "" : "hidden"
					}`}
				onClick={() => setShowCurrencyModal(false)}
			/>
			<div
				className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${showCurrencyModal ? "" : "pointer-events-none"
					}`}
				onClick={() => setShowCurrencyModal(false)}
				aria-hidden={!showCurrencyModal}
			>
				<div
					className={`w-full max-w-sm bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out ${showCurrencyModal ? "scale-100 opacity-100" : "scale-95 opacity-0"
						}`}
					onClick={(event) => event.stopPropagation()}
				>
					<div className="p-6 border-b border-border-light flex items-center justify-between">
						<div>
							<h3 className="text-lg font-bold text-slate-900">Change base currency</h3>
							<p className="text-sm text-slate-500 mt-1">
								Select a new base currency.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setShowCurrencyModal(false)}
							className="p-2 hover:bg-slate-100 rounded-full transition-colors"
						>
							<span className="material-symbols-outlined">close</span>
						</button>
					</div>
					<div className="p-6 space-y-4">
						<div>
							<label className="text-xs font-bold uppercase text-slate-500">Currency</label>
							<select
								value={project?.baseCurrency?.toUpperCase() ?? "EUR"}
								onChange={(event) => handleUpdateBaseCurrency(event.target.value)}
								className="mt-2 w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50 uppercase"
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
					<div className="p-6 border-t border-border-light bg-slate-50 flex justify-end rounded-b-2xl">
						<button
							type="button"
							onClick={() => setShowCurrencyModal(false)}
							className="px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
						>
							Close
						</button>
					</div>
				</div>
			</div>

			<div
				className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${showRiskScoreModal ? "" : "hidden"
					}`}
				onClick={() => setShowRiskScoreModal(false)}
			/>
			<div
				className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${showRiskScoreModal ? "" : "pointer-events-none"
					}`}
				onClick={() => setShowRiskScoreModal(false)}
				aria-hidden={!showRiskScoreModal}
			>
				<div
					className={`w-full max-w-xl bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out ${showRiskScoreModal ? "scale-100 opacity-100" : "scale-95 opacity-0"
						}`}
					onClick={(event) => event.stopPropagation()}
				>
					<div className="p-6 border-b border-border-light flex items-center justify-between">
						<div>
							<h3 className="text-lg font-bold text-slate-900">Risk Score</h3>
							<p className="text-sm text-slate-500 mt-1">
								Herleitung des Scores (1–100).
							</p>
						</div>
						<button
							type="button"
							onClick={() => setShowRiskScoreModal(false)}
							className="p-2 hover:bg-slate-100 rounded-full transition-colors"
						>
							<span className="material-symbols-outlined">close</span>
						</button>
					</div>
					<div className="p-6">
						{riskScoreDetails ? (
							<div className="space-y-4 text-sm text-slate-600">
								<div className="flex items-center justify-between text-slate-800 font-semibold">
									<span>Gesamtscore</span>
									<span>{riskScoreDetails.score}</span>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3">
										<p className="text-[11px] uppercase text-slate-400">Basis</p>
										<p className="mt-1 font-semibold text-slate-700">
											{riskScoreDetails.baseScore}
										</p>
									</div>
									<div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3">
										<p className="text-[11px] uppercase text-slate-400">Options-Anteil</p>
										<p className="mt-1 font-semibold text-slate-700">
											{formatPercent(riskScoreDetails.optionsShare)}
											<span className="ml-2 text-slate-500">
												({formatScoreDelta(riskScoreDetails.optionsImpact)})
											</span>
										</p>
									</div>
									<div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3">
										<p className="text-[11px] uppercase text-slate-400">Ø Ratio</p>
										<p className="mt-1 font-semibold text-slate-700">
											{formatNumber(riskScoreDetails.averageRatio.toString(), {
												maximumFractionDigits: 2,
											})}
											<span className="ml-2 text-slate-500">
												({formatScoreDelta(riskScoreDetails.ratioImpact)})
											</span>
										</p>
									</div>
									<div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3">
										<p className="text-[11px] uppercase text-slate-400">Beta</p>
										<p className="mt-1 font-semibold text-slate-700">
											{riskScoreDetails.beta === null
												? "—"
												: formatNumber(riskScoreDetails.beta.toString(), {
														maximumFractionDigits: 2,
													})}
											<span className="ml-2 text-slate-500">
												({formatScoreDelta(riskScoreDetails.betaImpact)})
											</span>
										</p>
									</div>
									<div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3">
										<p className="text-[11px] uppercase text-slate-400">Market Cap</p>
										<p className="mt-1 font-semibold text-slate-700">
											{riskScoreDetails.marketCap === null
												? "—"
												: formatCompact(riskScoreDetails.marketCap.toString())}
											<span className="ml-2 text-slate-500">
												({formatScoreDelta(riskScoreDetails.marketCapImpact)})
											</span>
										</p>
									</div>
									<div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3">
										<p className="text-[11px] uppercase text-slate-400">Profit Margin</p>
										<p className="mt-1 font-semibold text-slate-700">
											{riskScoreDetails.profitMargin === null
												? "—"
												: formatPercent(riskScoreDetails.profitMargin)}
											<span className="ml-2 text-slate-500">
												({formatScoreDelta(riskScoreDetails.marginImpact)})
											</span>
										</p>
									</div>
									<div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3">
										<p className="text-[11px] uppercase text-slate-400">ROA</p>
										<p className="mt-1 font-semibold text-slate-700">
											{riskScoreDetails.roa === null
												? "—"
												: formatPercent(riskScoreDetails.roa)}
											<span className="ml-2 text-slate-500">
												({formatScoreDelta(riskScoreDetails.roaImpact)})
											</span>
										</p>
									</div>
									<div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3">
										<p className="text-[11px] uppercase text-slate-400">PE / P/B</p>
										<p className="mt-1 font-semibold text-slate-700">
											{riskScoreDetails.pe === null
												? "—"
												: formatNumber(riskScoreDetails.pe.toString(), {
														maximumFractionDigits: 2,
													})}
											<span className="ml-2 text-slate-500">
												({formatScoreDelta(riskScoreDetails.peImpact)})
											</span>
										</p>
										<p className="mt-1 text-[11px] text-slate-500">
											P/B:{" "}
											{riskScoreDetails.priceToBook === null
												? "—"
												: formatNumber(riskScoreDetails.priceToBook.toString(), {
														maximumFractionDigits: 2,
													})}{" "}
											({formatScoreDelta(riskScoreDetails.pbImpact)})
										</p>
									</div>
								</div>
							</div>
						) : (
							<p className="text-sm text-slate-400">No data available.</p>
						)}
					</div>
					<div className="p-6 border-t border-border-light bg-slate-50 flex justify-end rounded-b-2xl">
						<button
							type="button"
							onClick={() => setShowRiskScoreModal(false)}
							className="px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
						>
							Close
						</button>
					</div>
				</div>
			</div>

			<div
				className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${payloadModal ? "" : "hidden"
					}`}
				onClick={() => setPayloadModal(null)}
			/>
			<div
				className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${payloadModal ? "" : "pointer-events-none"
					}`}
				onClick={() => setPayloadModal(null)}
				aria-hidden={!payloadModal}
			>
				<div
					className={`w-full max-w-2xl bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out ${payloadModal ? "scale-100 opacity-100" : "scale-95 opacity-0"
						}`}
					onClick={(event) => event.stopPropagation()}
				>
					<div className="p-6 border-b border-border-light flex items-center justify-between">
						<div>
							<h3 className="text-lg font-bold text-slate-900">
								{payloadModal?.title ?? "Payload"}
							</h3>
							<p className="text-sm text-slate-500 mt-1">Raw payload for inspection.</p>
						</div>
						<button
							type="button"
							onClick={() => setPayloadModal(null)}
							className="p-2 hover:bg-slate-100 rounded-full transition-colors"
						>
							<span className="material-symbols-outlined">close</span>
						</button>
					</div>
					<div className="p-6">
						<div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200/70 bg-slate-50 p-3 text-[11px] text-slate-600 custom-scrollbar">
							{payloadModal?.payload ? (
								<pre className="whitespace-pre-wrap break-words">
									{JSON.stringify(payloadModal.payload, null, 2)}
								</pre>
							) : (
								<p className="text-slate-400">Kein Payload vorhanden.</p>
							)}
						</div>
					</div>
					<div className="p-6 border-t border-border-light bg-slate-50 flex justify-end rounded-b-2xl">
						<button
							type="button"
							onClick={() => setPayloadModal(null)}
							className="px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
						>
							Close
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

