"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Project = {
  id: string;
  name: string;
  baseCurrency: string;
  riskProfile: "conservative" | "balanced" | "aggressive" | null;
  createdAt: string;
  updatedAt: string;
};

type Position = {
  id: string;
  projectId: string;
  isin: string;
  side: "put" | "call";
  size: number;
  entryPrice: number;
  createdAt: string;
};

type RatioSummary = {
  totalPuts: number;
  totalCalls: number;
  ratio: number | null;
};

type ProjectDetailResponse = {
  project: Project;
  positions: Position[];
  ratioSummary: RatioSummary;
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;
  const [project, setProject] = useState<Project | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [ratioSummary, setRatioSummary] = useState<RatioSummary>({
    totalPuts: 0,
    totalCalls: 0,
    ratio: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isin, setIsin] = useState("");
  const [side, setSide] = useState<Position["side"]>("call");
  const [size, setSize] = useState(1);
  const [entryPrice, setEntryPrice] = useState<number | "">("");

  const canAdd = useMemo(
    () => Boolean(isin.trim()) && Number(size) > 0 && entryPrice !== "",
    [isin, size, entryPrice]
  );

  async function loadProject() {
    if (!projectId) return;
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = (await response.json().catch(() => null)) as
        | ProjectDetailResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data && "error" in data ? data.error || "Failed to load" : "Failed to load");
      }

      if (data && "project" in data) {
        setProject(data.project);
        setPositions(data.positions ?? []);
        setRatioSummary(data.ratioSummary ?? { totalPuts: 0, totalCalls: 0, ratio: null });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load project";
      setError(message);
    }
  }

  async function handleAddPosition() {
    if (!projectId || !canAdd) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isin: isin.trim(),
          side,
          size: Number(size),
          entryPrice: Number(entryPrice),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | { position?: Position }
        | null;

      if (!response.ok) {
        const errorMessage =
          payload && "error" in payload ? payload.error ?? "Unable to add position" : "Unable to add position";
        throw new Error(errorMessage);
      }

      setIsin("");
      setSide("call");
      setSize(1);
      setEntryPrice("");
      await loadProject();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to add position";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePosition(positionId: string) {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/positions/${positionId}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        const errorMessage =
          payload && "error" in payload ? payload.error ?? "Unable to delete position" : "Unable to delete position";
        throw new Error(errorMessage);
      }

      await loadProject();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete position";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProject();
  }, [projectId]);

  if (!project) {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 bg-white">
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          {error ? error : "Loading project..."}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col gap-6 bg-white">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-slate-900">{project.name}</h2>
        <div className="text-sm text-slate-500">
          Base {project.baseCurrency}
          {project.riskProfile ? ` · ${project.riskProfile}` : ""}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.4fr] gap-6">
        <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            Add Position
          </h3>
          <div className="grid gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">ISIN</label>
              <input
                value={isin}
                onChange={(event) => setIsin(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm font-mono"
                placeholder="DE000..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Side</label>
                <select
                  value={side}
                  onChange={(event) => setSide(event.target.value as Position["side"])}
                  className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm bg-white"
                >
                  <option value="call">Call</option>
                  <option value="put">Put</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Size</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={size}
                  onChange={(event) => setSize(Number(event.target.value))}
                  className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Entry price</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={entryPrice}
                onChange={(event) =>
                  setEntryPrice(event.target.value === "" ? "" : Number(event.target.value))
                }
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleAddPosition}
              disabled={!canAdd || loading}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "Saving..." : "Add position"}
            </button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            Put/Call Summary
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl border border-border-light bg-slate-50 p-4">
              <div className="text-xs uppercase text-slate-500">Total puts</div>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {ratioSummary.totalPuts}
              </div>
            </div>
            <div className="rounded-xl border border-border-light bg-slate-50 p-4">
              <div className="text-xs uppercase text-slate-500">Total calls</div>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {ratioSummary.totalCalls}
              </div>
            </div>
            <div className="rounded-xl border border-border-light bg-slate-50 p-4">
              <div className="text-xs uppercase text-slate-500">Ratio</div>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {ratioSummary.ratio === null ? "—" : ratioSummary.ratio.toFixed(2)}
              </div>
              {ratioSummary.ratio === null ? (
                <div className="text-[11px] text-slate-400 mt-1">
                  Add a call position to compute.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
          Positions
        </h3>
        {positions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No positions yet. Add a put or call to start tracking.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border-light">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">ISIN</th>
                  <th className="px-4 py-3 text-left font-semibold">Side</th>
                  <th className="px-4 py-3 text-right font-semibold">Size</th>
                  <th className="px-4 py-3 text-right font-semibold">Entry price</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {positions.map((position) => (
                  <tr key={position.id} className="bg-white">
                    <td className="px-4 py-3 font-mono text-slate-700">{position.isin}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{position.side}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{position.size}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {position.entryPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeletePosition(position.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                        disabled={loading}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
