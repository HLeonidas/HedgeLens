import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getRedis } from "@/lib/redis";
import { requireActiveUser } from "@/lib/users";

export const runtime = "nodejs";

type ProjectRow = {
  id: string;
  name: string;
  baseCurrency: string;
  createdAt: string;
  updatedAt: string;
  positions: Array<{
    id: string;
    isin: string;
    side: string;
    size: number;
    entryPrice: number;
    date: string;
    instrument?: {
      name: string | null;
      issuer: string | null;
      type: string | null;
      underlying: string | null;
      strike: number | null;
      expiry: string | null;
      currency: string | null;
      price: number | null;
    };
  }>;
};

type StoredProject = ProjectRow;

function gateToResponse(status: "unauthenticated" | "inactive" | "missing") {
  if (status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (status === "inactive") {
    return NextResponse.json({ error: "Inactive user" }, { status: 403 });
  }
  return NextResponse.json({ error: "User not provisioned" }, { status: 403 });
}

export async function GET() {
  const gate = await requireActiveUser();

  if (gate.status !== "ok") {
    return gateToResponse(gate.status);
  }

  const redis = getRedis();
  const projectKey = `user:${gate.user.id}:projects`;
  const projectIds = (await redis.zrange<string[]>(projectKey, 0, 49, {
    rev: true,
  })) ?? [];

  if (projectIds.length === 0) {
    return NextResponse.json({ projects: [] });
  }

  const projects = await redis.mget<StoredProject[]>(
    projectIds.map((id) => `project:${id}`)
  );

  const filtered = (projects ?? [])
    .filter((project): project is StoredProject => Boolean(project))
    .map((project) => project);

  return NextResponse.json({ projects: filtered });
}

export async function POST(request: Request) {
  const gate = await requireActiveUser();

  if (gate.status !== "ok") {
    return gateToResponse(gate.status);
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    baseCurrency?: string;
    position?: {
      isin?: string;
      size?: number;
      entryPrice?: number;
      side?: "put" | "call";
    };
    instrument?: {
      isin: string;
      name?: string;
      issuer?: string;
      type?: "put" | "call";
      underlying?: string;
      strike?: number;
      expiry?: string;
      currency?: string;
      price?: number;
      fetchedAt?: string;
    };
  } | null;

  if (!body?.instrument || !body.instrument.isin || !body.name) {
    return NextResponse.json({ error: "Missing project name or instrument" }, { status: 400 });
  }

  const instrument = body.instrument;
  const position = body.position ?? {};
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const projectId = randomUUID();
  const positionId = randomUUID();
  const baseCurrency = body.baseCurrency || instrument.currency || "EUR";

  const side = position.side ?? instrument.type ?? "call";
  const size = position.size ?? 1;
  const entryPrice = position.entryPrice ?? instrument.price ?? 0;

  const redis = getRedis();
  const project: StoredProject = {
    id: projectId,
    name: body.name,
    baseCurrency,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    positions: [
      {
        id: positionId,
        isin: instrument.isin,
        side,
        size,
        entryPrice,
        date: today,
        instrument: {
          name: instrument.name ?? "Unknown",
          issuer: instrument.issuer ?? "Unknown",
          type: instrument.type ?? side,
          underlying: instrument.underlying ?? "Unknown",
          strike: instrument.strike ?? 0,
          expiry: instrument.expiry ?? today,
          currency: instrument.currency ?? baseCurrency,
          price: instrument.price ?? 0,
        },
      },
    ],
  };

  const projectKey = `project:${projectId}`;
  const userProjectsKey = `user:${gate.user.id}:projects`;
  await redis.set(projectKey, project);
  await redis.zadd(userProjectsKey, {
    score: now.getTime(),
    member: projectId,
  });

  return NextResponse.json({
    ok: true,
    projectId,
    positionId,
  });
}
