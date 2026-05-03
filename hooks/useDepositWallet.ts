import { useCallback, useMemo } from "react";
import {
  RelayClient,
  RelayerTransactionState,
} from "@polymarket/builder-relayer-client";
import { useWallet } from "@/providers/WalletContext";

export default function useDepositWallet(eoaAddress?: string) {
  const { publicClient } = useWallet();

  const deriveDepositWalletAddress = useCallback(
    async (relayClient: RelayClient): Promise<string> => {
      return relayClient.deriveDepositWalletAddress();
    },
    []
  );

  const isWalletDeployed = useCallback(
    async (relayClient: RelayClient, walletAddress: string): Promise<boolean> => {
      try {
        const deployed = await relayClient.getDeployed(walletAddress, "WALLET");
        return deployed;
      } catch (err) {
        console.warn("API check failed, falling back to RPC", err);
        const code = await publicClient?.getCode({
          address: walletAddress as `0x${string}`,
        });
        return !!code && code !== "0x";
      }
    },
    [publicClient]
  );

  const deployDepositWallet = useCallback(
    async (relayClient: RelayClient): Promise<string> => {
      const response = await relayClient.deployDepositWallet();
      const result = await relayClient.pollUntilState(
        response.transactionID,
        [
          RelayerTransactionState.STATE_MINED,
          RelayerTransactionState.STATE_CONFIRMED,
        ],
        RelayerTransactionState.STATE_FAILED,
        60,
        3000
      );

      if (!result) {
        throw new Error("Deposit wallet deployment failed");
      }

      return result.proxyAddress;
    },
    []
  );

  return {
    deriveDepositWalletAddress,
    isWalletDeployed,
    deployDepositWallet,
  };
}
