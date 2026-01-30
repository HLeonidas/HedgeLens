import React from "react";

type ScenarioRow = {
  id: string;
  name: string;
  changePct: number | "";
};

type ScenarioResult = {
  fairValue: number | null;
  absChange: number | null;
  relChange: number | null;
  currency: string;
};

type ScenarioComparisonTableProps = {
  scenarios: ScenarioRow[];
  results: ScenarioResult[];
  currency: string;
  referencePrice: number | null;
  baseUnderlyingPrice: number | null;
  maxScenarios: number;
  onScenarioChange: (id: string, field: "name" | "changePct", value: string | number | "") => void;
  onRemoveScenario: (id: string) => void;
  onAddScenario: () => void;
};

function formatMaybe(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return "—";
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function formatCurrency(value: number | null | undefined, currency: string) {
  if (value === null || value === undefined) return "—";
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(2)} ${currency}`;
}

export function ScenarioComparisonTable({
  scenarios,
  results,
  currency,
  referencePrice,
  baseUnderlyingPrice,
  maxScenarios,
  onScenarioChange,
  onRemoveScenario,
  onAddScenario,
}: ScenarioComparisonTableProps) {
  return (
    <div className="relative rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Szenario-Ergebnisse
          </h3>
          <p className="text-xs text-slate-500">
            Referenzkurs: {referencePrice === null ? "—" : `${referencePrice.toFixed(4)} ${currency}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onAddScenario}
          disabled={scenarios.length >= maxScenarios}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Szenario hinzufügen
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Szenario</th>
              <th className="px-3 py-2 text-left">Basiswertänderung</th>
              <th className="px-3 py-2 text-left">Basiswert</th>
              <th className="px-3 py-2 text-left">Optionsschein-Preis</th>
              <th className="px-3 py-2 text-left">P/L</th>
              <th className="px-3 py-2 text-left">vs. Marktpreis</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
            {scenarios.map((scenario, index) => {
              const result = results[index];
              const changePct = index === 0 ? 0 : scenario.changePct;
              const changeValue = changePct === "" ? 0 : Number(changePct);
              const underlying =
                baseUnderlyingPrice !== null
                  ? baseUnderlyingPrice * (1 + changeValue / 100)
                  : null;
              const absChange = result?.absChange ?? null;
              const relChange = result?.relChange ?? null;

              return (
                <tr
                  key={scenario.id}
                  className={index === 0 ? "bg-slate-50/70 dark:bg-slate-900/40" : ""}
                >
                  <td className="px-3 py-3">
                    <input
                      value={scenario.name}
                      onChange={(event) => onScenarioChange(scenario.id, "name", event.target.value)}
                      disabled={index === 0}
                      className="w-full rounded-lg border border-slate-200/70 bg-white px-2 py-1 text-sm text-slate-700 disabled:opacity-60"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      min={-100}
                      step={0.5}
                      value={index === 0 ? 0 : scenario.changePct}
                      onChange={(event) =>
                        onScenarioChange(
                          scenario.id,
                          "changePct",
                          event.target.value === "" ? "" : Number(event.target.value)
                        )
                      }
                      disabled={index === 0}
                      className="w-full rounded-lg border border-slate-200/70 bg-white px-2 py-1 text-sm text-slate-700 disabled:opacity-60"
                    />
                    <div className="mt-1 text-[10px] text-slate-400">% Veränderung</div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {underlying === null ? "—" : formatMaybe(underlying, 2)}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {formatCurrency(result?.fairValue ?? null, currency)}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {absChange === null || relChange === null
                      ? "—"
                      : `${absChange >= 0 ? "+" : ""}${formatMaybe(absChange)} ${currency} (${relChange.toFixed(2)}%)`}
                  </td>
                  <td className="px-3 py-3">
                    {relChange === null ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${
                          relChange >= 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {relChange >= 0 ? "Premium" : "Discount"} {Math.abs(relChange).toFixed(2)}%
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {index === 0 ? null : (
                      <button
                        type="button"
                        onClick={() => onRemoveScenario(scenario.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-300"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                        Entfernen
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
