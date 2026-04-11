"use client";

import { useState } from "react";
import { useWallet } from "@/providers/WalletContext";
import useSafeDeployment from "@/hooks/useSafeDeployment";
import usePolygonBalances from "@/hooks/usePolygonBalances";

import Card from "@/components/shared/Card";
import Badge from "@/components/shared/Badge";
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

  if (isLoading) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Trading Balance</h2>
        <p className="text-center text-white/70">Loading balance...</p>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Trading Balance</h2>
        <div className="bg-white/5 rounded-lg p-6 text-center">
          <p className="text-5xl font-bold">$0.00</p>
          <p className="text-xs text-gray-500 mt-2">
            Could not load balance — check your RPC connection
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Trading Balance</h2>
        <button
          onClick={() => setIsTransferModalOpen(true)}
          className="px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-lg transition-all"
        >
          Send
        </button>
      </div>

      <div className="bg-white/3 rounded-xl p-5 text-center border border-white/6">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-sm text-gray-400">USDC.e</span>
          <Badge className="text-[10px] px-1.5 py-0.5">Polygon</Badge>
        </div>

        <p className="text-4xl font-bold font-data">${formattedUsdcBalance}</p>
      </div>

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
    </Card>
  );
}
