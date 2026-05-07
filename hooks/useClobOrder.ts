import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Side, OrderType } from "@polymarket/clob-client-v2";
import type { ClobClient, UserOrderV2, UserMarketOrderV2 } from "@polymarket/clob-client-v2";

function parseClobError(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err);

  // Try to extract the nested JSON error from CLOB client
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed?.status === 425 || parsed?.data === "service not ready") {
        return new Error("Polymarket is temporarily unavailable. Please try again in a moment.");
      }

      const msg = parsed?.data?.error || parsed?.error;
      if (typeof msg === "string") return new Error(msg);
    } catch {}
  }

  if (err instanceof Error) return err;
  return new Error("Failed to submit order");
}

export type OrderParams = {
  tokenId: string;
  size: number;
  price?: number;
  side: "BUY" | "SELL";
  negRisk?: boolean;
  isMarketOrder?: boolean;
};

export default function useClobOrder(
  clobClient: ClobClient | null,
  walletAddress: string | undefined
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const submitOrder = useCallback(
    async (params: OrderParams) => {
      if (!walletAddress) {
        throw new Error("Wallet not connected");
      }
      if (!clobClient) {
        throw new Error("CLOB client not initialized");
      }

      setIsSubmitting(true);
      setError(null);
      setOrderId(null);

      try {
        const side = params.side === "BUY" ? Side.BUY : Side.SELL;
        let response;

        if (params.isMarketOrder) {
          // For market orders, use createAndPostMarketOrder with FOK
          // BUY orders need amount in dollars (size * askPrice)
          // SELL orders need amount in shares
          let marketAmount: number;

          if (side === Side.BUY) {
            // Get the ask price (price to buy at)
            const priceResponse = await clobClient.getPrice(
              params.tokenId,
              Side.SELL // Get sell side price = ask price for buyers
            );
            const askPrice = parseFloat(priceResponse.price);

            if (isNaN(askPrice) || askPrice <= 0 || askPrice >= 1) {
              throw new Error("Unable to get valid market price");
            }

            // Convert shares to dollar amount for BUY orders
            marketAmount = params.size * askPrice;
          } else {
            // For SELL orders, amount is in shares
            marketAmount = params.size;
          }

          const marketOrder: UserMarketOrderV2 = {
            tokenID: params.tokenId,
            amount: marketAmount,
            side,
          };

          response = await clobClient.createAndPostMarketOrder(
            marketOrder,
            { negRisk: params.negRisk },
            OrderType.FOK // Fill or Kill for market orders
          );
        } else {
          // For limit orders, use createAndPostOrder with GTC
          if (!params.price) {
            throw new Error("Price required for limit orders");
          }

          const limitOrder: UserOrderV2 = {
            tokenID: params.tokenId,
            price: params.price,
            size: params.size,
            side,
          };

          response = await clobClient.createAndPostOrder(
            limitOrder,
            { negRisk: params.negRisk },
            OrderType.GTC // Good Till Cancelled for limit orders
          );
        }

        if (response.orderID) {
          setOrderId(response.orderID);
          queryClient.invalidateQueries({ queryKey: ["active-orders"] });
          queryClient.invalidateQueries({ queryKey: ["polymarket-positions"] });
          return { success: true, orderId: response.orderID };
        } else {
          throw new Error("Order submission failed");
        }
      } catch (err: unknown) {
        const error = parseClobError(err);
        setError(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [clobClient, walletAddress, queryClient]
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      if (!clobClient) {
        throw new Error("CLOB client not initialized");
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await clobClient.cancelOrder({ orderID: orderId });
        queryClient.invalidateQueries({ queryKey: ["active-orders"] });
        return { success: true };
      } catch (err: unknown) {
        const error =
          err instanceof Error ? err : new Error("Failed to cancel order");
        setError(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [clobClient, queryClient]
  );

  return {
    submitOrder,
    cancelOrder,
    isSubmitting,
    error,
    orderId,
  };
}
