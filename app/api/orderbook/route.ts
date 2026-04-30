import { NextRequest, NextResponse } from "next/server";
import { CLOB_API_URL } from "@/constants/api";

export async function GET(request: NextRequest) {
  const tokenId = request.nextUrl.searchParams.get("token_id");

  if (!tokenId) {
    return NextResponse.json({ error: "token_id required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${CLOB_API_URL}/book?token_id=${tokenId}`, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 10 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `CLOB API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Order book fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order book" },
      { status: 500 }
    );
  }
}
