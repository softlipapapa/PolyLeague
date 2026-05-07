import { useCallback } from "react";
import { ClobClient, Chain, SignatureTypeV2 } from "@polymarket/clob-client-v2";
import { useWallet } from "@/providers/WalletContext";
import { CLOB_API_URL } from "@/constants/polymarket";

export interface UserApiCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

export default function useUserApiCredentials() {
  const { eoaAddress, ethersSigner } = useWallet();

  const createOrDeriveUserApiCredentials =
    useCallback(async (depositWalletAddress: string): Promise<UserApiCredentials> => {
      if (!eoaAddress || !ethersSigner) throw new Error("Wallet not connected");

      const tempClient = new ClobClient({
        host: CLOB_API_URL,
        chain: Chain.POLYGON,
        signer: ethersSigner,
        signatureType: SignatureTypeV2.POLY_1271,
        funderAddress: depositWalletAddress,
      });

      try {
        const derivedCreds = await tempClient.deriveApiKey().catch(() => null);

        if (
          derivedCreds?.key &&
          derivedCreds?.secret &&
          derivedCreds?.passphrase
        ) {
          console.log("Derived existing API credentials");
          return derivedCreds;
        }

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
