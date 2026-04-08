import { createContext, useContext } from "react";
import { Magic as MagicBase } from "magic-sdk";
import { PublicClient, WalletClient } from "viem";
import { providers } from "ethers";

export type WalletType = "magic" | "walletconnect" | null;

export interface WalletContextType {
  magic: MagicBase | null;
  eoaAddress: `0x${string}` | undefined;
  walletClient: WalletClient | null;
  ethersSigner: providers.JsonRpcSigner | null;
  publicClient: PublicClient | null;
  connectMagic: () => Promise<void>;
  connectWalletConnect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
  walletType: WalletType;
}

export const WalletContext = createContext<WalletContextType>({
  magic: null,
  eoaAddress: undefined,
  walletClient: null,
  ethersSigner: null,
  publicClient: null,
  connectMagic: async () => {},
  connectWalletConnect: async () => {},
  disconnect: async () => {},
  isConnected: false,
  walletType: null,
});

export function useWallet(): WalletContextType {
  return useContext(WalletContext);
}
