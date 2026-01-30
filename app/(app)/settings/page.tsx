"use client";

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

  function handleThemeChange(nextTheme: "light" | "dark") {
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your account, team permissions, and active sessions.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Appearance
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              Switch between light and dark mode.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border-light dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                theme === "light"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                theme === "dark"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
              }`}
            >
              Dark
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              User Management
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              {total} users · Page {page} of {totalPages}
            </p>
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-400 border-b border-border-light font-semibold">
                <th className="py-2 text-left">User</th>
                <th className="py-2 text-left">Email</th>
                <th className="py-2 text-left">Provider</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-left">Created Date</th>
                <th className="py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={6}>
                    Loading users...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="py-4 text-red-600" colSpan={6}>
                    {error}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={6}>
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-border-light last:border-b-0">
                    <td className="py-3">
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
                          <span className="font-semibold text-slate-900">
                            {user.name ?? "Unnamed"}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">{user.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-slate-700 font-medium">{user.email}</td>
                    <td className="py-3 text-slate-600">
                      <span className="inline-flex items-center gap-2 rounded-full border border-border-light px-2 py-1 text-xs text-slate-600">
                        {user.provider ?? "custom"}
                      </span>
                    </td>
                    <td className="py-3">
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
                    <td className="py-3 text-slate-600 font-medium">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <button
                          type="button"
                          className="p-2 rounded-lg border border-border-light hover:bg-slate-50"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-lg border border-border-light hover:bg-slate-50"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
              className="px-3 py-2 rounded-lg border border-border-light text-xs font-semibold text-slate-600 disabled:opacity-60"
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
                        ? "bg-accent text-white"
                        : "border border-border-light text-slate-600"
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
              className="px-3 py-2 rounded-lg border border-border-light text-xs font-semibold text-slate-600 disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm max-w-md">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
          Session
        </h3>
        <p className="text-xs text-slate-500 mb-4">Manage your current active login session.</p>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/signin" })}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
        >
          Logout Current Session
        </button>
      </div>
    </div>
  );
}
