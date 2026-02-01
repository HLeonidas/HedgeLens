"use client";

import { Menu } from "@headlessui/react";
import { useEffect, useMemo, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string | null;
  provider_account_id: string | null;
  active: boolean;
  role: "admin" | "enduser";
  created_at: string;
  updated_at: string;
};

export default function UserManagementPage() {
  function handleBack() {
    window.history.back();
  }

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "enduser">("enduser");
  const [editActive, setEditActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
    async function loadMe() {
      try {
        const response = await fetch("/api/me");
        if (!response.ok) {
          setIsAdmin(false);
          return;
        }
        const data = (await response.json()) as { user?: { role?: string } };
        if (ignore) return;
        setIsAdmin(data.user?.role === "admin");
      } catch {
        if (!ignore) setIsAdmin(false);
      }
    }

    void loadMe();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setUsers([]);
      setTotal(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }
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
        if (!ignore) setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadUsers();
    return () => {
      ignore = true;
    };
  }, [queryParams, isAdmin]);

  function openEditUserModal(user: UserRow) {
    setEditUser(user);
    setEditName(user.name ?? "");
    setEditRole(user.role ?? "enduser");
    setEditActive(user.active);
    setEditError(null);
    setShowEditUserModal(true);
  }

  async function handleEditUserSave() {
    if (!editUser) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const response = await fetch(`/api/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim() ? editName.trim() : null,
          role: editRole,
          active: editActive,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { user?: UserRow; error?: string }
        | null;
      if (!response.ok || !payload?.user) {
        throw new Error(payload?.error ?? "Failed to update user");
      }
      setUsers((prev) => prev.map((user) => (user.id === payload.user?.id ? payload.user : user)));
      setShowEditUserModal(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-6xl flex flex-col gap-6">
        <div>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center justify-center text-slate-500 transition-colors hover:text-slate-900"
            aria-label="Go back"
          >
            <span className="material-symbols-outlined text-[24px]">chevron_left</span>
          </button>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">User Management</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage users, roles, and account access.
          </p>
        </div>

        {isAdmin === false ? (
          <div className="rounded-2xl border border-border-light bg-white p-6 text-sm text-slate-500">
            Admin access required.
          </div>
        ) : (
          <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
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

            <div className="rounded-xl border border-border-light bg-white shadow-sm overflow-hidden mt-4">
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full min-w-[980px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-border-light">
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Provider</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {loading ? (
                      <tr>
                        <td className="px-4 py-4 text-slate-500" colSpan={7}>
                          Loading users...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td className="px-4 py-4 text-red-600" colSpan={7}>
                          {error}
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td className="px-4 py-4 text-slate-500" colSpan={7}>
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
                                user.role === "admin"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {user.role === "admin" ? "Admin" : "Enduser"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                                user.active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {user.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 font-medium">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right align-middle relative overflow-visible">
                            <Menu as="div" className="relative inline-flex items-center">
                              <Menu.Button className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border-light text-slate-700 hover:bg-slate-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20">
                                <span className="material-symbols-outlined text-lg">more_vert</span>
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
                                      onClick={() => openEditUserModal(user)}
                                      className={[
                                        "flex w-full items-center gap-2 px-3 py-2 text-sm",
                                        active ? "bg-slate-100 text-slate-900" : "text-slate-700",
                                      ].join(" ")}
                                    >
                                      <span className="material-symbols-outlined text-[16px]">edit</span>
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
                                      <span className="material-symbols-outlined text-[16px]">delete</span>
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
        )}
      </div>

      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 ${showEditUserModal ? "" : "hidden"}`}
        onClick={() => setShowEditUserModal(false)}
      />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${showEditUserModal ? "" : "pointer-events-none"}`}
        onClick={() => setShowEditUserModal(false)}
        aria-hidden={!showEditUserModal}
      >
        <div
          className={`w-full max-w-lg bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out ${showEditUserModal ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="p-6 border-b border-border-light flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Edit user</h3>
              <p className="text-sm text-slate-500 mt-1">Update name, role, or status.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowEditUserModal(false)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Name</label>
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border-light px-4 py-2 text-sm bg-slate-50"
                placeholder="User name"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Role</label>
                <select
                  value={editRole}
                  onChange={(event) => setEditRole(event.target.value as "admin" | "enduser")}
                  className="mt-2 w-full rounded-lg border border-border-light px-4 py-2 text-sm bg-slate-50"
                >
                  <option value="enduser">Enduser</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border-light bg-slate-50 px-4 py-2">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Status</p>
                  <p className="text-xs text-slate-400">Active user account.</p>
                </div>
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(event) => setEditActive(event.target.checked)}
                  className="h-4 w-4"
                />
              </div>
            </div>
            {editError ? <p className="text-xs text-rose-600">{editError}</p> : null}
          </div>
          <div className="p-6 pt-0 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowEditUserModal(false)}
              className="px-4 py-2 rounded-lg border border-border-light text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEditUserSave}
              disabled={editSaving}
              className="px-4 py-2 rounded-lg bg-slate-900 text-xs font-semibold text-white disabled:opacity-60"
            >
              {editSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
