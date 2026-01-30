import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { requireActiveUser } from "@/lib/users";

export const runtime = "nodejs";

type ProjectRow = {
  project_id: string;
  project_name: string;
  base_currency: string;
  created_at: string;
  updated_at: string;
  position_id: string | null;
  position_isin: string | null;
  position_side: string | null;
  position_size: number | null;
  position_entry_price: number | null;
  position_date: string | null;
  instrument_name: string | null;
  instrument_issuer: string | null;
  instrument_type: string | null;
  instrument_underlying: string | null;
  instrument_strike: number | null;
  instrument_expiry: string | null;
  instrument_currency: string | null;
  instrument_price: number | null;
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

export async function GET() {
  const gate = await requireActiveUser();

  if (gate.status !== "ok") {
    return gateToResponse(gate.status);
  }

  const sql = getDb();
  const rows = await sql<ProjectRow[]>`
    select
      p.id as project_id,
      p.name as project_name,
      p.base_currency,
      p.created_at,
      p.updated_at,
      pos.id as position_id,
      pos.isin as position_isin,
      pos.side as position_side,
      pos.size as position_size,
      pos.entry_price as position_entry_price,
      pos.date as position_date,
      i.name as instrument_name,
      i.issuer as instrument_issuer,
      i.type as instrument_type,
      i.underlying as instrument_underlying,
      i.strike as instrument_strike,
      i.expiry as instrument_expiry,
      i.currency as instrument_currency,
      i.price as instrument_price
    from projects p
    left join positions pos on pos.project_id = p.id
    left join instruments i on i.isin = pos.isin
    where p.owner_uid = ${gate.user.id}
    order by p.created_at desc
  `;

  const projects = new Map<
    string,
    {
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
    }
  >();

  for (const row of rows) {
    if (!projects.has(row.project_id)) {
      projects.set(row.project_id, {
        id: row.project_id,
        name: row.project_name,
        baseCurrency: row.base_currency,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        positions: [],
      });
    }

    if (row.position_id && row.position_isin) {
      projects.get(row.project_id)?.positions.push({
        id: row.position_id,
        isin: row.position_isin,
        side: row.position_side ?? "call",
        size: row.position_size ?? 0,
        entryPrice: row.position_entry_price ?? 0,
        date: row.position_date ?? "",
        instrument: {
          name: row.instrument_name,
          issuer: row.instrument_issuer,
          type: row.instrument_type,
          underlying: row.instrument_underlying,
          strike: row.instrument_strike,
          expiry: row.instrument_expiry,
          currency: row.instrument_currency,
          price: row.instrument_price,
        },
      });
    }
  }

  return NextResponse.json({ projects: Array.from(projects.values()) });
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
      isin?: string;
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

  if (!body?.instrument?.isin || !body.name) {
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

  const sql = getDb();

  await sql.transaction([
    sql`
      insert into instruments (
        isin,
        name,
        issuer,
        type,
        underlying,
        strike,
        expiry,
        currency,
        price,
        fetched_at
      )
      values (
        ${instrument.isin},
        ${instrument.name ?? "Unknown"},
        ${instrument.issuer ?? "Unknown"},
        ${instrument.type ?? side},
        ${instrument.underlying ?? "Unknown"},
        ${instrument.strike ?? 0},
        ${instrument.expiry ?? today},
        ${instrument.currency ?? baseCurrency},
        ${instrument.price ?? 0},
        ${instrument.fetchedAt ? new Date(instrument.fetchedAt) : now}
      )
      on conflict (isin) do update set
        name = excluded.name,
        issuer = excluded.issuer,
        type = excluded.type,
        underlying = excluded.underlying,
        strike = excluded.strike,
        expiry = excluded.expiry,
        currency = excluded.currency,
        price = excluded.price,
        fetched_at = excluded.fetched_at
    `,
    sql`
      insert into projects (
        id,
        owner_uid,
        name,
        base_currency,
        created_at,
        updated_at
      )
      values (
        ${projectId},
        ${gate.user.id},
        ${body.name},
        ${baseCurrency},
        ${now},
        ${now}
      )
    `,
    sql`
      insert into positions (
        id,
        project_id,
        isin,
        side,
        size,
        entry_price,
        date
      )
      values (
        ${positionId},
        ${projectId},
        ${instrument.isin},
        ${side},
        ${size},
        ${entryPrice},
        ${today}
      )
    `,
  ]);

  return NextResponse.json({
    ok: true,
    projectId,
    positionId,
  });
}
