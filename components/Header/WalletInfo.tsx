"use client";

import { useState } from "react";
import { useWallet } from "@/providers/WalletContext";
import useAddressCopy from "@/hooks/useAddressCopy";
import useSafeDeployment from "@/hooks/useSafeDeployment";
import usePolygonBalances from "@/hooks/usePolygonBalances";
import { formatAddress } from "@/utils/formatting";
import TransferModal from "@/components/PolygonAssets/TransferModal";
import DepositModal from "@/components/DepositModal";

export default function WalletInfo({
  onDisconnect,
}: {
  onDisconnect: () => void;
}) {
  const { eoaAddress } = useWallet();
  const { derivedSafeAddressFromEoa } = useSafeDeployment(eoaAddress);
  const { copied: copiedSafe, copyAddress: copySafeAddress } = useAddressCopy(
    derivedSafeAddressFromEoa || null
  );
  const { formattedTotal, isLoading, isError, tokens } = usePolygonBalances(
    derivedSafeAddressFromEoa
  );

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [showFundingTip, setShowFundingTip] = useState(false);

  const totalUsd = parseFloat(formattedTotal || "0");
  const hasLowBalance = !isLoading && !isError && totalUsd < 1;

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Balance display */}
        {derivedSafeAddressFromEoa && (
          <div className="relative">
            <button
              onClick={() => setShowFundingTip(!showFundingTip)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/8 border border-white/6 transition-all cursor-pointer group"
            >
              <span className="text-xs font-data font-bold text-white/80 tabular-nums">
                {isLoading ? (
                  <span className="text-white/20">--</span>
                ) : isError ? (
                  "$0.00"
                ) : (
                  `$${formattedTotal}`
                )}
              </span>
              {hasLowBalance && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            {/* Funding tip dropdown */}
            {showFundingTip && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl z-50">
                {/* Token breakdown */}
                {tokens.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {tokens.map((t) => (
                      <div key={t.symbol} className="flex items-center justify-between">
                        <span className="text-xs text-white/40">{t.symbol}</span>
                        <span className="text-xs font-data text-white/60 tabular-nums">
                          {t.formatted}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Deposit + Withdraw buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowFundingTip(false);
                      setIsDepositModalOpen(true);
                    }}
                    className="flex-1 py-2 rounded-lg text-xs font-medium text-green-400/80 hover:text-green-300 bg-green-500/10 hover:bg-green-500/15 border border-green-500/20 transition-all"
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => {
                      setShowFundingTip(false);
                      setIsTransferModalOpen(true);
                    }}
                    className="flex-1 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white/90 bg-white/5 hover:bg-white/10 border border-white/8 transition-all"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Safe address pill */}
        {derivedSafeAddressFromEoa && (
          <button
            onClick={copySafeAddress}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/8 border border-white/6 transition-all cursor-pointer group"
          >
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-data text-white/50 group-hover:text-white/80 transition-colors">
              {copiedSafe ? "Copied!" : formatAddress(derivedSafeAddressFromEoa)}
            </span>
          </button>
        )}

        {/* Disconnect */}
        <button
          onClick={onDisconnect}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
        >
          Disconnect
        </button>
      </div>

      {/* Backdrop to close dropdown */}
      {showFundingTip && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowFundingTip(false)}
        />
      )}

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
      />
    </>
  );
}
