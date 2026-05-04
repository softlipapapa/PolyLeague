import { useMemo } from "react";
import { useWallet } from "@/providers/WalletContext";
import { ClobClient, Chain, SignatureTypeV2 } from "@polymarket/clob-client-v2";

import { TradingSession } from "@/utils/session";
import { CLOB_API_URL } from "@/constants/polymarket";
import { BUILDER_CODE } from "@/constants/api";

export default function useClobClient(
  tradingSession: TradingSession | null,
  isTradingSessionComplete: boolean | undefined
) {
  const { eoaAddress, ethersSigner } = useWallet();

  const clobClient = useMemo(() => {
    if (
      !ethersSigner ||
      !eoaAddress ||
      !tradingSession?.depositWalletAddress ||
      !isTradingSessionComplete ||
      !tradingSession?.apiCredentials
    ) {
      return null;
    }

    return new ClobClient({
      host: CLOB_API_URL,
      chain: Chain.POLYGON,
      signer: ethersSigner,
      creds: tradingSession.apiCredentials,
      signatureType: SignatureTypeV2.POLY_1271,
      funderAddress: tradingSession.depositWalletAddress,
      builderConfig: { builderCode: BUILDER_CODE },
    });
  }, [
    eoaAddress,
    ethersSigner,
    tradingSession?.depositWalletAddress,
    isTradingSessionComplete,
    tradingSession?.apiCredentials,
  ]);

  return { clobClient };
}
