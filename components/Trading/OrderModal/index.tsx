"use client";

import useClobOrder from "@/hooks/useClobOrder";
import useTickSize from "@/hooks/useTickSize";
import { useState, useEffect, useRef } from "react";
import { useWallet } from "@/providers/WalletContext";

import Portal from "@/components/Portal";
import OrderForm from "@/components/Trading/OrderModal/OrderForm";
import OrderSummary from "@/components/Trading/OrderModal/OrderSummary";
import OrderTypeToggle from "@/components/Trading/OrderModal/OrderTypeToggle";

import { cn } from "@/utils/classNames";
import { SUCCESS_STYLES } from "@/constants/ui";
import { MIN_ORDER_SIZE } from "@/constants/validation";
import type { ClobClient } from "@polymarket/clob-client-v2";
import { isValidSize } from "@/utils/validation";

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
  // Allow small floating point tolerance
  return Math.abs(price - expectedPrice) < 1e-10;
}

type OrderPlacementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  marketTitle: string;
  outcome: string;
  currentPrice: number;
  tokenId: string;
  negRisk?: boolean;
  clobClient: ClobClient | null;
  onInitTradingCredentials: () => Promise<void>;
  isSessionInitializing: boolean;
};

export default function OrderPlacementModal({
  isOpen,
  onClose,
  marketTitle,
  outcome,
  currentPrice,
  tokenId,
  negRisk = false,
  clobClient,
  onInitTradingCredentials,
  isSessionInitializing,
}: OrderPlacementModalProps) {
  const [size, setSize] = useState<string>("");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const { eoaAddress } = useWallet();

  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch tick size dynamically for this market
  const { tickSize, isLoading: isLoadingTickSize } = useTickSize(
    isOpen ? tokenId : null
  );
  const decimalPlaces = getDecimalPlaces(tickSize);

  const {
    submitOrder,
    isSubmitting,
    error: orderError,
    orderId,
  } = useClobOrder(clobClient, eoaAddress);

  useEffect(() => {
    if (isOpen) {
      setSize("");
      setOrderType("market");
      setLimitPrice("");
      setLocalError(null);
      setShowSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (orderId && isOpen) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [orderId, isOpen, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
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

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeNum = parseFloat(size) || 0;
  const limitPriceNum = parseFloat(limitPrice) || 0;
  const effectivePrice = orderType === "limit" ? limitPriceNum : currentPrice;

  const handlePlaceOrder = async () => {
    if (!isValidSize(sizeNum)) {
      setLocalError(`Size must be greater than ${MIN_ORDER_SIZE}`);
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

    // If trading credentials aren't ready, init phase 2 now (signatures happen here)
    if (!clobClient) {
      try {
        await onInitTradingCredentials();
      } catch (err) {
        console.error("Trading credentials init failed:", err);
        return;
      }
      // clobClient will be set after credentials complete — user needs to click again
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
    } catch (err) {
      console.error("Error placing order:", err);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onClick={handleBackdropClick}
      >
        <div
          ref={modalRef}
          className="glass p-6 max-w-sm w-full shadow-2xl shadow-black/50 animate-modal-fade-in"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex-1">
              <h3 className="text-base font-semibold mb-1 text-white">{marketTitle}</h3>
              <p className="text-xs text-purple-400/80">Buying: {outcome}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/20 hover:text-white/60 transition-colors text-lg leading-none"
            >
              &times;
            </button>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className={cn("mb-4", SUCCESS_STYLES)}>
              <p className="text-green-400 font-medium text-sm">
                Order placed!
              </p>
            </div>
          )}

          {/* Error Message */}
          {(localError || orderError) && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-red-400 text-xs">
                {localError || orderError?.message}
              </p>
            </div>
          )}

          {/* Order Type Toggle */}
          <OrderTypeToggle
            orderType={orderType}
            onChangeOrderType={(type) => {
              setOrderType(type);
              setLocalError(null);
            }}
          />

          {/* Order Form */}
          <OrderForm
            size={size}
            onSizeChange={(value) => {
              setSize(value);
              setLocalError(null);
            }}
            limitPrice={limitPrice}
            onLimitPriceChange={(value) => {
              setLimitPrice(value);
              setLocalError(null);
            }}
            orderType={orderType}
            currentPrice={currentPrice}
            isSubmitting={isSubmitting}
            tickSize={tickSize}
            decimalPlaces={decimalPlaces}
            isLoadingTickSize={isLoadingTickSize}
          />

          {/* Order Summary */}
          <OrderSummary size={sizeNum} price={effectivePrice} />

          {/* Place Order Button */}
          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting || isSessionInitializing || sizeNum <= 0}
            className="w-full py-3 bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 hover:border-green-500/30 disabled:bg-white/3 disabled:border-white/6 disabled:text-white/20 disabled:cursor-not-allowed text-green-400 font-semibold text-sm rounded-xl transition-all cursor-pointer"
          >
            {isSubmitting
              ? "Placing Order..."
              : isSessionInitializing
                ? "Setting up..."
                : !clobClient
                  ? "Place Order"
                  : "Place Order"}
          </button>
        </div>
      </div>
    </Portal>
  );
}
