import { NextResponse } from "next/server";

import { optimizeRatio } from "@/lib/analytics";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    projectId?: string;
    objective?: "max_return" | "min_risk" | "best_ratio";
    constraints?: { maxLoss?: number; minReturn?: number };
    searchSpace?: {
      putMin: number;
      putMax: number;
      callMin: number;
      callMax: number;
    };
  } | null;

  if (!body?.objective || !body?.searchSpace) {
    return NextResponse.json({ error: "Missing objective or searchSpace" }, { status: 400 });
  }

  const result = optimizeRatio({
    objective: body.objective,
    constraints: body.constraints ?? {},
    searchSpace: body.searchSpace,
  });

  return NextResponse.json(result);
}