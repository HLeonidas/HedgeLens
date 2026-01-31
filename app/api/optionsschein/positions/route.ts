import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { computeModelPricing } from "@/lib/pricing/modelPosition";
import { createStandaloneOptionsPosition, listStandaloneOptionsPositions } from "@/lib/store/options-positions";
import { listPositions, listProjects } from "@/lib/store/projects";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const projects = await listProjects(guard.user.id, 200);
  const standalone = await listStandaloneOptionsPositions(guard.user.id, 200);

  const positions = await Promise.all(
    projects.map(async (project) => {
      const items = await listPositions(project.id);
      return items.map((position) => {
        let computed = position.computed;

        if (
          position.side !== "spot" &&
          !computed &&
          position.underlyingPrice &&
          position.strike &&
          position.expiry &&
          position.volatility &&
          position.rate !== undefined
        ) {
          const model = computeModelPricing({
            S: position.underlyingPrice,
            K: position.strike,
            expiry: position.expiry,
            r: position.rate,
            q: position.dividendYield ?? 0,
            sigma: position.volatility,
            type: position.side as "call" | "put",
          });
          computed = model.computed;
        }

        return {
          ...position,
          computed,
          projectId: project.id,
          projectName: project.name,
          baseCurrency: project.baseCurrency,
        };
      });
    })
  );

  const standalonePositions = standalone.map((position) => {
    const computed = position.computed
      ? {
          fairValue: position.computed.fairValue,
          intrinsicValue: position.computed.fairValue,
          timeValue: 0,
          delta: 0,
          gamma: 0,
          theta: 0,
          vega: 0,
          iv: undefined,
          asOf: position.updatedAt,
        }
      : undefined;

    return {
      ...position,
      computed,
      projectId: null,
      projectName: "Unassigned",
      baseCurrency: "EUR",
    };
  });

  type ProjectPosition = (typeof positions)[number][number];
  type StandalonePosition = (typeof standalonePositions)[number];
  const combined: Array<ProjectPosition | StandalonePosition> = [
    ...positions.flat(),
    ...standalonePositions,
  ];

  return NextResponse.json({ positions: combined });
}

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const payload = (await request.json().catch(() => null)) as
    | {
        name?: string;
        isin?: string;
        side?: "put" | "call";
        size?: number;
        entryPrice?: number;
        pricingMode?: "market" | "model";
        marketPrice?: number;
      }
    | null;

  const name = payload?.name?.trim() || "New OS Position";
  const isin = payload?.isin?.trim() || "NEWOS1";
  const side = payload?.side ?? "call";
  const size = payload?.size ?? 1;
  const entryPrice = payload?.entryPrice ?? 0;
  const pricingMode = payload?.pricingMode ?? "market";
  const marketPrice = payload?.marketPrice ?? entryPrice;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (isin.length < 6) {
    return NextResponse.json({ error: "Invalid ISIN" }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }
  if (!Number.isFinite(entryPrice) || entryPrice < 0) {
    return NextResponse.json({ error: "Invalid entry price" }, { status: 400 });
  }
  if (pricingMode === "market") {
    if (!Number.isFinite(marketPrice) || (marketPrice ?? 0) < 0) {
      return NextResponse.json({ error: "Invalid market price" }, { status: 400 });
    }
  }

  const position = await createStandaloneOptionsPosition(guard.user.id, {
    name,
    isin,
    side,
    size,
    entryPrice,
    pricingMode,
    marketPrice,
  });

  return NextResponse.json({ position }, { status: 201 });
}
