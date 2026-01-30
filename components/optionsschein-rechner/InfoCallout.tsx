import React from "react";

type InfoCalloutProps = {
  title: string;
  description: string;
};

export function InfoCallout({ title, description }: InfoCalloutProps) {
  return (
    <div className="rounded-2xl border border-sky-200/70 bg-sky-50/80 p-5 text-sky-900 shadow-sm dark:border-sky-800/60 dark:bg-slate-900 dark:text-sky-100">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-base">info</span>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <p className="mt-1 text-xs text-sky-800 dark:text-sky-200">{description}</p>
        </div>
      </div>
    </div>
  );
}
