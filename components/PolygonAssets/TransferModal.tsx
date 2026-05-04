"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import useUsdcTransfer from "@/hooks/useUsdcTransfer";
import { useTrading } from "@/providers/TradingProvider";
import usePolygonBalances from "@/hooks/usePolygonBalances";
import { useSupportedAssets, type DepositTransaction, type DepositStatus } from "@/hooks/useDeposit";

import Portal from "@/components/Portal";
import SelectDropdown from "@/components/shared/SelectDropdown";

import { USDC_E_DECIMALS } from "@/constants/tokens";
import { SUCCESS_STYLES } from "@/constants/ui";
import { cn } from "@/utils/classNames";
import { parseUnits } from "viem";

// Chain metadata (same as DepositModal)
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
  "137", "1", "42161", "8453", "10", "56",
  "1151111081099710", "8253038", "728126428",
  "999", "143", "2741", "5064014",
];

type TransferModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function statusLabel(status: DepositStatus): string {
  switch (status) {
    case "DEPOSIT_DETECTED": return "Withdrawal initiated";
    case "PROCESSING": return "Processing...";
    case "ORIGIN_TX_CONFIRMED": return "Confirmed on Polygon";
    case "SUBMITTED": return "Bridging to destination...";
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

export default function TransferModal({ isOpen, onClose }: TransferModalProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState("137");
  const [selectedTokenAddr, setSelectedTokenAddr] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isBridgeWithdrawing, setIsBridgeWithdrawing] = useState(false);
  const [bridgeTxs, setBridgeTxs] = useState<DepositTransaction[]>([]);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const { relayClient, depositWalletAddress } = useTrading();
  const { isTransferring, error: transferError, transferUsdc } = useUsdcTransfer();
  const { formattedUsdcBalance, rawUsdcBalance } = usePolygonBalances(depositWalletAddress);
  const { data: assets, isLoading: assetsLoading } = useSupportedAssets();

  const isPolygonDirect = selectedChainId === "137";

  // Group assets by chain
  const chainGroups = useMemo(() => {
    if (!assets) return new Map<string, typeof assets>();
    const map = new Map<string, typeof assets>();
    for (const a of assets) {
      const list = map.get(a.chainId) || [];
      list.push(a);
      map.set(a.chainId, list);
    }
    return map;
  }, [assets]);

  // Chain options for dropdown
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
    () => tokensForChain.map((a) => ({ value: a.token.address, label: a.token.symbol, icon: TOKEN_ICONS[a.token.symbol] })),
    [tokensForChain]
  );

  // Auto-select token when chain changes
  useEffect(() => {
    if (tokensForChain.length > 0) {
      const usdc = tokensForChain.find((t) => t.token.symbol === "USDC");
      const usdt = tokensForChain.find((t) => t.token.symbol === "USDT");
      setSelectedTokenAddr(
        usdc?.token.address || usdt?.token.address || tokensForChain[0].token.address
      );
    }
  }, [tokensForChain]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setRecipient("");
      setAmount("");
      setShowSuccess(false);
      setWithdrawError(null);
      setBridgeTxs([]);
      setSelectedChainId("137");
    }
  }, [isOpen]);

  // Cleanup polling on close
  useEffect(() => {
    if (!isOpen && pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [isOpen, pollingInterval]);

  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  // Escape to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Lock scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendMax = () => {
    if (rawUsdcBalance) {
      setAmount((Number(rawUsdcBalance) / 10 ** USDC_E_DECIMALS).toString());
    }
  };

  // Direct Polygon transfer (same as before)
  const handleDirectTransfer = async () => {
    if (!relayClient || !depositWalletAddress || !recipient || !amount) return;
    try {
      const amountBigInt = parseUnits(amount, USDC_E_DECIMALS);
      await transferUsdc(relayClient, depositWalletAddress, {
        recipient: recipient as `0x${string}`,
        amount: amountBigInt,
      });
      setShowSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error("Transfer failed:", err);
    }
  };

  // Cross-chain withdraw via Bridge API
  const handleBridgeWithdraw = async () => {
    if (!relayClient || !depositWalletAddress || !recipient || !amount) return;
    setIsBridgeWithdrawing(true);
    setWithdrawError(null);

    try {
      // Step 1: Get withdrawal address from Bridge API
      const res = await fetch("/api/bridge?action=withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: depositWalletAddress,
          toChainId: selectedChainId,
          toTokenAddress: selectedTokenAddr,
          recipientAddr: recipient,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get withdrawal address");
      }

      const data = await res.json();
      const withdrawAddress = data.address?.evm;

      if (!withdrawAddress) {
        throw new Error("No withdrawal address returned");
      }

      // Step 2: Send USDC.e to the withdrawal address on Polygon
      const amountBigInt = parseUnits(amount, USDC_E_DECIMALS);
      await transferUsdc(relayClient, depositWalletAddress!, {
        recipient: withdrawAddress as `0x${string}`,
        amount: amountBigInt,
      });

      // Step 3: Poll status
      const pollStatus = async () => {
        try {
          const statusRes = await fetch(
            `/api/bridge?action=status&address=${withdrawAddress}`
          );
          if (!statusRes.ok) return;
          const statusData = await statusRes.json();
          const txs: DepositTransaction[] = statusData.transactions ?? [];
          setBridgeTxs(txs);

          const allTerminal =
            txs.length > 0 &&
            txs.every((tx) => tx.status === "COMPLETED" || tx.status === "FAILED");
          if (allTerminal) {
            if (pollingInterval) clearInterval(pollingInterval);
            setPollingInterval(null);
            const allComplete = txs.every((tx) => tx.status === "COMPLETED");
            if (allComplete) {
              setShowSuccess(true);
              setTimeout(() => onClose(), 3000);
            }
          }
        } catch {
          // Retry next interval
        }
      };

      pollStatus();
      const interval = setInterval(pollStatus, 15000);
      setPollingInterval(interval);
    } catch (err: any) {
      setWithdrawError(err.message);
    } finally {
      setIsBridgeWithdrawing(false);
    }
  };

  const handleTransfer = isPolygonDirect ? handleDirectTransfer : handleBridgeWithdraw;
  const isBusy = isTransferring || isBridgeWithdrawing;
  const error = transferError || (withdrawError ? new Error(withdrawError) : null);

  const selectedToken = tokensForChain.find((t) => t.token.address === selectedTokenAddr);

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-white/10 shadow-2xl animate-modal-fade-in max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold">Withdraw</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Success */}
          {showSuccess && (
            <div className={cn("mb-4", SUCCESS_STYLES)}>
              <p className="text-green-300 font-medium text-sm">
                {isPolygonDirect ? "Transfer successful!" : "Withdrawal successful! Funds are being bridged."}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-500/20 border border-red-500/40 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error.message}</p>
            </div>
          )}

          {/* Balance */}
          <div className="mb-4 bg-white/5 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Available Balance</p>
            <p className="text-lg font-bold font-data">${formattedUsdcBalance} USDC.e</p>
          </div>

          {/* Destination chain dropdown */}
          {assetsLoading ? (
            <div className="flex items-center justify-center py-4 mb-4">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <SelectDropdown
                label="Destination Chain"
                value={selectedChainId}
                onChange={setSelectedChainId}
                options={chainOptions}
              />

              {/* Token dropdown (only for non-Polygon or multi-token chains) */}
              {!isPolygonDirect && tokenOptions.length > 1 && (
                <SelectDropdown
                  label="Receive as"
                  value={selectedTokenAddr}
                  onChange={setSelectedTokenAddr}
                  options={tokenOptions}
                />
              )}
            </>
          )}

          {/* Recipient */}
          <div className="mb-4">
            <label className="block text-xs text-white/40 mb-1.5 font-medium">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white font-mono text-sm"
              disabled={isBusy}
            />
          </div>

          {/* Amount */}
          <div className="mb-5">
            <label className="block text-xs text-white/40 mb-1.5 font-medium">
              Amount (USDC.e)
            </label>
            <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 pr-16 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                disabled={isBusy}
              />
              <button
                type="button"
                onClick={handleSendMax}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Cross-chain info */}
          {!isPolygonDirect && (
            <div className="mb-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-[11px] text-blue-300/80 leading-relaxed">
                USDC.e will be sent to the Polymarket bridge, which will convert and
                deliver {selectedToken?.token.symbol || "tokens"} to your address on{" "}
                {CHAIN_META[selectedChainId]?.label || "the destination chain"}.
                This usually takes 1-5 minutes.
              </p>
            </div>
          )}

          {/* Send button */}
          <button
            onClick={handleTransfer}
            disabled={isBusy || !recipient || !amount || !relayClient}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            {isBusy
              ? isPolygonDirect
                ? "Sending..."
                : "Withdrawing..."
              : isPolygonDirect
              ? "Send USDC.e"
              : `Withdraw to ${CHAIN_META[selectedChainId]?.label || "Chain"}`}
          </button>

          {!relayClient && (
            <p className="text-xs text-yellow-400 mt-2 text-center">
              Start a trading session first
            </p>
          )}

          {/* Bridge transaction status */}
          {bridgeTxs.length > 0 && (
            <div className="mt-4 space-y-2">
              {bridgeTxs.map((tx, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between bg-white/5 rounded-lg p-3 border ${
                    tx.status === "COMPLETED"
                      ? "border-green-500/20"
                      : tx.status === "FAILED"
                      ? "border-red-500/20"
                      : "border-white/8"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {tx.status !== "COMPLETED" && tx.status !== "FAILED" && (
                      <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                    )}
                    {tx.status === "COMPLETED" && (
                      <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center text-[8px] text-white">
                        ✓
                      </div>
                    )}
                    {tx.status === "FAILED" && (
                      <div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center text-[8px] text-white">
                        ✕
                      </div>
                    )}
                    <span className="text-xs text-white/60">Bridge</span>
                  </div>
                  <span className={`text-xs font-medium ${statusColor(tx.status)}`}>
                    {statusLabel(tx.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
