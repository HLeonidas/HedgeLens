import React from "react";

type KpiTile = {
  label: string;
  value: string;
  helper?: string;
};

type KpiTilesRowProps = {
  tiles: KpiTile[];
  details: Array<{ label: string; value: string }>;
};

export function KpiTilesRow({ tiles, details }: KpiTilesRowProps) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
              >
                <div className="text-xs uppercase text-slate-500">{tile.label}</div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {tile.value}
                </div>
                {tile.helper ? (
                  <div className="mt-1 text-[11px] text-slate-400">{tile.helper}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs font-bold uppercase text-slate-500">Details</div>
          <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300">
            {details.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span>{item.label}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
