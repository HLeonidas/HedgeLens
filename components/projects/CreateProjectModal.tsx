"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Project = {
  id: string;
  name: string;
  baseCurrency: string;
  riskProfile: "conservative" | "balanced" | "aggressive" | null;
  description?: string | null;
  underlyingSymbol?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreateProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (project?: Project | null) => void;
  onCreatedFallback?: () => void | Promise<void>;
};

type CreateMode = "manual" | "ticker";

export function CreateProjectModal({
  open,
  onClose,
  onCreated,
  onCreatedFallback,
}: CreateProjectModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("EUR");
  const [description, setDescription] = useState("");
  const [createMode, setCreateMode] = useState<CreateMode>("ticker");
  const [tickerSymbol, setTickerSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = useMemo(() => {
    if (createMode === "ticker") return Boolean(tickerSymbol.trim());
    return Boolean(name.trim());
  }, [createMode, name, tickerSymbol]);

  async function handleCreateProject() {
    if (!canCreate) return;
    setLoading(true);
    setError(null);

    try {
      const response =
        createMode === "ticker"
          ? await fetch("/api/projects/from-ticker", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                symbol: tickerSymbol.trim(),
              }),
            })
          : await fetch("/api/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: name.trim(),
                baseCurrency: baseCurrency.trim(),
                description: description.trim() || undefined,
              }),
            });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | { project?: Project }
        | null;

      if (!response.ok) {
        const errorMessage =
          payload && "error" in payload ? payload.error ?? "Unable to create project" : "Unable to create project";
        throw new Error(errorMessage);
      }

      const createdProject = payload && "project" in payload ? payload.project : null;
      setName("");
      setDescription("");
      setTickerSymbol("");
      setCreateMode("ticker");
      onClose();

      if (onCreated) {
        onCreated(createdProject);
      } else if (createdProject?.id) {
        router.push(`/projects/${createdProject.id}`);
      } else if (onCreatedFallback) {
        await onCreatedFallback();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create project";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${open ? "" : "hidden"}`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${open ? "" : "pointer-events-none"}`}
        onClick={onClose}
        aria-hidden={!open}
      >
        <div
          className={`w-full max-w-md bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out flex flex-col ${open ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="p-6 border-b border-border-light flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Create new project</h2>
              <p className="text-xs text-slate-500">Configure your portfolio tracking</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCreateMode("manual")}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  createMode === "manual" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setCreateMode("ticker")}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  createMode === "ticker" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                From ticker
              </button>
            </div>

            {createMode === "ticker" ? (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Ticker</label>
                  <input
                    value={tickerSymbol}
                    onChange={(event) => setTickerSymbol(event.target.value)}
                    className="w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
                    placeholder="e.g. NASDAQ:COIN or COIN"
                  />
                </div>
                <div className="p-4 bg-slate-50 border border-border-light rounded-lg">
                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-slate-600">info</span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      The project is generated automatically from Massive API data. Name,
                      description, and currency are taken over.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Project name</label>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
                    placeholder="e.g. My first project"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Base currency</label>
                    <select
                      value={baseCurrency}
                      onChange={(event) => setBaseCurrency(event.target.value)}
                      className="w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50 uppercase"
                    >
                      {[
                        "EUR",
                        "USD",
                        "GBP",
                        "CHF",
                        "JPY",
                        "AUD",
                        "CAD",
                        "SEK",
                        "NOK",
                        "DKK",
                      ].map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Description (optional)</label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
                    rows={4}
                    placeholder="Goals and strategy for this project..."
                  />
                </div>
                <div className="p-4 bg-slate-50 border border-border-light rounded-lg">
                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-slate-600">info</span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      After creating the project, you can add ISINs or tickers to track positions
                      and start automated analysis.
                    </p>
                  </div>
                </div>
              </>
            )}
            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            ) : null}
          </div>
          <div className="p-6 border-t border-border-light bg-slate-50 flex gap-3 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateProject}
              disabled={!canCreate || loading}
              className="flex-1 px-5 py-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create project"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
