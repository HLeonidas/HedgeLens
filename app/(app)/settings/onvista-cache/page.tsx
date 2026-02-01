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
        <div className="rounded-2xl border border-border-light bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
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
            <div className="flex items-center gap-2 rounded-lg border border-border-light px-3 py-2 text-xs text-slate-500">
              <span className="material-symbols-outlined text-sm">search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter by ISIN..."
                className="w-48 bg-transparent outline-none text-xs font-semibold text-slate-700"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border-light bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Cached Entries
            </h2>
            <span className="text-xs text-slate-500">{filtered.length} total</span>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading cache…</div>
          ) : error ? (
            <div className="p-6 text-sm text-rose-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No cached ISINs yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">ISIN</th>
                    <th className="px-4 py-3 text-left">Scraped At</th>
                    <th className="px-4 py-3 text-left">Sources</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {filtered.map((entry) => (
                    <tr key={entry.isin} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-slate-700">{entry.isin}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(entry.scrapedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {entry.sourceUrls.length > 0 ? entry.sourceUrls.length : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
