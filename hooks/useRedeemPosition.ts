import { useState, useCallback } from "react";
import { RelayClient } from "@polymarket/builder-relayer-client";
import { createRedeemCall, RedeemParams } from "@/utils/redeem";

export default function useRedeemPosition() {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const redeemPosition = useCallback(
    async (
      relayClient: RelayClient,
      walletAddress: string,
      params: RedeemParams
    ): Promise<boolean> => {
      setIsRedeeming(true);
      setError(null);

      try {
        const call = createRedeemCall(params);
        const deadline = String(Math.floor(Date.now() / 1000) + 3600);

        const response = await relayClient.executeDepositWalletBatch(
          [call],
          walletAddress,
          deadline
        );

        await response.wait();
        return true;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to redeem position");
        setError(error);
        console.error("Redeem error:", error);
        throw error;
      } finally {
        setIsRedeeming(false);
      }
    },
    []
  );

  return {
    isRedeeming,
    error,
    redeemPosition,
  };
}
