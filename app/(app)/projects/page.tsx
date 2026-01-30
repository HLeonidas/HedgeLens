"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Project = {
	id: string;
	name: string;
	baseCurrency: string;
	riskProfile: "conservative" | "balanced" | "aggressive" | null;
	underlyingSymbol?: string | null;
	color?: string | null;
	createdAt: string;
	updatedAt: string;
};

type ProjectsResponse = {
	projects: Project[];
};

type ProjectRatioResponse = {
	ratioSummary?: { ratio: number | null };
	positions?: Array<unknown>;
};

const riskProfileOptions = ["all", "conservative", "balanced", "aggressive", "custom"] as const;
type RiskFilter = (typeof riskProfileOptions)[number];

const projectColorPalette = [
  { bg: "bg-blue-100", text: "text-blue-600" },
  { bg: "bg-emerald-100", text: "text-emerald-600" },
  { bg: "bg-amber-100", text: "text-amber-600" },
  { bg: "bg-rose-100", text: "text-rose-600" },
  { bg: "bg-indigo-100", text: "text-indigo-600" },
  { bg: "bg-teal-100", text: "text-teal-600" },
] as const;

export default function ProjectsPage() {
	const router = useRouter();
	const [projects, setProjects] = useState<Project[]>([]);
	const [ratiosById, setRatiosById] = useState<Record<string, number | null>>({});
	const [positionsById, setPositionsById] = useState<Record<string, number>>({});
	const [isLoading, setIsLoading] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [listError, setListError] = useState<string | null>(null);
	const [name, setName] = useState("");
	const [baseCurrency, setBaseCurrency] = useState("EUR");
  const [riskProfile, setRiskProfile] = useState<"" | "conservative" | "balanced" | "aggressive">("");
  const [search, setSearch] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("all");
	const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [description, setDescription] = useState("");
  const [underlyingSymbol, setUnderlyingSymbol] = useState("");
  const [color, setColor] = useState("#2563eb");

	const canCreate = useMemo(() => Boolean(name.trim()), [name]);

	async function loadProjects() {
		setIsLoading(true);
		setListError(null);
		try {
			const response = await fetch("/api/projects");
			if (!response.ok) {
				throw new Error("Unable to load projects");
			}
			const data = (await response.json()) as ProjectsResponse;
			const nextProjects = data.projects ?? [];
			setProjects(nextProjects);

			const ratioEntries = await Promise.allSettled(
				nextProjects.map(async (project) => {
					const ratioResponse = await fetch(`/api/projects/${project.id}`);
					if (!ratioResponse.ok) {
						return { id: project.id, ratio: null, positions: 0 };
					}
					const ratioPayload = (await ratioResponse.json()) as ProjectRatioResponse;
					return {
						id: project.id,
						ratio: ratioPayload.ratioSummary?.ratio ?? null,
						positions: ratioPayload.positions?.length ?? 0,
					};
				})
			);

			const nextRatios: Record<string, number | null> = {};
			const nextPositions: Record<string, number> = {};
			ratioEntries.forEach((entry, index) => {
				if (entry.status === "fulfilled") {
					nextRatios[entry.value.id] = entry.value.ratio;
					nextPositions[entry.value.id] = entry.value.positions;
				} else if (nextProjects[index]?.id) {
					nextRatios[nextProjects[index].id] = null;
					nextPositions[nextProjects[index].id] = 0;
				}
			});
			setRatiosById(nextRatios);
			setPositionsById(nextPositions);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unable to load projects";
			setListError(message);
		} finally {
			setIsLoading(false);
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
          description: description.trim() || undefined,
          underlyingSymbol: underlyingSymbol.trim() || undefined,
          color: color.trim() || undefined,
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
      setRiskProfile("");
      setDescription("");
      setUnderlyingSymbol("");
      setColor("#2563eb");
      setShowCreate(false);
      if (createdProject?.id) {
        router.push(`/projects/${createdProject.id}`);
      } else {
        await loadProjects();
      }
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

	const currencyOptions = useMemo(() => {
		const values = new Set<string>();
		projects.forEach((project) => {
			if (project.baseCurrency) values.add(project.baseCurrency.toUpperCase());
		});
		return ["all", ...Array.from(values)];
	}, [projects]);

	const filteredProjects = useMemo(() => {
		const query = search.trim().toLowerCase();
		return projects.filter((project) => {
			const matchesQuery = !query || project.name.toLowerCase().includes(query);
			const matchesCurrency =
				currencyFilter === "all" ||
				project.baseCurrency.toUpperCase() === currencyFilter.toUpperCase();
			const projectRisk = project.riskProfile ?? "custom";
			const matchesRisk = riskFilter === "all" || projectRisk === riskFilter;
			return matchesQuery && matchesCurrency && matchesRisk;
		});
	}, [projects, search, currencyFilter, riskFilter]);

	function getRiskBadge(profile: Project["riskProfile"]) {
		if (!profile) return { label: "Custom", classes: "bg-slate-100 text-slate-600" };
		if (profile === "conservative") return { label: "Conservative", classes: "bg-emerald-100 text-emerald-700" };
		if (profile === "balanced") return { label: "Balanced", classes: "bg-sky-100 text-sky-700" };
		return { label: "Aggressive", classes: "bg-rose-100 text-rose-700" };
	}

  function ratioBarColor(value: number) {
    if (value >= 1.5) return "bg-rose-500";
    if (value >= 1.2) return "bg-orange-500";
    if (value >= 1.0) return "bg-amber-500";
    if (value >= 0.8) return "bg-emerald-500";
    return "bg-sky-500";
  }

  function projectColor(projectId: string, customColor?: string | null) {
    if (customColor) {
      return { style: { backgroundColor: customColor }, textClass: "text-white", className: "" };
    }
    const index = Math.abs(
      projectId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
    );
    const palette = projectColorPalette[index % projectColorPalette.length];
    return { className: `${palette.bg} ${palette.text}`, textClass: "" };
  }

  function riskIcon(profile: Project["riskProfile"]) {
    if (profile === "conservative") {
      return {
        icon: "shield",
      };
    }
    if (profile === "balanced") {
      return {
        icon: "balance",
      };
    }
    if (profile === "aggressive") {
      return {
        icon: "show_chart",
      };
    }
    return {
      icon: "insights",
    };
  }

  function underlyingTag(symbol?: string | null) {
    if (!symbol) return "—";
    const trimmed = symbol.replace(/\s+/g, "");
    return trimmed.slice(-4).toUpperCase();
  }

	function handleRowClick(projectId: string) {
		router.push(`/projects/${projectId}`);
	}

	return (
		<div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
			<div className="max-w-7xl mx-auto flex flex-col gap-6">
				<div className="flex flex-col gap-4">
					<div>
						<h2 className="text-3xl font-black text-slate-900 tracking-tight">Projects</h2>
						<p className="text-sm text-slate-500 mt-1">
							Strategy containers for put/call warrants, ratios, and analytics.
						</p>
					</div>

					<div className="rounded-2xl border border-border-light bg-white shadow-sm p-4 flex flex-col gap-4">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
							<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
								<div className="flex items-center gap-2 rounded-lg border border-border-light px-4 py-3 text-sm text-slate-500 bg-slate-50">
									<span className="material-symbols-outlined text-base">search</span>
									<input
										value={search}
										onChange={(event) => setSearch(event.target.value)}
										placeholder="Search projects..."
										className="w-full bg-transparent outline-none text-slate-700 text-sm font-semibold"
									/>
								</div>
								<select
									value={currencyFilter}
									onChange={(event) => setCurrencyFilter(event.target.value)}
									className="rounded-lg border border-border-light px-4 py-3 text-sm font-semibold text-slate-600 bg-white"
								>
									{currencyOptions.map((currency) => (
										<option key={currency} value={currency}>
											{currency === "all" ? "Currency: All" : currency}
										</option>
									))}
								</select>
								<select
									value={riskFilter}
									onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}
									className="rounded-lg border border-border-light px-4 py-3 text-sm font-semibold text-slate-600 bg-white"
								>
									{riskProfileOptions.map((risk) => (
										<option key={risk} value={risk}>
											{risk === "all" ? "Risk: All" : risk[0].toUpperCase() + risk.slice(1)}
										</option>
									))}
								</select>
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
								onClick={() => setShowCreate((prev) => !prev)}
								className="px-5 py-3 rounded-lg bg-primary hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
							>
								{showCreate ? "Close" : "Create Project"}
							</button>
						</div>
						</div>
					</div>
				</div>

						<div className="rounded-2xl border border-border-light bg-white shadow-sm">
				{listError ? (
					<div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/40 p-6 text-sm text-rose-700">
						{listError}
					</div>
				) : isLoading ? (
					<div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
						Loading projects...
					</div>
				) : projects.length === 0 ? (
					<div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
						No projects yet. Create your first project to begin tracking positions.
					</div>
				) : filteredProjects.length === 0 ? (
					<div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
						No projects match your filters.
						<button
							type="button"
							onClick={() => {
								setSearch("");
								setCurrencyFilter("all");
								setRiskFilter("all");
							}}
							className="ml-2 text-slate-900 font-semibold underline"
						>
							Reset filters
						</button>
					</div>
        ) : (
          <div className="rounded-xl border border-border-light overflow-hidden bg-white">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full min-w-[980px] text-left border-collapse">
                <thead>
                  <tr className="text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-border-light">
                    <th className="px-6 py-4">Projektname</th>
                    <th className="px-6 py-4">Basiswährung</th>
                    <th className="px-6 py-4">Risikoprofil</th>
                    <th className="px-6 py-4">Put/Call Ratio</th>
                    <th className="px-6 py-4">Positionen</th>
                    <th className="px-6 py-4">Zuletzt aktualisiert</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {filteredProjects.map((project, index) => {
                    const riskBadge = getRiskBadge(project.riskProfile);
                    const ratio = ratiosById[project.id] ?? null;
                    const positions = positionsById[project.id] ?? 0;
                    const iconMeta = riskIcon(project.riskProfile);
                    const colorMeta = projectColor(project.id, project.color);
                    const isLastRow = index === filteredProjects.length - 1;
                    return (
                      <tr
                        key={project.id}
                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                        onClick={() => handleRowClick(project.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleRowClick(project.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded flex items-center justify-center ${colorMeta.className ?? ""} ${colorMeta.textClass ?? ""}`}
                              style={colorMeta.style}
                            >
                              <span className="text-[10px] font-bold tracking-widest">
                                {underlyingTag(project.underlyingSymbol)}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900">
                                {project.name}
                              </span>
                              <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                                ID: {project.id.slice(0, 6).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700 uppercase">
                          <span className="inline-flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-slate-400">
                              {project.baseCurrency.toUpperCase() === "EUR"
                                ? "euro"
                                : project.baseCurrency.toUpperCase() === "USD"
                                  ? "attach_money"
                                  : project.baseCurrency.toUpperCase() === "GBP"
                                    ? "currency_pound"
                                    : "payments"}
                            </span>
                            {project.baseCurrency}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                              riskBadge.label === "Conservative"
                                ? "bg-emerald-100 text-emerald-600 border-emerald-200"
                                : riskBadge.label === "Balanced" || riskBadge.label === "Custom"
                                  ? "bg-yellow-100 text-yellow-600 border-yellow-200"
                                  : "bg-red-100 text-red-600 border-red-200"
                            }`}
                          >
                            <span className="inline-flex items-center gap-1 leading-none">
                              <span className="material-symbols-outlined text-[12px]">
                                {iconMeta.icon}
                              </span>
                              {riskBadge.label}
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-slate-700">
                              {ratio === null ? "—" : ratio.toFixed(2)}
                            </span>
                            <div className="flex-1 h-1 w-16 bg-slate-100 rounded-full overflow-hidden">
                              {ratio === null ? null : (
                                <div
                                  className={`h-full ${ratioBarColor(ratio)}`}
                                  style={{ width: `${Math.min(100, ratio * 50)}%` }}
                                />
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-sm text-slate-700">
                          {positions}
                        </td>
                        <td className="px-6 font-medium py-4 text-sm text-slate-600">
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-border-light flex items-center justify-between text-xs font-medium text-slate-500">
              <span>
                Zeige {filteredProjects.length > 0 ? 1 : 0}-{filteredProjects.length} von{" "}
                {projects.length} Projekten
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1 bg-white border border-border-light rounded hover:bg-slate-100 transition-colors text-slate-400"
                  disabled
                >
                  Zurück
                </button>
                <button
                  type="button"
                  className="px-3 py-1 bg-white border border-border-light rounded hover:bg-slate-100 transition-colors text-slate-400"
                  disabled
                >
                  Weiter
                </button>
              </div>
            </div>
          </div>
        )}
				</div>
			</div>

      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${
          showCreate ? "" : "hidden"
        }`}
        onClick={() => setShowCreate(false)}
      />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${
          showCreate ? "" : "pointer-events-none"
        }`}
        onClick={() => setShowCreate(false)}
        aria-hidden={!showCreate}
      >
        <div
          className={`w-full max-w-md bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out flex flex-col ${
            showCreate ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="p-6 border-b border-border-light flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Neues Projekt erstellen</h2>
            <p className="text-xs text-slate-500">Konfigurieren Sie Ihr Portfolio-Tracking</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Projektname
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
              placeholder="z.B. Mein erstes Projekt"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Basiswährung
              </label>
              <input
                value={baseCurrency}
                onChange={(event) => setBaseCurrency(event.target.value)}
                className="w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50 uppercase"
                placeholder="EUR"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Risikoprofil
              </label>
              <select
                value={riskProfile}
                onChange={(event) =>
                  setRiskProfile(
                    event.target.value as "" | "conservative" | "balanced" | "aggressive"
                  )
                }
                className="w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
              >
                <option value="">Custom</option>
                <option value="conservative">Konservativ</option>
                <option value="balanced">Moderat</option>
                <option value="aggressive">Aggressiv</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-[auto,1fr] gap-3 items-center">
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Projektfarbe
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-11 w-16 rounded-lg border border-border-light bg-transparent p-1"
              />
              <input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="flex-1 rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50 font-mono uppercase"
                placeholder="#2563eb"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Underlying Asset (Ticker)
            </label>
            <input
              value={underlyingSymbol}
              onChange={(event) => setUnderlyingSymbol(event.target.value)}
              className="w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
              placeholder="z.B. NASDAQ:COIN"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Beschreibung (Optional)
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50"
              rows={4}
              placeholder="Ziele und Strategie für dieses Projekt..."
            />
          </div>
          <div className="p-4 bg-slate-50 border border-border-light rounded-lg">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-slate-600">info</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Nach dem Erstellen können Sie ISINs oder Ticker hinzufügen, um Positionen zu
                verfolgen und die automatische Analyse zu starten.
              </p>
            </div>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="p-6 border-t border-border-light bg-slate-50 flex gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="flex-1 px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleCreateProject}
            disabled={!canCreate || loading}
            className="flex-1 px-5 py-3 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all disabled:opacity-60"
          >
            {loading ? "Erstellen..." : "Projekt erstellen"}
          </button>
        </div>
        </div>
      </div>

    </div>
  );
}
