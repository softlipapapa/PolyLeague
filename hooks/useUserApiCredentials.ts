import { useCallback } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { useWallet } from "@/providers/WalletContext";
import { CLOB_API_URL, POLYGON_CHAIN_ID } from "@/constants/polymarket";

export interface UserApiCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

// This hook's sole purpose is to derive or create
// the User API Credentials with a temporary ClobClient

export default function useUserApiCredentials() {
  const { eoaAddress, ethersSigner } = useWallet();

  // Creates temporary clobClient with ethers signer from walletClient
  const createOrDeriveUserApiCredentials =
    useCallback(async (): Promise<UserApiCredentials> => {
      if (!eoaAddress || !ethersSigner) throw new Error("Wallet not connected");

      const tempClient = new ClobClient(
        CLOB_API_URL,
        POLYGON_CHAIN_ID,
        ethersSigner
      );

      try {
        // Try to derive existing credentials first (expected to fail for new users)
        const derivedCreds = await tempClient.deriveApiKey().catch(() => null);

        if (
          derivedCreds?.key &&
          derivedCreds?.secret &&
          derivedCreds?.passphrase
        ) {
          console.log("Derived existing API credentials");
          return derivedCreds;
        }

        // Derive failed (normal for first-time users) — create new credentials
        console.log("Creating new API credentials (first-time setup)...");
        const newCreds = await tempClient.createApiKey();
        console.log("API credentials created successfully");
        return newCreds;
      } catch (err) {
        console.error("Failed to get credentials:", err);
        throw err;
      }
    }, [eoaAddress, ethersSigner]);

  return { createOrDeriveUserApiCredentials };
}
