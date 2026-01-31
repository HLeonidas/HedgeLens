import { NextResponse } from "next/server";

import { getRedis } from "@/lib/redis";
import { requireActiveUser } from "@/lib/users";

export const runtime = "nodejs";

type UserRecord = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string | null;
  provider_account_id: string | null;
  active: boolean;
  role?: "admin" | "enduser";
  created_at: string;
  updated_at: string;
};

function gateToResponse(status: "unauthenticated" | "inactive" | "missing") {
  if (status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (status === "inactive") {
    return NextResponse.json({ error: "Inactive user" }, { status: 403 });
  }
  return NextResponse.json({ error: "User not provisioned" }, { status: 403 });
}

function matchesFilter(user: UserRecord, query: string) {
  const haystack = `${user.email} ${user.name ?? ""}`.toLowerCase();
  return haystack.includes(query);
}

export async function GET(request: Request) {
  const gate = await requireActiveUser();

  if (gate.status !== "ok") {
    return gateToResponse(gate.status);
  }
  if (gate.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get("pageSize") ?? "10")));
  const sortKey = (url.searchParams.get("sort") ?? "created_at") as
    | "created_at"
    | "email"
    | "name"
    | "active";
  const order = (url.searchParams.get("order") ?? "desc") as "asc" | "desc";
  const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const activeFilter = url.searchParams.get("active");

  const redis = getRedis();
  const ids = await redis.zrange<string[]>("users:all", 0, -1);
  if (!ids || ids.length === 0) {
    return NextResponse.json({
      users: [],
      page,
      pageSize,
      total: 0,
      totalPages: 0,
    });
  }

  const users = await redis.mget<UserRecord[]>(ids.map((id) => `user:${id}`));
  let filtered = (users ?? []).filter((user): user is UserRecord => Boolean(user)).map((user) => ({
    ...user,
    role: user.role ?? "enduser",
  }));

  if (query) {
    filtered = filtered.filter((user) => matchesFilter(user, query));
  }

  if (activeFilter === "true") {
    filtered = filtered.filter((user) => user.active);
  } else if (activeFilter === "false") {
    filtered = filtered.filter((user) => !user.active);
  }

  filtered.sort((a, b) => {
    let result = 0;
    if (sortKey === "created_at") {
      result = a.created_at.localeCompare(b.created_at);
    } else if (sortKey === "email") {
      result = a.email.localeCompare(b.email);
    } else if (sortKey === "name") {
      result = (a.name ?? "").localeCompare(b.name ?? "");
    } else if (sortKey === "active") {
      result = Number(a.active) - Number(b.active);
    }

    return order === "asc" ? result : -result;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageUsers = filtered.slice(start, start + pageSize);

  return NextResponse.json({
    users: pageUsers,
    page,
    pageSize,
    total,
    totalPages,
  });
}
