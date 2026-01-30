import React from "react";

type ResultCard = {
  title: string;
  value: string;
  delta: string;
  deltaTone: "positive" | "negative" | "neutral";
};

type ResultsCardsProps = {
  cards: ResultCard[];
};

export function ResultsCards({ cards }: ResultsCardsProps) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <span className="material-symbols-outlined text-base">analytics</span>
        <h3 className="text-sm font-bold uppercase tracking-wide">Ergebnisse der Analyse</h3>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <div className="text-xs uppercase text-slate-500">{card.title}</div>
            <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {card.value}
            </div>
            <div className="text-[11px] text-slate-400">Fairer Wert</div>
            <div
              className={`mt-1 text-xs font-semibold ${
                card.deltaTone === "positive"
                  ? "text-emerald-600"
                  : card.deltaTone === "negative"
                    ? "text-red-600"
                    : "text-slate-400"
              }`}
            >
              {card.delta}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
