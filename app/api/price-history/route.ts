import { NextRequest, NextResponse } from "next/server";
import { CLOB_API_URL } from "@/constants/api";

export interface PricePoint {
  t: number;
  p: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const market = searchParams.get("market"); // token ID (asset id)
  const interval = searchParams.get("interval") || "1d";
  const fidelity = searchParams.get("fidelity") || "60"; // 60 min default

  if (!market) {
    return NextResponse.json(
      { error: "market (token ID) parameter is required" },
      { status: 400 }
    );
  }

  try {
    const url = `${CLOB_API_URL}/prices-history?market=${encodeURIComponent(market)}&interval=${interval}&fidelity=${fidelity}`;

    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching price history:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch price history",
      },
      { status: 500 }
    );
  }
}
