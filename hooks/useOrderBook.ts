import { useQuery } from "@tanstack/react-query";

export interface OrderBookLevel {
  price: string;
  size: string;
}

export interface OrderBookData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  midpoint: number;
}

async function fetchOrderBook(tokenId: string): Promise<OrderBookData> {
  const res = await fetch(`/api/orderbook?token_id=${tokenId}`);
  if (!res.ok) throw new Error("Failed to fetch order book");
  const data = await res.json();

  const bids: OrderBookLevel[] = (data.bids || []).sort(
    (a: OrderBookLevel, b: OrderBookLevel) =>
      parseFloat(b.price) - parseFloat(a.price)
  );
  const asks: OrderBookLevel[] = (data.asks || []).sort(
    (a: OrderBookLevel, b: OrderBookLevel) =>
      parseFloat(a.price) - parseFloat(b.price)
  );

  const bestBid = bids.length > 0 ? parseFloat(bids[0].price) : 0;
  const bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : 1;

  return {
    bids,
    asks,
    spread: Math.max(bestAsk - bestBid, 0),
    midpoint: (bestBid + bestAsk) / 2,
  };
}

export default function useOrderBook({
  tokenId,
  enabled = true,
}: {
  tokenId: string | null;
  enabled?: boolean;
}) {
  return useQuery<OrderBookData>({
    queryKey: ["orderbook", tokenId],
    queryFn: () => fetchOrderBook(tokenId!),
    enabled: enabled && !!tokenId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}
