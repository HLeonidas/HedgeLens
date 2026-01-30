import React from "react";

type ScenarioInput = {
  underlyingPrice: number | "";
  ratePct: number | "";
  volatilityPct: number | "";
  dividendYieldPct: number | "";
  valuationDate: string;
};

type ScenarioComparisonTableProps = {
  scenarios: ScenarioInput[];
  onScenarioChange: (index: number, field: keyof ScenarioInput, value: ScenarioInput[keyof ScenarioInput]) => void;
  disabled?: boolean;
  onLoadCurrent?: () => void;
};

export function ScenarioComparisonTable({
  scenarios,
  onScenarioChange,
  disabled,
  onLoadCurrent,
}: ScenarioComparisonTableProps) {
  return (
    <div className="relative rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Szenarien-Vergleich
          </h3>
          <p className="text-xs text-slate-500">
            Status Quo basiert auf den aktuellen Stammdaten.
          </p>
        </div>
        {onLoadCurrent ? (
          <button
            type="button"
            onClick={onLoadCurrent}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300"
          >
            <span className="material-symbols-outlined text-base">autorenew</span>
            Aktuelle Daten laden
          </button>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Parameter</th>
              {scenarios.map((_, index) => (
                <th key={`col-${index}`} className="px-3 py-2 text-center">
                  {index === 0 ? "Status Quo" : `Scenario ${index}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
            {[
              { label: "Basiswertkurs", field: "underlyingPrice" as const, helper: "Aktuell" },
              { label: "Zinssatz (%)", field: "ratePct" as const, helper: "Risk-free rate" },
              { label: "Volatilität (%)", field: "volatilityPct" as const, helper: "Imp. Volatility" },
              { label: "Dividende (%)", field: "dividendYieldPct" as const, helper: "Yield p.a." },
            ].map((row) => (
              <tr key={row.label}>
                <td className="px-3 py-3 font-semibold text-slate-600">
                  <div>{row.label}</div>
                  <div className="text-xs text-slate-400">{row.helper}</div>
                </td>
                {scenarios.map((scenario, index) => (
                  <td key={`${row.field}-${index}`} className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      disabled={disabled || index === 0}
                      value={scenario[row.field]}
                      onChange={(event) =>
                        onScenarioChange(
                          index,
                          row.field,
                          event.target.value === "" ? "" : Number(event.target.value)
                        )
                      }
                      className={`w-full rounded-lg border border-slate-200/70 bg-white px-2 py-1 text-sm dark:border-slate-800 dark:bg-slate-900 ${
                        disabled || index === 0 ? "opacity-60" : ""
                      }`}
                    />
                    {index === 0 && scenario[row.field] !== "" ? (
                      <div className="mt-1 text-[10px] text-slate-400">
                        {row.helper}: {scenario[row.field]}
                      </div>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="px-3 py-3 font-semibold text-slate-600">
                <div>Bewertungstag</div>
                <div className="text-xs text-slate-400">Target Date</div>
              </td>
              {scenarios.map((scenario, index) => (
                <td key={`date-${index}`} className="px-3 py-2">
                  <div className="relative">
                    <input
                      type="date"
                      disabled={disabled || index === 0}
                      value={scenario.valuationDate}
                      onChange={(event) => onScenarioChange(index, "valuationDate", event.target.value)}
                      className={`w-full rounded-lg border border-slate-200/70 bg-white px-2 py-1 pr-8 text-sm dark:border-slate-800 dark:bg-slate-900 ${
                        disabled || index === 0 ? "opacity-60" : ""
                      }`}
                    />
                    <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-base text-slate-400">
                      calendar_today
                    </span>
                  </div>
                  {index === 0 && scenario.valuationDate ? (
                    <div className="mt-1 text-[10px] text-slate-400">Status Quo</div>
                  ) : null}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {disabled ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 text-sm font-semibold text-slate-600 backdrop-blur-sm dark:bg-slate-950/70 dark:text-slate-200">
          Select an Optionsschein first
        </div>
      ) : null}
    </div>
  );
}
