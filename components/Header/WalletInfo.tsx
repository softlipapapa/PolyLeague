"use client";

import { useState } from "react";
import { useWallet } from "@/providers/WalletContext";
import useAddressCopy from "@/hooks/useAddressCopy";
import useSafeDeployment from "@/hooks/useSafeDeployment";
import usePolygonBalances from "@/hooks/usePolygonBalances";
import { formatAddress } from "@/utils/formatting";
import TransferModal from "@/components/PolygonAssets/TransferModal";

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
              <div className="absolute right-0 top-full mt-2 w-72 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl z-50">
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

                {/* Funding notice */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-3">
                  <p className="text-[11px] text-amber-300/90 leading-relaxed">
                    <span className="font-semibold">Deposit Notice:</span> To place bets, send USDC.e to your Safe wallet address. Click the address to copy it.
                  </p>
                </div>

                {/* Withdraw button */}
                <button
                  onClick={() => {
                    setShowFundingTip(false);
                    setIsTransferModalOpen(true);
                  }}
                  className="w-full py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white/90 bg-white/5 hover:bg-white/10 border border-white/8 transition-all"
                >
                  Withdraw
                </button>
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
    </>
  );
}
