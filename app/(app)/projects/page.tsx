"use client";

import { useEffect, useMemo, useState } from "react";

type Instrument = {
  isin: string;
  name: string;
  issuer: string;
  type: "put" | "call";
  underlying: string;
  strike: number;
  expiry: string;
  currency: string;
  price: number;
  fetchedAt?: string;
};

type Project = {
  id: string;
  name: string;
  baseCurrency: string;
  createdAt: string;
  updatedAt: string;
  positions: Array<{
    id: string;
    isin: string;
    side: string;
    size: number;
    entryPrice: number;
    date: string;
    instrument?: {
      name: string | null;
      issuer: string | null;
      type: string | null;
      underlying: string | null;
      strike: number | null;
      expiry: string | null;
      currency: string | null;
      price: number | null;
    };
  }>;
};

export default function ProjectsPage() {
  const [isin, setIsin] = useState("");
  const [projectName, setProjectName] = useState("");
  const [size, setSize] = useState(1);
  const [entryPrice, setEntryPrice] = useState<number | "">("");
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLookup = useMemo(() => isin.trim().length > 0, [isin]);
  const canSave = useMemo(
    () => Boolean(projectName.trim() && instrument),
    [projectName, instrument]
  );

  async function loadProjects() {
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { projects?: Project[] };
      setProjects(data.projects ?? []);
    } catch {
      // ignore dashboard load errors
    }
  }

  async function handleLookup() {
    if (!canLookup) return;
    setError(null);
    setLoading(true);
    setInstrument(null);
    try {
      const response = await fetch("/api/isin/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isin }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Lookup failed");
      }
      const data = (await response.json()) as Instrument;
      setInstrument(data);
      setProjectName((prev) => prev || `Project ${data.isin}`);
      if (entryPrice === "") {
        setEntryPrice(data.price);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lookup failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!instrument || !canSave) return;
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName.trim(),
          baseCurrency: instrument.currency,
          instrument,
          position: {
            isin: instrument.isin,
            size: Number(size || 0),
            entryPrice: entryPrice === "" ? instrument.price : Number(entryPrice),
            side: instrument.type,
          },
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Save failed");
      }

      setProjectName("");
      setIsin("");
      setInstrument(null);
      setEntryPrice("");
      await loadProjects();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col gap-6 bg-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Projects</h2>
          <p className="text-sm text-slate-500">
            Lookup an ISIN, review details, and save a starter project.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
        <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            ISIN Lookup
          </h3>
          <div className="grid gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">ISIN</label>
              <input
                value={isin}
                onChange={(event) => setIsin(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                placeholder="DE000..."
              />
            </div>
            <button
              type="button"
              onClick={handleLookup}
              disabled={!canLookup || loading}
              className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "Loading..." : "Lookup ISIN"}
            </button>

            {instrument ? (
              <div className="rounded-xl border border-border-light bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">{instrument.name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {instrument.isin} · {instrument.issuer}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <div>Type: {instrument.type}</div>
                  <div>Underlying: {instrument.underlying}</div>
                  <div>Strike: {instrument.strike}</div>
                  <div>Expiry: {instrument.expiry}</div>
                  <div>Price: {instrument.price}</div>
                  <div>Currency: {instrument.currency}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            Save Project
          </h3>
          <div className="grid gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Project name
              </label>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                placeholder="My first project"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Size</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={size}
                  onChange={(event) => setSize(Number(event.target.value))}
                  className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">
                  Entry price
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={entryPrice}
                  onChange={(event) => setEntryPrice(event.target.value === "" ? "" : Number(event.target.value))}
                  className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || loading}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "Saving..." : "Create project"}
            </button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
          Recent Projects
        </h3>
        {projects.length === 0 ? (
          <p className="text-sm text-slate-500">No projects saved yet.</p>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="rounded-xl border border-border-light bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{project.name}</div>
                    <div className="text-xs text-slate-500">
                      Base: {project.baseCurrency}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-3 grid gap-2">
                  {project.positions.map((position) => (
                    <div
                      key={position.id}
                      className="flex flex-wrap items-center justify-between rounded-lg bg-white border border-border-light px-3 py-2 text-xs text-slate-600"
                    >
                      <span className="font-mono">{position.isin}</span>
                      <span>
                        {position.side} · {position.size} @ {position.entryPrice}
                      </span>
                      <span>{position.instrument?.name ?? "Instrument"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
