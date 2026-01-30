import "server-only";

import { NextResponse } from "next/server";

import type { DbUser } from "@/lib/users";
import { requireActiveUser } from "@/lib/users";

type ApiGuardResult =
  | { user: DbUser }
  | { response: NextResponse<{ error: string }> };

export async function requireApiUser(): Promise<ApiGuardResult> {
  const gate = await requireActiveUser();

  if (gate.status === "ok") {
    return { user: gate.user };
  }

  if (gate.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (gate.status === "inactive") {
    return { response: NextResponse.json({ error: "Inactive user" }, { status: 403 }) };
  }

  return { response: NextResponse.json({ error: "User not provisioned" }, { status: 403 }) };
}
