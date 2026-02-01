"use client";

import { useEffect, useMemo, useState } from "react";

type CacheEntry = {
  isin: string;
  scrapedAt: string;
  sourceUrls: string[];
};

export default function OnvistaCachePage() {
  function handleBack() {
    window.history.back();
  }

  const [entries, setEntries] = useState<CacheEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/onvista-cache");
        const payload = (await response.json().catch(() => null)) as
          | { entries?: CacheEntry[]; error?: string }
          | null;
        if (!response.ok || !payload) {
          throw new Error(payload?.error ?? "Unable to load cache.");
        }
        if (!ignore) setEntries(payload.entries ?? []);
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : "Unable to load cache.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toUpperCase();
    if (!needle) return entries;
    return entries.filter((entry) => entry.isin.includes(needle));
  }, [entries, query]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-background-light p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="p-1">
          <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-border-light">
            <div>
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center justify-center text-slate-500 transition-colors hover:text-slate-900"
                aria-label="Go back"
              >
                <span className="material-symbols-outlined text-[24px]">chevron_left</span>
              </button>
              <h1 className="text-xl font-bold text-slate-900">Onvista ISIN Cache</h1>
              <p className="text-sm text-slate-500 mt-1">
                Cached ISIN imports (TTL: 1 day). Admin only.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[220px] rounded-lg border border-border-light px-3 py-2 text-xs text-slate-500">
              <span className="material-symbols-outlined text-sm">search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter by ISIN..."
                className="w-full bg-transparent outline-none text-xs font-semibold text-slate-700"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border-light bg-white shadow-sm overflow-hidden mt-4">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[720px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-border-light">
                  <th className="px-4 py-3">ISIN</th>
                  <th className="px-4 py-3">Scraped At</th>
                  <th className="px-4 py-3">Sources</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={3}>
                      Loading cache...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td className="px-4 py-4 text-rose-600" colSpan={3}>
                      {error}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={3}>
                      No cached ISINs yet.
                    </td>
                  </tr>
                ) : (
                  filtered.map((entry) => (
                    <tr key={entry.isin} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-700">{entry.isin}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(entry.scrapedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {entry.sourceUrls.length > 0 ? entry.sourceUrls.length : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
