import { NextRequest, NextResponse } from "next/server";

const DATA_API_URL = "https://data-api.polymarket.com";

export interface HolderData {
  proxyWallet: string;
  bio: string;
  asset: string;
  pseudonym: string;
  amount: number;
  displayUsernamePublic: boolean;
  outcomeIndex: number;
  name: string;
  profileImage: string;
  profileImageOptimized: string;
}

export interface TokenHolders {
  token: string;
  holders: HolderData[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const market = searchParams.get("market"); // conditionId (comma-separated for multiple)
  const limit = searchParams.get("limit") || "10";

  if (!market) {
    return NextResponse.json(
      { error: "market (conditionId) parameter is required" },
      { status: 400 }
    );
  }

  try {
    const url = `${DATA_API_URL}/holders?market=${encodeURIComponent(market)}&limit=${limit}&minBalance=1`;

    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 60 }, // cache for 60s
    });

    if (!response.ok) {
      throw new Error(`Data API error: ${response.status}`);
    }

    const data: TokenHolders[] = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching top holders:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch top holders",
      },
      { status: 500 }
    );
  }
}
