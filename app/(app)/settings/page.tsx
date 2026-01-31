"use client";

import { Menu } from "@headlessui/react";
import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string | null;
  provider_account_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type ExchangeRate = {
  from: string;
  to: string;
  rate: number;
  fetchedAt: string;
  source: "alpha_vantage" | "manual";
};

export default function SettingsPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<"created_at" | "email" | "name" | "active">("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [fxRate, setFxRate] = useState<ExchangeRate | null>(null);
  const [fxLoading, setFxLoading] = useState(false);
  const [fxError, setFxError] = useState<string | null>(null);
  const [manualRate, setManualRate] = useState<number | "">("");
  const [showManualFxModal, setShowManualFxModal] = useState(false);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    params.set("sort", sort);
    params.set("order", order);
    if (query.trim()) params.set("q", query.trim());
    if (activeFilter !== "all") params.set("active", activeFilter);
    return params.toString();
  }, [page, pageSize, sort, order, query, activeFilter]);

  useEffect(() => {
    let ignore = false;
    async function loadUsers() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/users?${queryParams}`);
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Failed to load users");
        }
        const data = (await response.json()) as {
          users: UserRow[];
          page: number;
          pageSize: number;
          total: number;
          totalPages: number;
        };
        if (ignore) return;
        setUsers(data.users ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } catch (err) {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadUsers();
    return () => {
      ignore = true;
    };
  }, [queryParams]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize, sort, order, activeFilter]);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial =
      stored === "dark" || stored === "light" ? stored : prefersDark ? "dark" : "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadFx() {
      setFxLoading(true);
      setFxError(null);
      try {
        const response = await fetch("/api/exchange-rate?from=EUR&to=USD");
        const payload = (await response.json().catch(() => null)) as
          | { rate?: ExchangeRate; error?: string }
          | null;
        if (!response.ok || !payload?.rate) {
          throw new Error(payload?.error ?? "Failed to load FX rate");
        }
        if (!ignore) {
          setFxRate(payload.rate);
          setManualRate(payload.rate.rate);
        }
      } catch (err) {
        if (!ignore) setFxError(err instanceof Error ? err.message : "Failed to load FX rate");
      } finally {
        if (!ignore) setFxLoading(false);
      }
    }

    void loadFx();
    return () => {
      ignore = true;
    };
  }, []);

  function handleThemeChange(nextTheme: "light" | "dark") {
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  async function handleRefreshFx() {
    setFxLoading(true);
    setFxError(null);
    try {
      const response = await fetch("/api/exchange-rate?from=EUR&to=USD&force=1");
      const payload = (await response.json().catch(() => null)) as
        | { rate?: ExchangeRate; error?: string }
        | null;
      if (!response.ok || !payload?.rate) {
        throw new Error(payload?.error ?? "Failed to refresh FX rate");
      }
      setFxRate(payload.rate);
      setManualRate(payload.rate.rate);
    } catch (err) {
      setFxError(err instanceof Error ? err.message : "Failed to refresh FX rate");
    } finally {
      setFxLoading(false);
    }
  }

  async function handleManualFx() {
    if (manualRate === "" || !Number.isFinite(Number(manualRate))) {
      setFxError("Invalid rate");
      return;
    }
    setFxLoading(true);
    setFxError(null);
    try {
      const response = await fetch("/api/exchange-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: "EUR", to: "USD", rate: Number(manualRate) }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { rate?: ExchangeRate; error?: string }
        | null;
      if (!response.ok || !payload?.rate) {
        throw new Error(payload?.error ?? "Failed to update FX rate");
      }
      setFxRate(payload.rate);
    } catch (err) {
      setFxError(err instanceof Error ? err.message : "Failed to update FX rate");
    } finally {
      setFxLoading(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-6xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your account, team permissions, and active sessions.
          </p>
        </div>
        </div>

        <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
        <div className="mb-5">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Appearance
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            How would you like the dashboard to look?
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleThemeChange("light")}
            className={`rounded-2xl border p-4 text-left transition-all ${
              theme === "light"
                ? "border-blue-500 ring-2 ring-blue-500/30 shadow-sm"
                : "border-border-light hover:border-slate-300"
            }`}
          >
            <div className="h-28 rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
              <div className="h-2 w-10 rounded-full bg-slate-200" />
              <div className="mt-3 h-10 rounded-lg bg-slate-100" />
              <div className="mt-2 h-6 rounded-lg bg-slate-50" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">Light Mode</p>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange("dark")}
            className={`rounded-2xl border p-4 text-left transition-all ${
              theme === "dark"
                ? "border-blue-500 ring-2 ring-blue-500/30 shadow-sm"
                : "border-border-light hover:border-slate-300"
            }`}
          >
            <div className="h-28 rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-inner">
              <div className="h-2 w-10 rounded-full bg-slate-700" />
              <div className="mt-3 h-10 rounded-lg bg-slate-900" />
              <div className="mt-2 h-6 rounded-lg bg-slate-800" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">Dark Mode</p>
          </button>
        </div>
        </div>

        <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Exchange Rates
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              Live conversion data for global transactions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowManualFxModal(true)}
              className="inline-flex items-center gap-2 rounded-full border border-border-light bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[14px]">edit</span>
              Set manually
            </button>
            <button
              type="button"
              onClick={handleRefreshFx}
              disabled={fxLoading}
              className="inline-flex items-center gap-2 rounded-full border border-border-light bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[14px]">
                {fxLoading ? "sync" : "update"}
              </span>
              {fxLoading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </div>
        <div className="mb-4 text-xs text-slate-500">
          {fxRate
            ? `Last update: ${new Date(fxRate.fetchedAt).toLocaleString()} · ${
                fxRate.source === "manual" ? "Manual" : "Alpha Vantage"
              }`
            : "No FX data loaded yet."}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border-light bg-blue-50/70 p-4">
            <div className="flex items-center justify-between text-xs uppercase text-blue-600 font-semibold">
              <span>EUR → USD</span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm">
                <span className="material-symbols-outlined text-blue-600 text-base">
                  trending_up
                </span>
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {fxRate ? fxRate.rate.toFixed(4) : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-border-light bg-white p-4">
            <div className="flex items-center justify-between text-xs uppercase text-slate-500 font-semibold">
              <span>USD → EUR</span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                <span className="material-symbols-outlined text-slate-500 text-base">
                  trending_down
                </span>
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {fxRate ? (1 / fxRate.rate).toFixed(4) : "—"}
            </p>
          </div>
        </div>
        {fxError ? <p className="text-xs text-rose-600 mt-4">{fxError}</p> : null}
      </div>

        <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              User Management
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-border-light">
          <div className="flex items-center gap-2 flex-1 min-w-[220px] rounded-lg border border-border-light px-3 py-2 text-xs text-slate-500">
            <span className="material-symbols-outlined text-sm">search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or email..."
              className="w-full bg-transparent outline-none text-slate-700 text-xs font-semibold"
            />
          </div>
          <select
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value as "all" | "true" | "false")}
            className="rounded-lg border border-border-light px-3 py-2 text-xs font-semibold text-slate-600 bg-white"
          >
            <option value="all">Role: All</option>
            <option value="true">Role: Active</option>
            <option value="false">Role: Inactive</option>
          </select>
          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as "created_at" | "email" | "name" | "active")
            }
            className="rounded-lg border border-border-light px-3 py-2 text-xs font-semibold text-slate-600 bg-white"
          >
            <option value="created_at">Sort by: Created</option>
            <option value="email">Sort by: Email</option>
            <option value="name">Sort by: Name</option>
            <option value="active">Sort by: Active</option>
          </select>
          <select
            value={order}
            onChange={(event) => setOrder(event.target.value as "asc" | "desc")}
            className="rounded-lg border border-border-light px-3 py-2 text-xs font-semibold text-slate-600 bg-white"
          >
            <option value="desc">Created: Desc</option>
            <option value="asc">Created: Asc</option>
          </select>
        </div>

        <div className="rounded-xl border border-border-light bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[980px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-border-light">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={6}>
                      Loading users...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td className="px-4 py-4 text-red-600" colSpan={6}>
                      {error}
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={6}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={user.name ?? user.email}
                              className="size-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="size-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                              {(user.name ?? user.email).slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">
                              {user.name ?? "Unnamed"}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                              {user.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-2 rounded-full border border-border-light px-2 py-1 text-xs text-slate-600">
                          {user.provider ?? "custom"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                            user.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {user.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-medium">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right relative overflow-visible">
                        <Menu as="div" className="relative inline-flex items-center">
                          <Menu.Button className="p-1.5 rounded-lg border border-border-light text-slate-700 hover:bg-slate-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20">
                            <span className="material-symbols-outlined text-lg">
                              more_vert
                            </span>
                          </Menu.Button>
                          <Menu.Items
                            anchor="bottom end"
                            portal
                            className="z-50 w-40 rounded-xl border border-border-light bg-white shadow-xl ring-1 ring-black/5 overflow-hidden py-1"
                          >
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  type="button"
                                  className={[
                                    "flex w-full items-center gap-2 px-3 py-2 text-sm",
                                    active ? "bg-slate-100 text-slate-900" : "text-slate-700",
                                  ].join(" ")}
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    edit
                                  </span>
                                  Edit user
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  type="button"
                                  className={[
                                    "flex w-full items-center gap-2 px-3 py-2 text-sm",
                                    active ? "bg-rose-50 text-rose-700" : "text-rose-600",
                                  ].join(" ")}
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    delete
                                  </span>
                                  Delete user
                                </button>
                              )}
                            </Menu.Item>
                          </Menu.Items>
                        </Menu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-semibold">
            Showing {users.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(page * pageSize, total)} of {total} users
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="px-3 py-2 rounded-lg border border-slate-900/20 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-50 disabled:opacity-60"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(3, totalPages) }, (_, idx) => {
                const pageNumber = idx + 1;
                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`size-8 rounded-lg text-xs font-semibold ${
                      page === pageNumber
                        ? "bg-slate-900 text-white"
                        : "border border-slate-900/20 text-slate-900 bg-white hover:bg-slate-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-3 py-2 rounded-lg border border-slate-900/20 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-50 disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
        </div>

        <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Session
              </p>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                Logout of this device
              </h3>
              <p className="text-xs text-slate-500 mt-2 max-w-md">
                Sign out to end your current session. You can sign in again at any time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/signin" })}
              className="inline-flex items-center gap-2 rounded-full border border-slate-900/20 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${
          showManualFxModal ? "" : "hidden"
        }`}
        onClick={() => setShowManualFxModal(false)}
      />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${
          showManualFxModal ? "" : "pointer-events-none"
        }`}
        onClick={() => setShowManualFxModal(false)}
        aria-hidden={!showManualFxModal}
      >
        <div
          className={`w-full max-w-lg bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out ${
            showManualFxModal ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="p-6 border-b border-border-light flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Manual Override</h3>
              <p className="text-sm text-slate-500 mt-1">Cached for 48h · EUR/USD</p>
            </div>
            <button
              type="button"
              onClick={() => setShowManualFxModal(false)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="p-6">
            <label className="text-xs font-bold uppercase text-slate-500">
              Manual rate
            </label>
            <input
              type="number"
              min={0}
              step={0.0001}
              value={manualRate}
              onChange={(event) =>
                setManualRate(event.target.value === "" ? "" : Number(event.target.value))
              }
              className="mt-2 w-full rounded-lg border border-border-light px-4 py-2 text-sm bg-slate-50"
              placeholder="Enter manual rate value..."
            />
            {fxError ? <p className="text-xs text-rose-600 mt-2">{fxError}</p> : null}
          </div>
          <div className="p-6 border-t border-border-light bg-slate-50 flex gap-3 rounded-b-2xl">
            <button
              type="button"
              onClick={() => setShowManualFxModal(false)}
              className="flex-1 px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleManualFx}
              disabled={fxLoading}
              className="flex-1 px-5 py-3 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 disabled:opacity-60"
            >
              Save Override
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
