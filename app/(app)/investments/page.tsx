"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type Investment = {
  id: string;
  isin: string;
  name: string;
  shares: number;
  buyInPrice: number;
  currentPrice: number;
  expectedPrice?: number;
  currency: string;
  status?: "open" | "sold";
  soldPrice?: number;
};

type InvestmentsResponse = {
  investments: Investment[];
};

type OptionsPosition = {
  id: string;
  projectId?: string | null;
  projectName: string;
  baseCurrency: string;
  name?: string;
  isin: string;
  side: "put" | "call";
  size: number;
  entryPrice: number;
  pricingMode?: "market" | "model";
  marketPrice?: number;
  computed?: { fairValue: number };
};

type OptionsPositionsResponse = {
  positions: OptionsPosition[];
};

type CryptoPosition = {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  buyInPrice: number;
  currentPrice: number;
  expectedPrice?: number;
  currency: string;
};

type CryptoPositionsResponse = {
  positions: CryptoPosition[];
};

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

const investmentTableColumns = [
  "w-[220px]",
  "w-[140px]",
  "w-[90px]",
  "w-[110px]",
  "w-[110px]",
  "w-[140px]",
  "w-[140px]",
  "w-[110px]",
  "w-[110px]",
  "w-[110px]",
  "w-[150px]",
  "w-[120px]",
  "w-[170px]",
];

function IsinTooltip({ isin }: { isin?: string }) {
  if (!isin) return null;
  return (
    <span
      title={`ISIN: ${isin}`}
      aria-label={`ISIN ${isin}`}
      className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[9px] font-bold text-slate-500"
    >
      i
    </span>
  );
}

type TotalsRow = {
  currency: string;
  invested: number;
  valueAtSell: number;
  gain: number;
  taxes: number;
  gainAfterTax: number;
  netValue: number;
};

function addTotals(
  totals: Record<string, TotalsRow>,
  currency: string,
  invested: number,
  valueAtSell: number,
  gain: number,
  taxes: number,
  gainAfterTax: number,
  netValue: number
) {
  const key = currency || "N/A";
  const current = totals[key] ?? {
    currency: key,
    invested: 0,
    valueAtSell: 0,
    gain: 0,
    taxes: 0,
    gainAfterTax: 0,
    netValue: 0,
  };
  current.invested += invested;
  current.valueAtSell += valueAtSell;
  current.gain += gain;
  current.taxes += taxes;
  current.gainAfterTax += gainAfterTax;
  current.netValue += netValue;
  totals[key] = current;
}

type EditingCell = {
  table: "investments" | "options" | "crypto";
  id: string;
  field: string;
};

type EditableCellProps = {
  active: boolean;
  display: ReactNode;
  value: string;
  onStart: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  inputType?: "text" | "number";
  align?: "left" | "right";
  disabled?: boolean;
};

function EditableCell({
  active,
  display,
  value,
  onStart,
  onChange,
  onSave,
  onCancel,
  inputType = "text",
  align = "left",
  disabled,
}: EditableCellProps) {
  if (active) {
    return (
      <input
        autoFocus
        type={inputType}
        value={value}
        min={inputType === "number" ? 0 : undefined}
        step={inputType === "number" ? 0.01 : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onSave}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onSave();
          } else if (event.key === "Escape") {
            onCancel();
          }
        }}
        className={`w-full rounded-md border border-border-light bg-white px-2 py-1 text-xs text-slate-700 ${
          align === "right" ? "text-right" : "text-left"
        }`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onStart}
      disabled={disabled}
      className={`w-full text-sm ${
        align === "right" ? "text-right" : "text-left"
      } font-mono text-slate-700 hover:text-slate-900 ${
        disabled ? "cursor-not-allowed" : "cursor-text"
      }`}
    >
      {display}
    </button>
  );
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [optionsPositions, setOptionsPositions] = useState<OptionsPosition[]>([]);
  const [cryptoPositions, setCryptoPositions] = useState<CryptoPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [cryptoError, setCryptoError] = useState<string | null>(null);
  const [soldPriceById, setSoldPriceById] = useState<Record<string, string>>({});
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [addingInvestment, setAddingInvestment] = useState(false);
  const [addingOptions, setAddingOptions] = useState(false);
  const [addingCrypto, setAddingCrypto] = useState(false);

  const openInvestments = useMemo(
    () => investments.filter((investment) => investment.status !== "sold"),
    [investments]
  );

  const summaryRows = useMemo(() => {
    const totals: Record<string, TotalsRow> = {};

    openInvestments.forEach((investment) => {
      const sellPrice = investment.expectedPrice ?? investment.currentPrice;
      const invested = investment.shares * investment.buyInPrice;
      const valueAtSell = investment.shares * sellPrice;
      const gain = valueAtSell - invested;
      const taxes = gain > 0 ? gain * 0.25 : 0;
      const gainAfterTax = gain - taxes;
      const netValue = valueAtSell - taxes;
      addTotals(
        totals,
        investment.currency,
        invested,
        valueAtSell,
        gain,
        taxes,
        gainAfterTax,
        netValue
      );
    });

    optionsPositions.forEach((position) => {
      const mode = position.pricingMode ?? "market";
      const sellPrice =
        mode === "model"
          ? position.computed?.fairValue ?? position.entryPrice
          : position.marketPrice ?? position.entryPrice;
      const invested = position.size * position.entryPrice;
      const valueAtSell = position.size * sellPrice;
      const gain = valueAtSell - invested;
      const taxes = gain > 0 ? gain * 0.25 : 0;
      const gainAfterTax = gain - taxes;
      const netValue = valueAtSell - taxes;
      addTotals(
        totals,
        position.baseCurrency,
        invested,
        valueAtSell,
        gain,
        taxes,
        gainAfterTax,
        netValue
      );
    });

    cryptoPositions.forEach((position) => {
      const sellPrice = position.expectedPrice ?? position.currentPrice;
      const invested = position.shares * position.buyInPrice;
      const valueAtSell = position.shares * sellPrice;
      const gain = valueAtSell - invested;
      const taxes = gain > 0 ? gain * 0.25 : 0;
      const gainAfterTax = gain - taxes;
      const netValue = valueAtSell - taxes;
      addTotals(
        totals,
        position.currency,
        invested,
        valueAtSell,
        gain,
        taxes,
        gainAfterTax,
        netValue
      );
    });

    return Object.values(totals);
  }, [cryptoPositions, openInvestments, optionsPositions]);

  async function loadInvestments() {
    setError(null);
    setOptionsError(null);
    setCryptoError(null);
    const [investmentsResult, optionsResult] = await Promise.allSettled([
      fetch("/api/investments"),
      fetch("/api/optionsschein/positions"),
    ]);

    try {
      if (investmentsResult.status === "fulfilled") {
        const data = (await investmentsResult.value.json().catch(() => null)) as
          | InvestmentsResponse
          | null;
        if (!investmentsResult.value.ok || !data) {
          throw new Error("Unable to load investments");
        }
        setInvestments(data.investments ?? []);
      } else {
        throw new Error("Unable to load investments");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load investments";
      setError(message);
    }

    try {
      if (optionsResult.status === "fulfilled") {
        const data = (await optionsResult.value.json().catch(() => null)) as
          | OptionsPositionsResponse
          | null;
        if (!optionsResult.value.ok || !data) {
          throw new Error("Unable to load OS positions");
        }
        setOptionsPositions(data.positions ?? []);
      } else {
        throw new Error("Unable to load OS positions");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load OS positions";
      setOptionsError(message);
    }

    try {
      const response = await fetch("/api/crypto");
      const data = (await response.json().catch(() => null)) as CryptoPositionsResponse | null;
      if (!response.ok || !data) {
        throw new Error("Unable to load crypto positions");
      }
      setCryptoPositions(data.positions ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load crypto positions";
      setCryptoError(message);
    }
  }

  function beginEdit(cell: EditingCell, value: string | number | null | undefined) {
    setEditingCell(cell);
    setDraftValue(value === null || value === undefined ? "" : String(value));
  }

  function cancelEdit() {
    setEditingCell(null);
    setDraftValue("");
  }

  async function saveEdit() {
    if (!editingCell) return;
    const value = draftValue.trim();
    const savingKey = `${editingCell.table}:${editingCell.id}:${editingCell.field}`;

    try {
      if (editingCell.table === "investments") {
        const payload: Record<string, string | number> = {};
        if (editingCell.field === "name") {
          if (!value) {
            setError("Name is required.");
            return;
          }
          payload.name = value;
        } else if (editingCell.field === "isin") {
          if (value.length < 6) {
            setError("Invalid ISIN.");
            return;
          }
          payload.isin = value;
        } else {
          const parsed = Number(value);
          if (!value || Number.isNaN(parsed)) {
            setError("Please enter a valid number.");
            return;
          }
          if (editingCell.field === "shares") payload.shares = parsed;
          if (editingCell.field === "buyInPrice") payload.buyInPrice = parsed;
          if (editingCell.field === "expectedPrice") payload.expectedPrice = parsed;
          if (editingCell.field === "currentPrice") payload.currentPrice = parsed;
        }

        setSavingCell(savingKey);
        const response = await fetch(`/api/investments/${editingCell.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | { investment?: Investment }
          | null;

        if (!response.ok) {
          const message =
            result && "error" in result
              ? result.error ?? "Unable to update investment"
              : "Unable to update investment";
          throw new Error(message);
        }
      } else {
        if (editingCell.table === "crypto") {
          const position = cryptoPositions.find((item) => item.id === editingCell.id);
          if (!position) {
            throw new Error("Position not found");
          }

          const payload: Record<string, string | number> = {};
          if (editingCell.field === "name") {
            if (!value) {
              setCryptoError("Name is required.");
              return;
            }
            payload.name = value;
          } else if (editingCell.field === "symbol") {
            if (!value) {
              setCryptoError("Symbol is required.");
              return;
            }
            payload.symbol = value;
          } else {
            const parsed = Number(value);
            if (!value || Number.isNaN(parsed)) {
              setCryptoError("Please enter a valid number.");
              return;
            }
            if (editingCell.field === "shares") payload.shares = parsed;
            if (editingCell.field === "buyInPrice") payload.buyInPrice = parsed;
            if (editingCell.field === "expectedPrice") payload.expectedPrice = parsed;
            if (editingCell.field === "currentPrice") payload.currentPrice = parsed;
          }

          setSavingCell(savingKey);
          const response = await fetch(`/api/crypto/${position.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const result = (await response.json().catch(() => null)) as
            | { error?: string }
            | { position?: CryptoPosition }
            | null;

          if (!response.ok) {
            const message =
              result && "error" in result
                ? result.error ?? "Unable to update position"
                : "Unable to update position";
            throw new Error(message);
          }

          await loadInvestments();
          cancelEdit();
          return;
        }

        const position = optionsPositions.find((item) => item.id === editingCell.id);
        if (!position) {
          throw new Error("Position not found");
        }

        const payload: Record<string, string | number> = {};
        if (editingCell.field === "name") {
          if (!value) {
            setOptionsError("Name is required.");
            return;
          }
          payload.name = value;
        } else if (editingCell.field === "isin") {
          if (value.length < 6) {
            setOptionsError("Invalid ISIN.");
            return;
          }
          payload.isin = value;
        } else {
          const parsed = Number(value);
          if (!value || Number.isNaN(parsed)) {
            setOptionsError("Please enter a valid number.");
            return;
          }
          if (editingCell.field === "size") payload.size = parsed;
          if (editingCell.field === "entryPrice") payload.entryPrice = parsed;
          if (editingCell.field === "marketPrice") payload.marketPrice = parsed;
        }

        setSavingCell(savingKey);
        const response = position.projectId
          ? await fetch(`/api/projects/${position.projectId}/positions/${position.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/optionsschein/positions/${position.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | { position?: OptionsPosition }
          | null;

        if (!response.ok) {
          const message =
            result && "error" in result
              ? result.error ?? "Unable to update position"
              : "Unable to update position";
          throw new Error(message);
        }
      }

      await loadInvestments();
      cancelEdit();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update";
      if (editingCell.table === "investments") {
        setError(message);
      } else {
        setOptionsError(message);
      }
    } finally {
      setSavingCell(null);
    }
  }

  async function handleAddInvestment() {
    setAddingInvestment(true);
    setError(null);
    try {
      const response = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Position",
          isin: "NEWPOS",
          shares: 1,
          buyInPrice: 0,
          currentPrice: 0,
          expectedPrice: 0,
          currency: "EUR",
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | { investment?: Investment }
        | null;
      if (!response.ok || !payload || "error" in payload) {
        throw new Error(payload && "error" in payload ? payload.error : "Unable to add");
      }
      const newInvestment = payload.investment;
      await loadInvestments();
      if (newInvestment) {
        setEditingCell({
          table: "investments",
          id: newInvestment.id,
          field: "name",
        });
        setDraftValue(newInvestment.name ?? "");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to add investment";
      setError(message);
    } finally {
      setAddingInvestment(false);
    }
  }

  async function handleAddOptions() {
    setAddingOptions(true);
    setOptionsError(null);
    try {
      const response = await fetch("/api/optionsschein/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New OS Position",
          isin: "NEWOS1",
          side: "call",
          size: 1,
          entryPrice: 0,
          pricingMode: "market",
          marketPrice: 0,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | { position?: OptionsPosition }
        | null;
      if (!response.ok || !payload || "error" in payload) {
        throw new Error(payload && "error" in payload ? payload.error : "Unable to add");
      }
      const newPosition = payload.position;
      await loadInvestments();
      if (newPosition) {
        setEditingCell({ table: "options", id: newPosition.id, field: "name" });
        setDraftValue(newPosition.name ?? "");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to add OS position";
      setOptionsError(message);
    } finally {
      setAddingOptions(false);
    }
  }

  async function handleAddCrypto() {
    setAddingCrypto(true);
    setCryptoError(null);
    try {
      const response = await fetch("/api/crypto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Crypto",
          symbol: "NEW",
          shares: 1,
          buyInPrice: 0,
          currentPrice: 0,
          expectedPrice: 0,
          currency: "EUR",
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | { position?: CryptoPosition }
        | null;
      if (!response.ok || !payload || "error" in payload) {
        throw new Error(payload && "error" in payload ? payload.error : "Unable to add");
      }
      const newPosition = payload.position;
      await loadInvestments();
      if (newPosition) {
        setEditingCell({ table: "crypto", id: newPosition.id, field: "name" });
        setDraftValue(newPosition.name ?? "");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to add crypto position";
      setCryptoError(message);
    } finally {
      setAddingCrypto(false);
    }
  }

  async function handleMarkSold(investmentId: string) {
    const rawPrice = soldPriceById[investmentId];
    const soldPrice = Number(rawPrice);
    if (!rawPrice || Number.isNaN(soldPrice)) {
      setError("Please enter a valid sold price.");
      return;
    }

    setSellingId(investmentId);
    setError(null);
    try {
      const response = await fetch(`/api/investments/${investmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sold", soldPrice }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | { investment?: Investment }
        | null;

      if (!response.ok) {
        const message =
          payload && "error" in payload
            ? payload.error ?? "Unable to update investment"
            : "Unable to update investment";
        throw new Error(message);
      }

      setSoldPriceById((prev) => {
        const next = { ...prev };
        delete next[investmentId];
        return next;
      });
      await loadInvestments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update investment";
      setError(message);
    } finally {
      setSellingId(null);
    }
  }

  useEffect(() => {
    setLoading(true);
    void loadInvestments().finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Investments</h2>
          <p className="text-sm text-slate-500 mt-1">
            Track buy-in, shares, and expected targets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Positions</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">Auto-synced prices</span>
              <button
                type="button"
                onClick={handleAddInvestment}
                disabled={addingInvestment}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold disabled:opacity-60"
              >
                {addingInvestment ? "Adding..." : "Add New"}
              </button>
            </div>
          </div>
          {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
          {loading ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              Loading investments...
            </div>
          ) : openInvestments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              No open positions yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1550px] table-fixed text-left border-collapse">
                <colgroup>
                  {investmentTableColumns.map((className, index) => (
                    <col key={index} className={className} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-border-light">
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Position
                    </th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Details
                    </th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Anteile
                    </th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Kaufpreis
                    </th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Verkaufs-Kurs
                    </th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Investiertes Kapital
                    </th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Wert zu Kurs
                    </th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Gewinn
                    </th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Gewinn Prozent
                    </th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Steuern
                    </th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Gewinn nach Steuern
                    </th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Netto Wert
                    </th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {openInvestments.map((investment) => {
                    const sellPrice = investment.expectedPrice ?? investment.currentPrice;
                    const invested = investment.shares * investment.buyInPrice;
                    const valueAtSell = investment.shares * sellPrice;
                    const gain = valueAtSell - invested;
                    const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
                    const taxRate = 0.25;
                    const taxes = gain > 0 ? gain * taxRate : 0;
                    const gainAfterTax = gain - taxes;
                    const netValue = valueAtSell - taxes;
                    const gainColor = gain >= 0 ? "text-emerald-600" : "text-red-600";
                    const isSaving =
                      savingCell === `investments:${investment.id}:name` ||
                      savingCell === `investments:${investment.id}:isin` ||
                      savingCell === `investments:${investment.id}:shares` ||
                      savingCell === `investments:${investment.id}:buyInPrice` ||
                      savingCell === `investments:${investment.id}:expectedPrice`;

                    return (
                      <tr key={investment.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-sm font-bold text-slate-900">
                          <EditableCell
                            active={
                              editingCell?.table === "investments" &&
                              editingCell.id === investment.id &&
                              editingCell.field === "name"
                            }
                            display={
                              <span className="flex items-center gap-2">
                                <span>{investment.name}</span>
                                <IsinTooltip isin={investment.isin} />
                              </span>
                            }
                            value={draftValue}
                            onStart={() =>
                              beginEdit(
                                { table: "investments", id: investment.id, field: "name" },
                                investment.name
                              )
                            }
                            onChange={setDraftValue}
                            onSave={saveEdit}
                            onCancel={cancelEdit}
                            disabled={isSaving}
                          />
                        </td>
                        <td className="p-3 text-xs font-mono text-slate-500">
                          {investment.currency}
                        </td>
                        <td className="p-3 text-sm font-mono text-right">
                          <EditableCell
                            active={
                              editingCell?.table === "investments" &&
                              editingCell.id === investment.id &&
                              editingCell.field === "shares"
                            }
                            display={investment.shares}
                            value={draftValue}
                            onStart={() =>
                              beginEdit(
                                { table: "investments", id: investment.id, field: "shares" },
                                investment.shares
                              )
                            }
                            onChange={setDraftValue}
                            onSave={saveEdit}
                            onCancel={cancelEdit}
                            inputType="number"
                            align="right"
                            disabled={isSaving}
                          />
                        </td>
                        <td className="p-3 text-sm font-mono text-right">
                          <EditableCell
                            active={
                              editingCell?.table === "investments" &&
                              editingCell.id === investment.id &&
                              editingCell.field === "buyInPrice"
                            }
                            display={formatCurrency(investment.buyInPrice, investment.currency)}
                            value={draftValue}
                            onStart={() =>
                              beginEdit(
                                { table: "investments", id: investment.id, field: "buyInPrice" },
                                investment.buyInPrice
                              )
                            }
                            onChange={setDraftValue}
                            onSave={saveEdit}
                            onCancel={cancelEdit}
                            inputType="number"
                            align="right"
                            disabled={isSaving}
                          />
                        </td>
                        <td className="p-3 text-sm font-mono text-right">
                          <EditableCell
                            active={
                              editingCell?.table === "investments" &&
                              editingCell.id === investment.id &&
                              editingCell.field === "expectedPrice"
                            }
                            display={formatCurrency(sellPrice, investment.currency)}
                            value={draftValue}
                            onStart={() =>
                              beginEdit(
                                { table: "investments", id: investment.id, field: "expectedPrice" },
                                investment.expectedPrice ?? investment.currentPrice
                              )
                            }
                            onChange={setDraftValue}
                            onSave={saveEdit}
                            onCancel={cancelEdit}
                            inputType="number"
                            align="right"
                            disabled={isSaving}
                          />
                        </td>
                        <td className="p-3 text-sm font-mono text-right">
                          {formatCurrency(invested, investment.currency)}
                        </td>
                        <td className="p-3 text-sm font-mono text-right">
                          {formatCurrency(valueAtSell, investment.currency)}
                        </td>
                        <td className={`p-3 text-sm font-bold text-right ${gainColor}`}>
                          {gain >= 0 ? "+" : "-"}
                          {formatCurrency(Math.abs(gain), investment.currency)}
                        </td>
                        <td className={`p-3 text-sm font-bold text-right ${gainColor}`}>
                          {formatPercent(gainPct)}
                        </td>
                        <td className="p-3 text-sm font-mono text-right">
                          {formatCurrency(taxes, investment.currency)}
                        </td>
                        <td className={`p-3 text-sm font-bold text-right ${gainColor}`}>
                          {gainAfterTax >= 0 ? "+" : "-"}
                          {formatCurrency(Math.abs(gainAfterTax), investment.currency)}
                        </td>
                        <td className="p-3 text-sm font-mono text-right">
                          {formatCurrency(netValue, investment.currency)}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={soldPriceById[investment.id] ?? ""}
                              onChange={(event) =>
                                setSoldPriceById((prev) => ({
                                  ...prev,
                                  [investment.id]: event.target.value,
                                }))
                              }
                              className="w-28 rounded-md border border-border-light px-2 py-1 text-xs"
                              placeholder="Sold price"
                            />
                            <button
                              type="button"
                              onClick={() => handleMarkSold(investment.id)}
                              disabled={sellingId === investment.id}
                              className="text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-60"
                            >
                              {sellingId === investment.id ? "Saving..." : "Set sold"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8 border-t border-border-light pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                OS Positions
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">From projects</span>
                <button
                  type="button"
                  onClick={handleAddOptions}
                  disabled={addingOptions}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold disabled:opacity-60"
                >
                  {addingOptions ? "Adding..." : "Add New"}
                </button>
              </div>
            </div>
            {optionsError ? <p className="mb-3 text-sm text-red-600">{optionsError}</p> : null}
            {loading ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Loading OS positions...
              </div>
            ) : optionsPositions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                No OS positions yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1550px] table-fixed text-left border-collapse">
                  <colgroup>
                    {investmentTableColumns.map((className, index) => (
                      <col key={index} className={className} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-50 border-b border-border-light">
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Position
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Details
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Anteile
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Kaufpreis
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Verkaufs-Kurs
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Investiertes Kapital
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Wert zu Kurs
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Gewinn
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Gewinn Prozent
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Steuern
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Gewinn nach Steuern
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Netto Wert
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {optionsPositions.map((position) => {
                      const mode = position.pricingMode ?? "market";
                      const sellPrice =
                        mode === "model"
                          ? position.computed?.fairValue ?? position.entryPrice
                          : position.marketPrice ?? position.entryPrice;
                      const invested = position.size * position.entryPrice;
                      const valueAtSell = position.size * (sellPrice ?? 0);
                      const gain = valueAtSell - invested;
                      const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
                      const taxRate = 0.25;
                      const taxes = gain > 0 ? gain * taxRate : 0;
                      const gainAfterTax = gain - taxes;
                      const netValue = valueAtSell - taxes;
                      const gainColor = gain >= 0 ? "text-emerald-600" : "text-red-600";
                      const isSaving =
                        savingCell === `options:${position.id}:name` ||
                        savingCell === `options:${position.id}:size` ||
                        savingCell === `options:${position.id}:entryPrice` ||
                        savingCell === `options:${position.id}:marketPrice`;

                      return (
                        <tr key={position.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-sm font-bold text-slate-900">
                            <EditableCell
                              active={
                                editingCell?.table === "options" &&
                                editingCell.id === position.id &&
                                editingCell.field === "name"
                              }
                              display={
                                <span className="flex items-center gap-2">
                                  <span>{position.name ?? "OS Position"}</span>
                                  <IsinTooltip isin={position.isin} />
                                </span>
                              }
                              value={draftValue}
                              onStart={() =>
                                beginEdit(
                                  { table: "options", id: position.id, field: "name" },
                                  position.name ?? ""
                                )
                              }
                              onChange={setDraftValue}
                              onSave={saveEdit}
                              onCancel={cancelEdit}
                              disabled={isSaving}
                            />
                          </td>
                          <td className="p-3 text-sm font-semibold text-slate-700">
                            {position.projectName}
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            <EditableCell
                              active={
                                editingCell?.table === "options" &&
                                editingCell.id === position.id &&
                                editingCell.field === "size"
                              }
                              display={position.size}
                              value={draftValue}
                              onStart={() =>
                                beginEdit(
                                  { table: "options", id: position.id, field: "size" },
                                  position.size
                                )
                              }
                              onChange={setDraftValue}
                              onSave={saveEdit}
                              onCancel={cancelEdit}
                              inputType="number"
                              align="right"
                              disabled={isSaving}
                            />
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            <EditableCell
                              active={
                                editingCell?.table === "options" &&
                                editingCell.id === position.id &&
                                editingCell.field === "entryPrice"
                              }
                              display={formatCurrency(position.entryPrice, position.baseCurrency)}
                              value={draftValue}
                              onStart={() =>
                                beginEdit(
                                  { table: "options", id: position.id, field: "entryPrice" },
                                  position.entryPrice
                                )
                              }
                              onChange={setDraftValue}
                              onSave={saveEdit}
                              onCancel={cancelEdit}
                              inputType="number"
                              align="right"
                              disabled={isSaving}
                            />
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            {mode === "market" ? (
                              <EditableCell
                                active={
                                  editingCell?.table === "options" &&
                                  editingCell.id === position.id &&
                                  editingCell.field === "marketPrice"
                                }
                                display={
                                  sellPrice === undefined
                                    ? "—"
                                    : formatCurrency(sellPrice, position.baseCurrency)
                                }
                                value={draftValue}
                                onStart={() =>
                                  beginEdit(
                                    { table: "options", id: position.id, field: "marketPrice" },
                                    position.marketPrice ?? position.entryPrice
                                  )
                                }
                                onChange={setDraftValue}
                                onSave={saveEdit}
                                onCancel={cancelEdit}
                                inputType="number"
                                align="right"
                                disabled={isSaving}
                              />
                            ) : (
                              <span className="text-sm font-mono text-slate-500">
                                {sellPrice === undefined
                                  ? "—"
                                  : formatCurrency(sellPrice, position.baseCurrency)}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            {formatCurrency(invested, position.baseCurrency)}
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            {sellPrice === undefined
                              ? "—"
                              : formatCurrency(valueAtSell, position.baseCurrency)}
                          </td>
                          <td className={`p-3 text-sm font-bold text-right ${gainColor}`}>
                            {gain >= 0 ? "+" : "-"}
                            {formatCurrency(Math.abs(gain), position.baseCurrency)}
                          </td>
                          <td className={`p-3 text-sm font-bold text-right ${gainColor}`}>
                            {formatPercent(gainPct)}
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            {formatCurrency(taxes, position.baseCurrency)}
                          </td>
                          <td className={`p-3 text-sm font-bold text-right ${gainColor}`}>
                            {gainAfterTax >= 0 ? "+" : "-"}
                            {formatCurrency(Math.abs(gainAfterTax), position.baseCurrency)}
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            {formatCurrency(netValue, position.baseCurrency)}
                          </td>
                          <td className="p-3 text-sm font-mono text-right text-slate-400">—</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-border-light pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Crypto Positions
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">Spot holdings</span>
                <button
                  type="button"
                  onClick={handleAddCrypto}
                  disabled={addingCrypto}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold disabled:opacity-60"
                >
                  {addingCrypto ? "Adding..." : "Add New"}
                </button>
              </div>
            </div>
            {cryptoError ? <p className="mb-3 text-sm text-red-600">{cryptoError}</p> : null}
            {loading ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Loading crypto positions...
              </div>
            ) : cryptoPositions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                No crypto positions yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1550px] table-fixed text-left border-collapse">
                  <colgroup>
                    {investmentTableColumns.map((className, index) => (
                      <col key={index} className={className} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-50 border-b border-border-light">
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Position
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Details
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Anteile
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Kaufpreis
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Verkaufs-Kurs
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Investiertes Kapital
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Wert zu Kurs
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Gewinn
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Gewinn Prozent
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Steuern
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Gewinn nach Steuern
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Netto Wert
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cryptoPositions.map((position) => {
                      const sellPrice = position.expectedPrice ?? position.currentPrice;
                      const invested = position.shares * position.buyInPrice;
                      const valueAtSell = position.shares * sellPrice;
                      const gain = valueAtSell - invested;
                      const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
                      const taxRate = 0.25;
                      const taxes = gain > 0 ? gain * taxRate : 0;
                      const gainAfterTax = gain - taxes;
                      const netValue = valueAtSell - taxes;
                      const gainColor = gain >= 0 ? "text-emerald-600" : "text-red-600";
                      const isSaving =
                        savingCell === `crypto:${position.id}:name` ||
                        savingCell === `crypto:${position.id}:symbol` ||
                        savingCell === `crypto:${position.id}:shares` ||
                        savingCell === `crypto:${position.id}:buyInPrice` ||
                        savingCell === `crypto:${position.id}:expectedPrice` ||
                        savingCell === `crypto:${position.id}:currentPrice`;

                      return (
                        <tr key={position.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-sm font-bold text-slate-900">
                            <EditableCell
                              active={
                                editingCell?.table === "crypto" &&
                                editingCell.id === position.id &&
                                editingCell.field === "name"
                              }
                              display={position.name}
                              value={draftValue}
                              onStart={() =>
                                beginEdit(
                                  { table: "crypto", id: position.id, field: "name" },
                                  position.name
                                )
                              }
                              onChange={setDraftValue}
                              onSave={saveEdit}
                              onCancel={cancelEdit}
                              disabled={isSaving}
                            />
                          </td>
                          <td className="p-3 text-xs font-mono text-slate-500">
                            <EditableCell
                              active={
                                editingCell?.table === "crypto" &&
                                editingCell.id === position.id &&
                                editingCell.field === "symbol"
                              }
                              display={position.symbol}
                              value={draftValue}
                              onStart={() =>
                                beginEdit(
                                  { table: "crypto", id: position.id, field: "symbol" },
                                  position.symbol
                                )
                              }
                              onChange={setDraftValue}
                              onSave={saveEdit}
                              onCancel={cancelEdit}
                              inputType="text"
                              disabled={isSaving}
                            />
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            <EditableCell
                              active={
                                editingCell?.table === "crypto" &&
                                editingCell.id === position.id &&
                                editingCell.field === "shares"
                              }
                              display={position.shares}
                              value={draftValue}
                              onStart={() =>
                                beginEdit(
                                  { table: "crypto", id: position.id, field: "shares" },
                                  position.shares
                                )
                              }
                              onChange={setDraftValue}
                              onSave={saveEdit}
                              onCancel={cancelEdit}
                              inputType="number"
                              align="right"
                              disabled={isSaving}
                            />
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            <EditableCell
                              active={
                                editingCell?.table === "crypto" &&
                                editingCell.id === position.id &&
                                editingCell.field === "buyInPrice"
                              }
                              display={formatCurrency(position.buyInPrice, position.currency)}
                              value={draftValue}
                              onStart={() =>
                                beginEdit(
                                  { table: "crypto", id: position.id, field: "buyInPrice" },
                                  position.buyInPrice
                                )
                              }
                              onChange={setDraftValue}
                              onSave={saveEdit}
                              onCancel={cancelEdit}
                              inputType="number"
                              align="right"
                              disabled={isSaving}
                            />
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            <EditableCell
                              active={
                                editingCell?.table === "crypto" &&
                                editingCell.id === position.id &&
                                editingCell.field === "expectedPrice"
                              }
                              display={formatCurrency(sellPrice, position.currency)}
                              value={draftValue}
                              onStart={() =>
                                beginEdit(
                                  { table: "crypto", id: position.id, field: "expectedPrice" },
                                  position.expectedPrice ?? position.currentPrice
                                )
                              }
                              onChange={setDraftValue}
                              onSave={saveEdit}
                              onCancel={cancelEdit}
                              inputType="number"
                              align="right"
                              disabled={isSaving}
                            />
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            {formatCurrency(invested, position.currency)}
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            {formatCurrency(valueAtSell, position.currency)}
                          </td>
                          <td className={`p-3 text-sm font-bold text-right ${gainColor}`}>
                            {gain >= 0 ? "+" : "-"}
                            {formatCurrency(Math.abs(gain), position.currency)}
                          </td>
                          <td className={`p-3 text-sm font-bold text-right ${gainColor}`}>
                            {formatPercent(gainPct)}
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            {formatCurrency(taxes, position.currency)}
                          </td>
                          <td className={`p-3 text-sm font-bold text-right ${gainColor}`}>
                            {gainAfterTax >= 0 ? "+" : "-"}
                            {formatCurrency(Math.abs(gainAfterTax), position.currency)}
                          </td>
                        <td className="p-3 text-sm font-mono text-right">
                          {formatCurrency(netValue, position.currency)}
                        </td>
                        <td className="p-3 text-sm font-mono text-right text-slate-400">—</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-border-light pt-6">
          <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Summary
              </h3>
              <span className="text-xs font-semibold text-slate-500">All investments</span>
            </div>
            {summaryRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                No positions yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border-light">
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Currency
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Investiertes Kapital
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Wert zu Kurs
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Gewinn
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Steuern
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Gewinn nach Steuern
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Netto Wert
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summaryRows.map((row) => {
                      const gainColor =
                        row.gain >= 0 ? "text-emerald-600" : "text-red-600";
                      return (
                        <tr key={row.currency} className="hover:bg-slate-50/50">
                          <td className="p-3 text-sm font-semibold text-slate-700">
                            {row.currency}
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            {formatCurrency(row.invested, row.currency)}
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            {formatCurrency(row.valueAtSell, row.currency)}
                          </td>
                          <td className={`p-3 text-sm font-bold text-right ${gainColor}`}>
                            {row.gain >= 0 ? "+" : "-"}
                            {formatCurrency(Math.abs(row.gain), row.currency)}
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            {formatCurrency(row.taxes, row.currency)}
                          </td>
                          <td className={`p-3 text-sm font-bold text-right ${gainColor}`}>
                            {row.gainAfterTax >= 0 ? "+" : "-"}
                            {formatCurrency(Math.abs(row.gainAfterTax), row.currency)}
                          </td>
                          <td className="p-3 text-sm font-mono text-right">
                            {formatCurrency(row.netValue, row.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
