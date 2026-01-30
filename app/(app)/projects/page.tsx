"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Project = {
  id: string;
  name: string;
  baseCurrency: string;
  riskProfile: "conservative" | "balanced" | "aggressive" | null;
  createdAt: string;
  updatedAt: string;
};

type ProjectsResponse = {
  projects: Project[];
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("EUR");
  const [riskProfile, setRiskProfile] = useState<"" | "conservative" | "balanced" | "aggressive">("");

  const canCreate = useMemo(() => Boolean(name.trim()), [name]);

  async function loadProjects() {
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) return;
      const data = (await response.json()) as ProjectsResponse;
      setProjects(data.projects ?? []);
    } catch {
      // ignore load errors
    }
  }

  async function handleCreateProject() {
    if (!canCreate) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          baseCurrency: baseCurrency.trim(),
          riskProfile: riskProfile || undefined,
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

      setName("");
      setRiskProfile("");
      await loadProjects();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create project";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Projects</h2>
        <p className="text-sm text-slate-500">
          Create a project to track positions and compute the put/call ratio.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.6fr] gap-6">
        <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            Create Project
          </h3>
          <div className="grid gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Project name
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                placeholder="My first project"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">
                  Base currency
                </label>
                <input
                  value={baseCurrency}
                  onChange={(event) => setBaseCurrency(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm uppercase"
                  placeholder="EUR"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">
                  Risk profile
                </label>
                <select
                  value={riskProfile}
                  onChange={(event) =>
                    setRiskProfile(
                      event.target.value as "" | "conservative" | "balanced" | "aggressive"
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm bg-white"
                >
                  <option value="">Optional</option>
                  <option value="conservative">Conservative</option>
                  <option value="balanced">Balanced</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreateProject}
              disabled={!canCreate || loading}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create project"}
            </button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            Your Projects
          </h3>
          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              No projects yet. Create your first project to begin tracking positions.
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <Link
                  href={`/projects/${project.id}`}
                  key={project.id}
                  className="rounded-xl border border-border-light bg-slate-50 p-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{project.name}</div>
                      <div className="text-xs text-slate-500">
                        Base {project.baseCurrency}
                        {project.riskProfile ? ` · ${project.riskProfile}` : ""}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">
                      Updated {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
