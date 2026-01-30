import React from "react";

type AssetLookupHeroProps = {
  lookupValue: string;
  onLookupValueChange: (value: string) => void;
  onLookup: () => void;
  loading?: boolean;
  positionSelect: React.ReactNode;
};

export function AssetLookupHero({
  lookupValue,
  onLookupValueChange,
  onLookup,
  loading,
  positionSelect,
}: AssetLookupHeroProps) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Institutional Asset Lookup
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Enter a valid ISIN to retrieve real-time market data and volatility metrics.
            </p>
          </div>
          {positionSelect}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-emerald-700">
              History Enabled
            </span>
            <span className="rounded-full border border-sky-200/70 bg-sky-50 px-3 py-1 text-sky-700">
              Auto-Update Enabled
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <label className="text-xs font-bold uppercase text-slate-500">ISIN Lookup</label>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2">
            <span className="material-symbols-outlined text-base text-slate-400">search</span>
            <input
              value={lookupValue}
              onChange={(event) => onLookupValueChange(event.target.value)}
              placeholder="DE000… or Asset Name"
              className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onLookup}
            disabled={loading}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base">travel_explore</span>
            {loading ? "Looking up..." : "Lookup ISIN"}
          </button>
        </div>
      </div>
    </div>
  );
}
