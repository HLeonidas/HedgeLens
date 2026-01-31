import { NextResponse } from "next/server";

export const runtime = "nodejs";

function withApiKey(url: string, apiKey: string) {
  const parsed = new URL(url);
  if (!parsed.searchParams.has("apiKey")) {
    parsed.searchParams.set("apiKey", apiKey);
  }
  return parsed.toString();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Massive API key missing" }, { status: 500 });
  }

  let target: string;
  try {
    target = withApiKey(rawUrl, apiKey);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const upstream = await fetch(target);
  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: text || "Massive logo fetch failed" },
      { status: 502 }
    );
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
