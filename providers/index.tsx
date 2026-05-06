"use client";

import { ReactNode } from "react";
import WagmiProvider from "./WagmiProvider";
import QueryProvider from "./QueryProvider";
import { WalletProvider } from "./WalletProvider";
import TradingProvider from "./TradingProvider";
import ToastProvider from "./ToastProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider>
      <QueryProvider>
        <ToastProvider>
          <WalletProvider>
            <TradingProvider>{children}</TradingProvider>
          </WalletProvider>
        </ToastProvider>
      </QueryProvider>
    </WagmiProvider>
  );
}
