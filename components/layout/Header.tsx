"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { getRouteMeta } from "./nav";

type HeaderProps = {
	onToggleSidebar?: () => void;
};

export function Header({ onToggleSidebar }: HeaderProps) {
	const pathname = usePathname();
	const { title, subtitle, sectionLabel } = getRouteMeta(pathname);
	const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const helpRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
	const [detailLabel, setDetailLabel] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const isIsinQuery = useMemo(() => isIsin(trimmedQuery), [trimmedQuery]);
  const isTickerQuery = useMemo(
    () => !isIsinQuery && isTickerLike(trimmedQuery),
    [isIsinQuery, trimmedQuery]
  );
  const hasMagicRow = isIsinQuery;
  const hasCreateRow = isTickerQuery && results.length === 0;
  const magicOffset = hasMagicRow ? 1 : 0;
  const totalRows = results.length + (hasCreateRow ? 1 : 0) + (hasMagicRow ? 1 : 0);

	useEffect(() => {
		setDetailLabel(null);
		const segments = pathname.split("/").filter(Boolean);
		if (segments.length < 2) return;

		if (segments[0] === "projects" && segments[1]) {
			const projectId = segments[1];
			const controller = new AbortController();
			void (async () => {
				try {
					const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
						signal: controller.signal,
					});
					const payload = (await response.json().catch(() => null)) as
						| { project?: { name?: string | null } }
						| null;
					if (!response.ok || !payload?.project?.name) return;
					setDetailLabel(payload.project.name);
				} catch (err) {
					if ((err as { name?: string }).name !== "AbortError") {
						setDetailLabel(null);
					}
				}
			})();
			return () => controller.abort();
		}

		if (segments[0] === "analysis" && segments[1] === "optionsschein-rechner" && segments[2]) {
			const rawId = segments[2];
			if (isIsin(rawId)) {
				setDetailLabel(rawId.toUpperCase());
				return;
			}

			const controller = new AbortController();
			void (async () => {
				try {
					const response = await fetch("/api/optionsschein/positions", {
						signal: controller.signal,
					});
					const payload = (await response.json().catch(() => null)) as
						| { positions?: Array<{ id: string; isin?: string | null }> }
						| null;
					if (!response.ok || !payload?.positions) return;
					const match = payload.positions.find((position) => position.id === rawId);
					if (match?.isin) {
						setDetailLabel(match.isin.toUpperCase());
					} else {
						setDetailLabel(rawId.toUpperCase());
					}
				} catch (err) {
					if ((err as { name?: string }).name !== "AbortError") {
						setDetailLabel(rawId.toUpperCase());
					}
				}
			})();

			return () => controller.abort();
		}
	}, [pathname]);

	useEffect(() => {
		if (!trimmedQuery) {
			setResults([]);
			setOpen(false);
			return;
		}

		const controller = new AbortController();
		abortRef.current?.abort();
		abortRef.current = controller;

		const handle = setTimeout(async () => {
			setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
				const payload = (await response.json().catch(() => null)) as
					| { results?: SearchResult[] }
					| null;
				if (!response.ok) {
					setResults([]);
					setOpen(false);
					return;
				}
        const next = payload?.results ?? [];
      setResults(next);
      setActiveIndex(0);
      setOpen(true);
			} catch (err) {
				if ((err as { name?: string }).name !== "AbortError") {
      setResults([]);
      setOpen(false);
				}
			} finally {
				setLoading(false);
			}
		}, 120);

		return () => {
			clearTimeout(handle);
			controller.abort();
		};
  }, [trimmedQuery]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      const isCtrlK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (!isCtrlK) return;
      event.preventDefault();
      searchInputRef.current?.focus();
    }

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, []);

	useEffect(() => {
		function handleClick(event: MouseEvent) {
			if (!helpOpen) return;
			const target = event.target as Node | null;
			if (helpRef.current && target && helpRef.current.contains(target)) return;
			setHelpOpen(false);
		}

		document.addEventListener("mousedown", handleClick);
		return () => {
			document.removeEventListener("mousedown", handleClick);
		};
	}, [helpOpen]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmedQuery) return;

    if (hasMagicRow && activeIndex === 0) {
      handleOpenWarrantCalculator();
      return;
    }

    if (results.length > 0) {
      const adjustedIndex = Math.min(
        Math.max(activeIndex - magicOffset, 0),
        results.length - 1
      );
      const selected = results[adjustedIndex] ?? results[0];
      navigateToResult(selected);
      return;
    }

    if (hasCreateRow) {
      void handleCreateFromTicker();
      return;
    }

    router.push(`/projects?search=${encodeURIComponent(trimmedQuery)}`);
    setOpen(false);
  }

  function navigateToResult(item: SearchResult) {
    if (item.type === "project") {
      router.push(`/projects/${item.id}`);
    } else {
      router.push(`/projects/${item.projectId}`);
    }
    setOpen(false);
  }

  async function handleCreateFromTicker() {
    if (!isTickerQuery || !trimmedQuery) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const response = await fetch("/api/projects/from-ticker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: trimmedQuery }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | { project?: { id?: string } }
        | null;
      if (!response.ok) {
        const raw =
          payload && "error" in payload ? payload.error ?? "Unable to create project" : "Unable to create project";
        throw new Error(normalizeTickerError(raw));
      }
      const projectId = payload && "project" in payload ? payload.project?.id : null;
      if (projectId) {
        router.push(`/projects/${projectId}`);
        setOpen(false);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unable to create project");
    } finally {
      setCreateLoading(false);
    }
  }

  function handleOpenWarrantCalculator() {
    if (!isIsinQuery) return;
    const normalized = trimmedQuery.toUpperCase();
    router.push(`/analysis/optionsschein-rechner/${encodeURIComponent(normalized)}`);
    setOpen(false);
  }

	return (
		<header className="sticky top-0 z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-0 sm:h-[75px] bg-surface-light dark:bg-surface-dark border-b border-slate-200 dark:border-slate-800">
			<div className="flex items-center justify-between sm:hidden">
				<Link href="/" className="flex items-center gap-3">
					<div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-sm">
						<span className="material-symbols-outlined text-sm">insights</span>
					</div>
					<span className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100">
						HedgeLens
					</span>
				</Link>
				<button
					className="inline-flex items-center justify-center size-9 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
					type="button"
					aria-label="Toggle sidebar"
					onClick={onToggleSidebar}
				>
					<span className="material-symbols-outlined text-lg">menu</span>
				</button>
			</div>
			<div className="hidden sm:flex items-center gap-3 sm:w-1/4">
				<button
					className="lg:hidden inline-flex items-center justify-center size-9 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
					type="button"
					aria-label="Toggle sidebar"
					onClick={onToggleSidebar}
				>
					<span className="material-symbols-outlined text-lg">menu</span>
				</button>
				<nav className="flex min-w-0 flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-2 sm:text-sm font-semibold text-slate-500">
					{sectionLabel ? (
						<>
							<span className="hidden sm:inline uppercase tracking-wider text-slate-400">
								{sectionLabel}
							</span>
							<span className="hidden sm:inline text-slate-300 dark:text-slate-600">/</span>
						</>
					) : null}
					<span className="text-slate-900 dark:text-slate-100 truncate max-w-[220px] sm:max-w-none">
						{title}
					</span>
					{detailLabel ? (
						<>
							<span className="hidden sm:inline text-slate-300 dark:text-slate-600">/</span>
							<span className="text-slate-500 truncate max-w-[220px] sm:max-w-none">
								{detailLabel}
							</span>
						</>
					) : null}
				</nav>
			</div>

			<div className="w-full sm:flex-1 sm:flex sm:justify-center">
				<form className="relative w-full sm:w-[520px]" onSubmit={handleSubmit}>
          <div
            className="flex items-center gap-3 rounded-2xl sm:rounded-full border border-slate-200 bg-slate-100/80 px-4 sm:px-5 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/25"
            onMouseDown={(event) => {
              event.preventDefault();
              searchInputRef.current?.focus();
            }}
          >
						<span className="material-symbols-outlined text-slate-400 text-lg">search</span>
            <input
              ref={searchInputRef}
              className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-base w-full placeholder:text-slate-400 text-slate-700"
              placeholder="Search projects, positions, or ISIN..."
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (createError) setCreateError(null);
              }}
              onKeyDown={(event) => {
                if (!open) return;
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((prev) => (totalRows > 0 ? (prev + 1) % totalRows : 0));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((prev) =>
                    totalRows > 0 ? (prev - 1 + totalRows) % totalRows : 0
                  );
                }
              }}
              onFocus={() => {
                if (trimmedQuery) setOpen(true);
              }}
              onBlur={() => {
								window.setTimeout(() => setOpen(false), 150);
							}}
						/>
            <div className="hidden sm:flex items-center gap-2">
              {trimmedQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                    setOpen(false);
                  }}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              ) : null}
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-400">
                <span>⌘</span>
                <span>K</span>
              </span>
            </div>
          </div>
          {open ? (
            <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
              <div className={`relative ${loading ? "min-h-[168px]" : ""}`}>
                <div className={`absolute inset-0 transition-opacity duration-150 ${loading ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                  <div className="px-4 py-3">
                    <div className="space-y-3 animate-pulse">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <div className="h-3 w-40 rounded bg-slate-200" />
                          <div className="mt-2 h-2 w-28 rounded bg-slate-100" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`transition-opacity duration-150 ${loading ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                  {results.length > 0 ? (
                    <div className="max-h-72 overflow-auto">
                      {hasMagicRow ? (
                        <div className="px-3 pt-3">
                          <button
                            type="button"
                            onClick={handleOpenWarrantCalculator}
                            className={[
                              "w-full rounded-xl border px-3 py-3 text-left shadow-sm transition",
                              activeIndex === 0
                                ? "border-indigo-300 bg-indigo-50 shadow-md"
                                : "border-indigo-200/70 bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/70 hover:border-indigo-300 hover:shadow-md",
                            ].join(" ")}
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 shadow-inner">
                                <span className="material-symbols-outlined text-[16px]">
                                  auto_awesome
                                </span>
                              </span>
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-slate-900">
                                  Open warrant calculator
                                </div>
                                <div className="text-xs text-slate-500">
                                  Use ISIN {trimmedQuery.toUpperCase()} in the calculator.
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      ) : null}
                      <ul className={hasMagicRow ? "mt-2" : ""}>
                        {results.map((item, index) => {
                        const parts = item.subtitle.split(" • ");
                        const left = parts[0] ?? "";
                        const right = parts[1] ?? "";
                        const metaLeft = item.type === "project" ? "Project" : left;
                        const rowIndex = index + magicOffset;
                        return (
                          <li key={`${item.type}-${item.id}`} className="border-b last:border-b-0">
                            <button
                              type="button"
                              className={`w-full text-left px-4 py-3 ${rowIndex === activeIndex ? "bg-slate-100" : "hover:bg-slate-50"}`}
                              onClick={() => navigateToResult(item)}
                            >
                              <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                                <span className="font-semibold text-slate-400">{metaLeft}</span>
                                <span className="text-slate-300">•</span>
                                <span>{right}</span>
                              </div>
                            </button>
                          </li>
                        );
                        })}
                      </ul>
                    </div>
                  ) : (
                    <div className="px-2 py-2 text-xs text-slate-500">
                      {hasMagicRow ? (
                        <div className="px-2 py-1">
                          <button
                            type="button"
                            onClick={handleOpenWarrantCalculator}
                            className={[
                              "w-full rounded-xl border px-3 py-3 text-left shadow-sm transition",
                              activeIndex === 0
                                ? "border-indigo-300 bg-indigo-50 shadow-md"
                                : "border-indigo-200/70 bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/70 hover:border-indigo-300 hover:shadow-md",
                            ].join(" ")}
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 shadow-inner">
                                <span className="material-symbols-outlined text-[16px]">
                                  auto_awesome
                                </span>
                              </span>
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-slate-900">
                                  Open warrant calculator
                                </div>
                                <div className="text-xs text-slate-500">
                                  Use ISIN {trimmedQuery.toUpperCase()} in the calculator.
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      ) : null}
                      <div className="px-2 py-1">
                        {isIsinQuery
                          ? "No matching ISIN found. Press Enter to open the warrant calculator."
                          : "No matches found."}
                      </div>
                      {createError ? (
                        <div className="px-2 py-1 text-rose-600">{createError}</div>
                      ) : null}
                      {isTickerQuery ? (
                        <button
                          type="button"
                          onClick={handleCreateFromTicker}
                          disabled={createLoading}
                          className={`mt-1 w-full text-left px-3 py-3 rounded-xl border border-slate-200/70 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/70 shadow-sm transition ${createLoading ? "opacity-70" : "hover:shadow-md hover:border-slate-300"} ${activeIndex === magicOffset ? "ring-1 ring-blue-300" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 shadow-inner">
                              <span className="material-symbols-outlined text-[16px]">
                                {createLoading ? "progress_activity" : "auto_awesome"}
                              </span>
                            </span>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-slate-900">
                                {createLoading
                                  ? `Creating project for "${trimmedQuery.toLowerCase()}"…`
                                  : `Create project with ticker "${trimmedQuery.toLowerCase()}"`}
                              </div>
                              <div className="text-xs text-slate-500">
                                {createLoading
                                  ? "Fetching instrument details from the provider."
                                  : "We will fetch the instrument details and set it up automatically."}
                              </div>
                            </div>
                          </div>
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </form>
      </div>
			<div ref={helpRef} className="hidden sm:flex sm:w-1/4 justify-end relative">
				<button
					type="button"
					onClick={() => setHelpOpen((v) => !v)}
					className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300"
					aria-label="Help"
				>
					<span className="material-symbols-outlined text-base">help</span>
					<span className="text-xs font-semibold">Help</span>
				</button>

				{helpOpen ? (
					<div className="absolute right-0 top-12 w-96">
						{/* Arrow */}
						<div className="absolute right-6 -top-2 h-4 w-4 rotate-45 bg-white border-l border-t border-slate-200" />

						<div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
							<div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
								<div>
									<div className="text-xs font-bold uppercase tracking-wider text-slate-400">
										Get Started
									</div>
									<div className="text-sm font-semibold text-slate-900 mt-0.5">
										What to do next
									</div>
								</div>

								<button
									type="button"
									onClick={() => setHelpOpen(false)}
									className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
									aria-label="Close help"
								>
									<span className="material-symbols-outlined text-base">close</span>
								</button>
							</div>

							<div className="p-4">
								<ol className="space-y-3 text-sm text-slate-600">
									<li className="flex gap-3">
										<span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
											1
										</span>
										<div>
											<div className="text-sm font-semibold text-slate-900">Create a project</div>
											<p className="text-xs text-slate-500 leading-relaxed">
												Pick an underlying via ticker or add a manual project.
											</p>
										</div>
									</li>

									<li className="flex gap-3">
										<span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
											2
										</span>
										<div>
											<div className="text-sm font-semibold text-slate-900">Add positions</div>
											<p className="text-xs text-slate-500 leading-relaxed">
												Enter ISINs, sizes, and pricing mode to build exposure.
											</p>
										</div>
									</li>

									<li className="flex gap-3">
										<span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
											3
										</span>
										<div>
											<div className="text-sm font-semibold text-slate-900">Run analysis</div>
											<p className="text-xs text-slate-500 leading-relaxed">
												Ratios, exposure, and time‑value trends appear on the dashboard.
											</p>
										</div>
									</li>
								</ol>

								<div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
									Once set up, the dashboard keeps quotes and alerts updated. Use search to jump
									to any project, position, or ISIN.
								</div>
							</div>
						</div>
					</div>
				) : null}
			</div>

		</header>
	);
}

type SearchResult = {
	type: "project" | "position";
	id: string;
	projectId: string;
	title: string;
	subtitle: string;
	isin?: string | null;
};

function isIsin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/i.test(trimmed);
}

function isTickerLike(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length < 2) return false;
  return /^[A-Za-z0-9:.\\-]+$/.test(trimmed);
}

function normalizeTickerError(raw: string) {
  const lower = raw.toLowerCase();
  if (lower.includes("not_found") || lower.includes("not found")) {
    return "We couldn’t find a matching ticker. Try the exchange prefix (e.g. NASDAQ:HOOD).";
  }
  return raw;
}
