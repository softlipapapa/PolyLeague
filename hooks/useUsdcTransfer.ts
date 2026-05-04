import { useState, useCallback } from "react";
import { RelayClient } from "@polymarket/builder-relayer-client";
import { createUsdcTransferCall, TransferParams } from "@/utils/transfer";

export default function useUsdcTransfer() {
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const transferUsdc = useCallback(
    async (
      relayClient: RelayClient,
      walletAddress: string,
      params: TransferParams
    ): Promise<boolean> => {
      setIsTransferring(true);
      setError(null);

      try {
        const call = createUsdcTransferCall(params);
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
          err instanceof Error ? err : new Error("Failed to transfer USDC.e");
        setError(error);
        console.error("Transfer error:", error);
        throw error;
      } finally {
        setIsTransferring(false);
      }
    },
    []
  );

  return {
    isTransferring,
    error,
    transferUsdc,
  };
}
