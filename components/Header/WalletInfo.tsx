"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/providers/WalletContext";
import { useTrading } from "@/providers/TradingProvider";
import useAddressCopy from "@/hooks/useAddressCopy";
import usePolygonBalances from "@/hooks/usePolygonBalances";
import useConvertToPusd from "@/hooks/useConvertToPusd";
import { formatAddress } from "@/utils/formatting";
import TransferModal from "@/components/PolygonAssets/TransferModal";
import DepositModal from "@/components/DepositModal";
import { useToast } from "@/providers/ToastProvider";

const TOOLTIP_DISMISSED_KEY = "riftmarket_deposit_tooltip_dismissed";

export default function WalletInfo({
  onDisconnect,
}: {
  onDisconnect: () => void;
}) {
  const { eoaAddress } = useWallet();
  const { depositWalletAddress } = useTrading();
  const { copied: copiedWallet, copyAddress: copyWalletAddress } = useAddressCopy(
    depositWalletAddress || null
  );
  const {
    tradingTokens,
    pusdBalance,
    convertibleTokens,
    isLoading,
    isError,
  } = usePolygonBalances(depositWalletAddress, eoaAddress);
  const { convert, isConverting } = useConvertToPusd();
  const { showToast } = useToast();

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [showFundingTip, setShowFundingTip] = useState(false);
  const [showAddrTooltip, setShowAddrTooltip] = useState(false);
  const [tooltipDismissed, setTooltipDismissed] = useState(true);

  useEffect(() => {
    setTooltipDismissed(localStorage.getItem(TOOLTIP_DISMISSED_KEY) === "true");
  }, []);

  const pusdAmount = pusdBalance?.balance ?? 0;
  const hasLowBalance = !isLoading && !isError && pusdAmount < 1;
  const hasConvertible = convertibleTokens.length > 0;

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Balance display — show whenever connected (EOA or deposit wallet) */}
        {(depositWalletAddress || eoaAddress) && (
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
                  `$${pusdAmount.toFixed(2)}`
                )}
              </span>
              {hasLowBalance && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            {/* Funding tip dropdown */}
            {showFundingTip && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl z-50">
                {/* Tradeable pUSD balance */}
                {depositWalletAddress && (
                  <div className="mb-3">
                    <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Tradeable (pUSD)</div>
                    <p className="text-sm font-data font-bold text-white/90 tabular-nums">
                      ${pusdAmount.toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Convertible tokens in deposit wallet */}
                {hasConvertible && (
                  <div className="mb-3 pt-2 border-t border-white/5">
                    <div className="text-[10px] text-amber-400/60 uppercase tracking-wider mb-1.5">Not Tradeable — Convert to pUSD</div>
                    <div className="space-y-1.5">
                      {convertibleTokens.map((t) => {
                        const belowMin = t.balance < 2;
                        return (
                        <div key={t.symbol} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/40">{t.symbol}</span>
                            <span className="text-xs font-data text-white/60 tabular-nums">
                              ${t.formatted}
                            </span>
                          </div>
                          {belowMin ? (
                            <span className="text-[10px] text-white/20">Min $2</span>
                          ) : (
                          <button
                            onClick={async () => {
                              const ok = await convert(t);
                              if (ok) {
                                showToast(`Converting ${t.formatted} ${t.symbol} → pUSD. May take ~30s.`, "success");
                              } else {
                                showToast("Conversion failed", "error");
                              }
                            }}
                            disabled={isConverting}
                            className="px-2 py-0.5 rounded text-[10px] font-medium text-purple-400/80 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all disabled:opacity-50"
                          >
                            {isConverting ? "..." : "Convert"}
                          </button>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Other non-stablecoin tokens */}
                {tradingTokens.filter((t) => t.symbol !== "pUSD" && t.symbol !== "USDC" && t.symbol !== "USDC.e").length > 0 && (
                  <div className="mb-3 pt-2 border-t border-white/5">
                    <div className="text-[10px] text-white/20 uppercase tracking-wider mb-1.5">Other</div>
                    <div className="space-y-1">
                      {tradingTokens.filter((t) => t.symbol !== "pUSD" && t.symbol !== "USDC" && t.symbol !== "USDC.e").map((t) => (
                        <div key={t.symbol} className="flex items-center justify-between">
                          <span className="text-xs text-white/30">{t.symbol}</span>
                          <span className="text-xs font-data text-white/40 tabular-nums">
                            {t.formatted}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No deposit wallet yet */}
                {!depositWalletAddress && (
                  <div className="mb-3">
                    <p className="text-[11px] text-white/30">
                      Click a match to start setting up your trading wallet
                    </p>
                  </div>
                )}

                {/* Deposit hint */}
                {depositWalletAddress && (
                  <div className="mb-3 px-2.5 py-2 rounded-lg bg-amber-500/8 border border-amber-500/15">
                    <p className="text-[10px] text-amber-400/70 leading-relaxed">
                      Only <span className="font-bold text-amber-300/90">pUSD</span> can be used for trading. Convert USDC/USDC.e above (min <span className="font-bold text-amber-300/90">$2</span>).
                    </p>
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

        {/* Wallet address pill with tooltip */}
        {depositWalletAddress && (
          <div className="relative">
            <button
              onClick={() => {
                if (!tooltipDismissed && !copiedWallet) {
                  setShowAddrTooltip((v) => !v);
                } else {
                  copyWalletAddress();
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/8 border border-white/6 transition-all cursor-pointer group"
            >
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-data text-white/50 group-hover:text-white/80 transition-colors">
                {copiedWallet ? "Copied!" : formatAddress(depositWalletAddress)}
              </span>
              {!tooltipDismissed && (
                <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
              )}
            </button>

            {showAddrTooltip && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                {/* Header */}
                <div className="px-4 pt-3.5 pb-2.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-green-500/15 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-green-400">
                        <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-white/80">Deposit Wallet</span>
                  </div>
                </div>

                {/* Two deposit methods */}
                <div className="p-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] text-purple-400 font-bold">1</span>
                    </div>
                    <div>
                      <p className="text-[11px] text-white/70 font-medium leading-tight">Direct transfer</p>
                      <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">
                        Send <span className="text-white/50 font-medium">pUSD</span> or <span className="text-white/50 font-medium">USDC.e</span> to this address on Polygon. No minimum.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] text-green-400 font-bold">2</span>
                    </div>
                    <div>
                      <p className="text-[11px] text-white/70 font-medium leading-tight">Bridge (other tokens / chains)</p>
                      <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">
                        Use the <span className="text-green-400/70 font-medium">Deposit</span> button for any token or chain. Auto-converts to pUSD. Min $2.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={() => {
                      copyWalletAddress();
                      setShowAddrTooltip(false);
                    }}
                    className="text-[11px] text-blue-400/70 hover:text-blue-300 font-medium transition-colors"
                  >
                    Copy address
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem(TOOLTIP_DISMISSED_KEY, "true");
                      setTooltipDismissed(true);
                      setShowAddrTooltip(false);
                    }}
                    className="text-[10px] text-white/20 hover:text-white/40 transition-colors"
                  >
                    Don&apos;t show again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Disconnect */}
        <button
          onClick={onDisconnect}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
        >
          Disconnect
        </button>
      </div>

      {/* Backdrop to close dropdowns */}
      {(showFundingTip || showAddrTooltip) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowFundingTip(false);
            setShowAddrTooltip(false);
          }}
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
