"use client";

import { useState, useEffect, useCallback } from "react";
import useClobOrder from "@/hooks/useClobOrder";
import useTickSize from "@/hooks/useTickSize";
import usePolygonBalances from "@/hooks/usePolygonBalances";
import useConvertToPusd from "@/hooks/useConvertToPusd";
import { useWallet } from "@/providers/WalletContext";
import { useTrading } from "@/providers/TradingProvider";

import OrderForm from "@/components/Trading/OrderModal/OrderForm";
import OrderSummary from "@/components/Trading/OrderModal/OrderSummary";
import OrderTypeToggle from "@/components/Trading/OrderModal/OrderTypeToggle";

import { cn } from "@/utils/classNames";
import { SUCCESS_STYLES } from "@/constants/ui";
import { MIN_ORDER_SIZE, MIN_ORDER_DOLLAR } from "@/constants/validation";
import { isValidSize } from "@/utils/validation";
import { useToast } from "@/providers/ToastProvider";

function getDecimalPlaces(tickSize: number): number {
  if (tickSize >= 1) return 0;
  const str = tickSize.toString();
  const decimalPart = str.split(".")[1];
  return decimalPart ? decimalPart.length : 0;
}

function isValidTickPrice(price: number, tickSize: number): boolean {
  if (tickSize <= 0) return false;
  const multiplier = Math.round(price / tickSize);
  const expectedPrice = multiplier * tickSize;
  return Math.abs(price - expectedPrice) < 1e-10;
}

interface OrderPanelProps {
  outcomes: [string, string];
  prices: [number, number];
  tokenIds: [string, string];
  negRisk: boolean;
  selectedTeam: 0 | 1;
  onSelectTeam: (idx: 0 | 1) => void;
}

export default function OrderPanel({
  outcomes,
  prices,
  tokenIds,
  negRisk,
  selectedTeam,
  onSelectTeam,
}: OrderPanelProps) {
  const outcome = outcomes[selectedTeam];
  const currentPrice = prices[selectedTeam];
  const tokenId = tokenIds[selectedTeam];
  const teamColor = selectedTeam === 0 ? "green" : "red";
  const [size, setSize] = useState<string>("");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const { eoaAddress } = useWallet();
  const { clobClient, initTradingCredentials, currentStep, depositWalletAddress } = useTrading();
  const { showToast } = useToast();
  const { pusdBalance, convertibleTokens } = usePolygonBalances(depositWalletAddress, eoaAddress);
  const { convert, isConverting } = useConvertToPusd();

  const isSessionInitializing = currentStep !== "idle" && currentStep !== "complete";

  const { tickSize, isLoading: isLoadingTickSize } = useTickSize(tokenId);
  const decimalPlaces = getDecimalPlaces(tickSize);

  const {
    submitOrder,
    isSubmitting,
    error: orderError,
    orderId,
  } = useClobOrder(clobClient, eoaAddress);

  // Reset form when outcome changes (user clicked different team)
  useEffect(() => {
    setSize("");
    setOrderType("market");
    setLimitPrice("");
    setLocalError(null);
    setShowSuccess(false);
  }, [tokenId]);

  const handleSuccess = useCallback(() => {
    if (orderId) {
      setShowSuccess(true);
      showToast("Order placed successfully!", "success");
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [orderId, showToast]);

  useEffect(() => {
    handleSuccess();
  }, [handleSuccess]);

  const sizeNum = parseFloat(size) || 0;
  const limitPriceNum = parseFloat(limitPrice) || 0;
  const effectivePrice = orderType === "limit" ? limitPriceNum : currentPrice;
  const totalCost = sizeNum * effectivePrice;

  const handlePlaceOrder = async () => {
    if (!isValidSize(sizeNum)) {
      setLocalError(`Size must be greater than ${MIN_ORDER_SIZE}`);
      return;
    }

    if (totalCost < MIN_ORDER_DOLLAR) {
      setLocalError(`Minimum order is $${MIN_ORDER_DOLLAR}. Current total: $${totalCost.toFixed(2)}`);
      return;
    }

    if (orderType === "limit") {
      if (!limitPrice || limitPriceNum <= 0) {
        setLocalError("Limit price is required");
        return;
      }
      if (limitPriceNum < tickSize || limitPriceNum > 1 - tickSize) {
        setLocalError(
          `Price must be between $${tickSize.toFixed(decimalPlaces)} and $${(1 - tickSize).toFixed(decimalPlaces)}`
        );
        return;
      }
      if (!isValidTickPrice(limitPriceNum, tickSize)) {
        setLocalError(`Price must be a multiple of tick size ($${tickSize})`);
        return;
      }
    }

    if (!clobClient) {
      try {
        await initTradingCredentials();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Setup failed";
        if (msg.toLowerCase().includes("geoblock") || msg.toLowerCase().includes("region")) {
          showToast("Trading is not available in your region", "error");
        } else {
          showToast(msg, "error");
        }
        return;
      }
      return;
    }

    try {
      await submitOrder({
        tokenId,
        size: sizeNum,
        price: orderType === "limit" ? limitPriceNum : undefined,
        side: "BUY",
        negRisk,
        isMarketOrder: orderType === "market",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Order failed";
      if (msg.includes("min size")) {
        showToast("Minimum order is $1", "error");
      } else if (msg.includes("insufficient") || msg.includes("balance")) {
        showToast("Insufficient balance. Deposit funds first.", "error");
      } else {
        showToast(msg, "error");
      }
    }
  };

  const accentBorder = teamColor === "green" ? "border-green-500/20" : "border-red-500/20";
  const accentText = teamColor === "green" ? "text-green-400" : "text-red-400";
  const accentBg = teamColor === "green"
    ? "bg-green-500/15 hover:bg-green-500/25 border-green-500/20 hover:border-green-500/30 text-green-400"
    : "bg-red-500/15 hover:bg-red-500/25 border-red-500/20 hover:border-red-500/30 text-red-400";

  return (
    <div className="space-y-3">
      {/* Outcome selector */}
      <div className={`rounded-lg border ${accentBorder} bg-white/3 px-3 py-2`}>
        <p className="text-[11px] text-white/40 mb-1">Buying</p>
        <div className="flex gap-1.5">
          {outcomes.map((name, i) => {
            const isActive = selectedTeam === i;
            const color = i === 0
              ? isActive ? "bg-green-500/15 text-green-400 border-green-500/25" : "text-white/30 border-white/8 hover:text-white/50 hover:border-white/15"
              : isActive ? "bg-red-500/15 text-red-400 border-red-500/25" : "text-white/30 border-white/8 hover:text-white/50 hover:border-white/15";
            return (
              <button
                key={i}
                onClick={() => onSelectTeam(i as 0 | 1)}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer ${color}`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Success */}
      {showSuccess && (
        <div className={cn(SUCCESS_STYLES, "rounded-lg p-2.5")}>
          <p className="text-green-400 font-medium text-xs">Order placed!</p>
        </div>
      )}

      {/* Error */}
      {(localError || orderError) && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
          <p className="text-red-400 text-[11px]">{localError || orderError?.message}</p>
        </div>
      )}

      {/* Order Type */}
      <OrderTypeToggle
        orderType={orderType}
        onChangeOrderType={(type) => { setOrderType(type); setLocalError(null); }}
      />

      {/* Form */}
      <OrderForm
        size={size}
        onSizeChange={(v) => { setSize(v); setLocalError(null); }}
        limitPrice={limitPrice}
        onLimitPriceChange={(v) => { setLimitPrice(v); setLocalError(null); }}
        orderType={orderType}
        currentPrice={currentPrice}
        isSubmitting={isSubmitting}
        tickSize={tickSize}
        decimalPlaces={decimalPlaces}
        isLoadingTickSize={isLoadingTickSize}
      />

      {/* Summary */}
      <OrderSummary size={sizeNum} price={effectivePrice} />

      {/* Available balance */}
      {depositWalletAddress && (
        <div className="rounded-lg border border-white/5 bg-white/3 px-3 py-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/30">Available</span>
            <span className="text-[11px] font-data font-medium text-white/70 tabular-nums">
              ${pusdBalance?.balance.toFixed(2) ?? "0.00"} pUSD
            </span>
          </div>
          {convertibleTokens.length > 0 && (() => {
            const eligible = convertibleTokens.filter((t) => t.balance >= 2);
            const belowMin = convertibleTokens.filter((t) => t.balance < 2);
            return (
            <div className="pt-1 border-t border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-400/60">
                  {convertibleTokens.map((t) => `${t.formatted} ${t.symbol}`).join(", ")}
                </span>
                {eligible.length > 0 ? (
                  <button
                    onClick={async () => {
                      for (const t of eligible) {
                        const ok = await convert(t);
                        if (ok) {
                          showToast(`Converting ${t.formatted} ${t.symbol} → pUSD`, "success");
                        } else {
                          showToast(`Failed to convert ${t.symbol}`, "error");
                          break;
                        }
                      }
                    }}
                    disabled={isConverting}
                    className="text-[10px] font-medium text-purple-400/80 hover:text-purple-300 transition-colors disabled:opacity-50"
                  >
                    {isConverting ? "Converting..." : "Convert →"}
                  </button>
                ) : (
                  <span className="text-[10px] text-white/20">Min $2 to convert</span>
                )}
              </div>
              {belowMin.length > 0 && eligible.length > 0 && (
                <p className="text-[10px] text-white/20">
                  {belowMin.map((t) => `${t.symbol}`).join(", ")} below $2 min
                </p>
              )}
            </div>
            );
          })()}
        </div>
      )}

      {/* Min order hint */}
      {sizeNum > 0 && totalCost < MIN_ORDER_DOLLAR && (
        <p className="text-[11px] text-amber-400/60 text-center">
          Min order $1 — need {Math.ceil(MIN_ORDER_DOLLAR / effectivePrice)} shares at {Math.round(effectivePrice * 100)}¢
        </p>
      )}

      {/* Place Order */}
      <button
        onClick={handlePlaceOrder}
        disabled={isSubmitting || isSessionInitializing || sizeNum <= 0}
        className={`w-full py-2.5 border font-semibold text-sm rounded-xl transition-all cursor-pointer
          disabled:bg-white/3 disabled:border-white/6 disabled:text-white/20 disabled:cursor-not-allowed
          ${accentBg}`}
      >
        {isSubmitting
          ? "Placing Order..."
          : isSessionInitializing
            ? "Setting up..."
            : "Place Order"}
      </button>
    </div>
  );
}
