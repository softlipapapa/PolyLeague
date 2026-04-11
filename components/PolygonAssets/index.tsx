"use client";

import { useState } from "react";
import { useWallet } from "@/providers/WalletContext";
import useSafeDeployment from "@/hooks/useSafeDeployment";
import usePolygonBalances from "@/hooks/usePolygonBalances";

import TransferModal from "@/components/PolygonAssets/TransferModal";

export default function PolygonAssets() {
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const { eoaAddress } = useWallet();
  const { derivedSafeAddressFromEoa } = useSafeDeployment(eoaAddress);
  const { formattedUsdcBalance, isLoading, isError } = usePolygonBalances(
    derivedSafeAddressFromEoa
  );

  if (!derivedSafeAddressFromEoa) {
    return null;
  }

  return (
    <div className="glass px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold font-data tabular-nums">
            {isLoading ? (
              <span className="text-white/20">--</span>
            ) : isError ? (
              "$0.00"
            ) : (
              `$${formattedUsdcBalance}`
            )}
          </span>
          <span className="text-xs text-white/25 font-medium">USDC.e</span>
        </div>
        <button
          onClick={() => setIsTransferModalOpen(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/30 hover:text-white/70 hover:bg-white/5 transition-all cursor-pointer"
        >
          Send
        </button>
      </div>
      {isError && (
        <p className="text-[10px] text-white/15 mt-1">
          Could not load balance
        </p>
      )}

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
    </div>
  );
}
