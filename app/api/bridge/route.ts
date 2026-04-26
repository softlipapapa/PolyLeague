import { NextRequest, NextResponse } from "next/server";

const BRIDGE_BASE = "https://bridge.polymarket.com";

// Proxy for Polymarket Bridge API (deposit addresses, supported assets, status, quote)
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");

  if (action === "supported-assets") {
    const res = await fetch(`${BRIDGE_BASE}/supported-assets`, {
      next: { revalidate: 3600 }, // cache 1h
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch supported assets" },
        { status: res.status }
      );
    }
    return NextResponse.json(await res.json());
  }

  if (action === "status") {
    const address = req.nextUrl.searchParams.get("address");
    if (!address) {
      return NextResponse.json(
        { error: "address is required" },
        { status: 400 }
      );
    }
    const res = await fetch(`${BRIDGE_BASE}/status/${address}`);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch status" },
        { status: res.status }
      );
    }
    return NextResponse.json(await res.json());
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");

  if (action === "deposit") {
    const body = await req.json();
    const res = await fetch(`${BRIDGE_BASE}/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: body.address }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.error || "Failed to create deposit" },
        { status: res.status }
      );
    }
    return NextResponse.json(await res.json());
  }

  if (action === "quote") {
    const body = await req.json();
    const res = await fetch(`${BRIDGE_BASE}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.error || "Failed to get quote" },
        { status: res.status }
      );
    }
    return NextResponse.json(await res.json());
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
