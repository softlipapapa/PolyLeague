"use client";

import { ReactNode } from "react";
import { wagmiAdapter, WALLETCONNECT_PROJECT_ID } from "@/lib/wagmi";
import { polygon } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { WagmiProvider as WagmiProviderBase } from "wagmi";

// Initialize the AppKit modal (runs once on import)
createAppKit({
  adapters: [wagmiAdapter],
  projectId: WALLETCONNECT_PROJECT_ID,
  networks: [polygon],
  metadata: {
    name: "RiftMarket",
    description: "LoL Esports Prediction Platform on Polymarket",
    url: "https://riftmarket.xyz",
    icons: [],
  },
  themeMode: "dark",
});

// Note: Wagmi requires a QueryClientProvider ancestor.
// We rely on the existing QueryProvider in the provider tree.
export default function WagmiProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProviderBase config={wagmiAdapter.wagmiConfig}>
      {children}
    </WagmiProviderBase>
  );
}
