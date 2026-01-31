import React from "react";

type PositionOption = {
  id: string;
  label: string;
};

type PositionSelectProps = {
  options: PositionOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  label?: string;
};

export function PositionSelect({
  options,
  selectedId,
  onSelect,
  searchValue,
  onSearchChange,
  label = "Select position",
}: PositionSelectProps) {
  return (
    <div>
      <label className="text-xs font-bold uppercase text-slate-500">{label}</label>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search ISIN or project"
          className="w-full rounded-lg border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        />
        <select
          value={selectedId ?? ""}
          onChange={(event) => onSelect(event.target.value || null)}
          className="rounded-lg border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
