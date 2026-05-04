import { useCallback } from "react";
import { RelayClient } from "@polymarket/builder-relayer-client";
import { checkAllApprovals, createAllApprovalCalls } from "@/utils/approvals";

export default function useTokenApprovals() {
  const checkAllTokenApprovals = useCallback(async (walletAddress: string) => {
    try {
      return await checkAllApprovals(walletAddress);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to check approvals");
      throw error;
    }
  }, []);

  const setAllTokenApprovals = useCallback(
    async (relayClient: RelayClient, walletAddress: string): Promise<boolean> => {
      try {
        const calls = createAllApprovalCalls();
        const deadline = String(Math.floor(Date.now() / 1000) + 3600);
        const response = await relayClient.executeDepositWalletBatch(
          calls,
          walletAddress,
          deadline
        );
        await response.wait();
        return true;
      } catch (err) {
        console.error("Failed to set all token approvals:", err);
        return false;
      }
    },
    []
  );

  return {
    checkAllTokenApprovals,
    setAllTokenApprovals,
  };
}
