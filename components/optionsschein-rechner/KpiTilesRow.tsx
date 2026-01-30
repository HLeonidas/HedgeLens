import React from "react";

type MetricItem = {
  label: string;
  value: string;
};

type MetricsSection = {
  title: string;
  items: MetricItem[];
};

type KpiTilesRowProps = {
  sections: MetricsSection[];
};

export function KpiTilesRow({ sections }: KpiTilesRowProps) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-3">
        {sections.map((section) => (
          <div
            key={section.title}
            className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <div className="text-xs font-bold uppercase text-slate-500">{section.title}</div>
            <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300">
              {section.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span>{item.label}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
