import { NextResponse } from "next/server";

import { requireActiveUser } from "@/lib/users";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireActiveUser();

  if (gate.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (gate.status === "inactive") {
    return NextResponse.json({ error: "Inactive user" }, { status: 403 });
  }

  if (gate.status === "missing") {
    return NextResponse.json({ error: "User not provisioned" }, { status: 403 });
  }

  return NextResponse.json({ user: gate.user });
}
