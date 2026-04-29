"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Portal from "@/components/Portal";
import SelectDropdown from "@/components/shared/SelectDropdown";
import { useTrading } from "@/providers/TradingProvider";
import {
  useDeposit,
  useSupportedAssets,
  type SupportedAsset,
  type DepositTransaction,
  type DepositStatus,
} from "@/hooks/useDeposit";
import useAddressCopy from "@/hooks/useAddressCopy";

type DepositModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

// Chain metadata for display
const CHAIN_META: Record<string, { label: string; color: string; icon?: string }> = {
  "1": { label: "Ethereum", color: "#627EEA", icon: "https://assets.coingecko.com/coins/images/279/small/ethereum.png" },
  "137": { label: "Polygon", color: "#8247E5", icon: "https://assets.coingecko.com/coins/images/4713/small/polygon.png" },
  "42161": { label: "Arbitrum", color: "#28A0F0", icon: "https://assets.coingecko.com/coins/images/16547/small/arb.jpg" },
  "10": { label: "Optimism", color: "#FF0420", icon: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png" },
  "8453": { label: "Base", color: "#0052FF", icon: "https://assets.coingecko.com/asset_platforms/images/131/small/base.jpeg" },
  "56": { label: "BNB Chain", color: "#F0B90B", icon: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png" },
  "1151111081099710": { label: "Solana", color: "#9945FF", icon: "https://assets.coingecko.com/coins/images/4128/small/solana.png" },
  "8253038": { label: "Bitcoin", color: "#F7931A", icon: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png" },
  "728126428": { label: "Tron", color: "#FF0013", icon: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png" },
  "999": { label: "HyperEVM", color: "#00D395" },
  "143": { label: "Monad", color: "#836EF9" },
  "2741": { label: "Abstract", color: "#FFFFFF" },
  "5064014": { label: "Ethereal", color: "#A78BFA" },
};

// Token logo URLs by symbol
const TOKEN_ICONS: Record<string, string> = {
  "USDC": "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  "USDC.e": "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  "USDT": "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  "ETH": "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  "WETH": "https://assets.coingecko.com/coins/images/2518/small/weth.png",
  "DAI": "https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png",
  "BTC": "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  "WBTC": "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png",
  "SOL": "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  "BNB": "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  "POL": "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  "MATIC": "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  "TRX": "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png",
};

const CHAIN_ORDER = [
  "1", "137", "42161", "8453", "10", "56",
  "1151111081099710", "8253038", "728126428",
  "999", "143", "2741", "5064014",
];

function getDepositAddressForChain(
  chainId: string,
  addresses: { evm: string; svm?: string; btc?: string; tvm?: string }
): string {
  if (chainId === "1151111081099710") return addresses.svm || "";
  if (chainId === "8253038") return addresses.btc || "";
  if (chainId === "728126428") return addresses.tvm || addresses.evm;
  return addresses.evm;
}

function statusLabel(status: DepositStatus): string {
  switch (status) {
    case "DEPOSIT_DETECTED": return "Deposit detected";
    case "PROCESSING": return "Processing...";
    case "ORIGIN_TX_CONFIRMED": return "Confirmed on source chain";
    case "SUBMITTED": return "Submitting to Polygon...";
    case "COMPLETED": return "Completed!";
    case "FAILED": return "Failed";
    default: return status;
  }
}

function statusColor(status: DepositStatus): string {
  if (status === "COMPLETED") return "text-green-400";
  if (status === "FAILED") return "text-red-400";
  return "text-amber-300";
}

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { safeAddress } = useTrading();
  const { data: assets, isLoading: assetsLoading } = useSupportedAssets();
  const {
    depositAddresses,
    isGenerating,
    error,
    generateDepositAddresses,
    transactions,
    isPolling,
    startPolling,
    stopPolling,
  } = useDeposit(safeAddress);

  const [selectedChainId, setSelectedChainId] = useState<string>("137");
  const [selectedTokenAddr, setSelectedTokenAddr] = useState<string>("");

  // Group assets by chain
  const chainGroups = useMemo(() => {
    if (!assets) return new Map<string, SupportedAsset[]>();
    const map = new Map<string, SupportedAsset[]>();
    for (const a of assets) {
      const list = map.get(a.chainId) || [];
      list.push(a);
      map.set(a.chainId, list);
    }
    return map;
  }, [assets]);

  // Sorted chain options for dropdown
  const chainOptions = useMemo(() => {
    const ids = Array.from(chainGroups.keys());
    ids.sort((a, b) => {
      const ai = CHAIN_ORDER.indexOf(a);
      const bi = CHAIN_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    return ids.map((id) => {
      const meta = CHAIN_META[id] || { label: `Chain ${id}`, color: "#888" };
      return { value: id, label: meta.label, color: meta.color, icon: meta.icon };
    });
  }, [chainGroups]);

  // Token options for selected chain
  const tokensForChain = useMemo(
    () => chainGroups.get(selectedChainId) || [],
    [chainGroups, selectedChainId]
  );

  const tokenOptions = useMemo(
    () =>
      tokensForChain.map((a) => ({
        value: a.token.address,
        label: a.token.symbol,
        icon: TOKEN_ICONS[a.token.symbol],
      })),
    [tokensForChain]
  );

  // Auto-select first token when chain changes
  useEffect(() => {
    if (tokensForChain.length > 0) {
      const usdc = tokensForChain.find((t) => t.token.symbol === "USDC");
      const usdt = tokensForChain.find((t) => t.token.symbol === "USDT");
      setSelectedTokenAddr(
        usdc?.token.address || usdt?.token.address || tokensForChain[0].token.address
      );
    }
  }, [tokensForChain]);

  // Generate deposit addresses when modal opens
  useEffect(() => {
    if (isOpen && safeAddress && !depositAddresses && !isGenerating) {
      generateDepositAddresses();
    }
  }, [isOpen, safeAddress, depositAddresses, isGenerating, generateDepositAddresses]);

  const currentDepositAddress = depositAddresses
    ? getDepositAddressForChain(selectedChainId, depositAddresses)
    : "";

  const { copied, copyAddress } = useAddressCopy(currentDepositAddress || null);

  const handleStartPolling = useCallback(() => {
    if (currentDepositAddress) {
      startPolling(currentDepositAddress);
    }
  }, [currentDepositAddress, startPolling]);

  useEffect(() => {
    if (!isOpen) stopPolling();
  }, [isOpen, stopPolling]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedToken = tokensForChain.find(
    (t) => t.token.address === selectedTokenAddr
  );
  const chainMeta = CHAIN_META[selectedChainId] || {
    label: `Chain ${selectedChainId}`,
    color: "#888",
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-white/10 shadow-2xl animate-modal-fade-in max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold">Deposit</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-500/20 border border-red-500/40 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {assetsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Chain dropdown */}
              <SelectDropdown
                label="Source Chain"
                value={selectedChainId}
                onChange={setSelectedChainId}
                options={chainOptions}
              />

              {/* Token dropdown */}
              {tokenOptions.length > 1 && (
                <SelectDropdown
                  label="Token"
                  value={selectedTokenAddr}
                  onChange={setSelectedTokenAddr}
                  options={tokenOptions}
                />
              )}

              {/* Min deposit */}
              {selectedToken && (
                <div className="mb-4 text-[11px] text-white/30">
                  Min deposit: ${selectedToken.minCheckoutUsd} USD
                </div>
              )}

              {/* Deposit address */}
              <div className="mb-4">
                <label className="block text-xs text-white/40 mb-1.5 font-medium">
                  Send {selectedToken?.token.symbol || "tokens"} on {chainMeta.label} to
                </label>
                {isGenerating ? (
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg p-4">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    <span className="text-xs text-white/40">Generating deposit address...</span>
                  </div>
                ) : currentDepositAddress ? (
                  <button
                    onClick={copyAddress}
                    className="w-full text-left bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 rounded-lg p-4 transition-all group cursor-pointer"
                  >
                    <div className="font-mono text-sm text-white/80 break-all leading-relaxed">
                      {currentDepositAddress}
                    </div>
                    <div className="mt-2 text-[11px] text-white/30 group-hover:text-white/50 transition-colors">
                      {copied ? "Copied!" : "Click to copy"}
                    </div>
                  </button>
                ) : (
                  <div className="bg-white/5 rounded-lg p-4 text-xs text-white/30">
                    Could not generate address. Please try again.
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="mb-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-[11px] text-blue-300/80 leading-relaxed">
                  Send any supported token on the selected chain to this address.
                  It will be automatically bridged and converted to trading balance on Polygon.
                  This usually takes 1-5 minutes.
                </p>
              </div>

              {/* Status polling */}
              {currentDepositAddress && (
                <div>
                  {!isPolling && transactions.length === 0 && (
                    <button
                      onClick={handleStartPolling}
                      className="w-full py-2.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/8 text-white/60 hover:text-white/90 transition-all"
                    >
                      I sent the funds — check status
                    </button>
                  )}

                  {isPolling && transactions.length === 0 && (
                    <div className="flex items-center gap-2 bg-white/5 rounded-lg p-3">
                      <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                      <span className="text-xs text-white/40">Waiting for deposit...</span>
                    </div>
                  )}

                  {transactions.length > 0 && (
                    <div className="space-y-2">
                      {transactions.map((tx, i) => (
                        <TransactionRow key={i} tx={tx} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}

function TransactionRow({ tx }: { tx: DepositTransaction }) {
  const chainMeta = CHAIN_META[tx.fromChainId];
  const isComplete = tx.status === "COMPLETED";
  const isFailed = tx.status === "FAILED";

  return (
    <div
      className={`flex items-center justify-between bg-white/5 rounded-lg p-3 border ${
        isComplete
          ? "border-green-500/20"
          : isFailed
          ? "border-red-500/20"
          : "border-white/8"
      }`}
    >
      <div className="flex items-center gap-2">
        {!isComplete && !isFailed && (
          <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        )}
        {isComplete && (
          <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center text-[8px] text-white">
            ✓
          </div>
        )}
        {isFailed && (
          <div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center text-[8px] text-white">
            ✕
          </div>
        )}
        <span className="text-xs text-white/60">
          {chainMeta?.label || `Chain ${tx.fromChainId}`}
        </span>
      </div>
      <span className={`text-xs font-medium ${statusColor(tx.status)}`}>
        {statusLabel(tx.status)}
      </span>
    </div>
  );
}
