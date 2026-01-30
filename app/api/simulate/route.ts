import { NextResponse } from "next/server";

import { simulateScenario } from "@/lib/analytics";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    projectId?: string;
    positions?: Array<{ isin: string; size: number; entryPrice: number }>;
    scenario?: {
      volatility: number;
      drift: number;
      horizonDays: number;
      steps: number;
    };
  } | null;

  if (!body?.positions?.length || !body?.scenario) {
    return NextResponse.json({ error: "Missing positions or scenario" }, { status: 400 });
  }

  const result = simulateScenario(body.positions, body.scenario);

  return NextResponse.json(result);
}