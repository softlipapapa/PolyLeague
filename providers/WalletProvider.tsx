"use client";

import { ReactNode, useEffect, useMemo, useState, useCallback } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  WalletClient,
} from "viem";
import { useAccount, useDisconnect, useConnectorClient } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import getMagic from "@/lib/magic";
import { providers } from "ethers";
import { polygon } from "viem/chains";
import { WalletContext, WalletContextType, WalletType } from "./WalletContext";
import { POLYGON_RPC_URL } from "@/constants/polymarket";

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(POLYGON_RPC_URL),
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [ethersSigner, setEthersSigner] =
    useState<providers.JsonRpcSigner | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [eoaAddress, setEoaAddress] = useState<`0x${string}` | undefined>(
    undefined
  );
  const [walletType, setWalletType] = useState<WalletType>(null);

  // Wagmi hooks for WalletConnect
  const {
    address: wagmiAddress,
    isConnected: wagmiConnected,
  } = useAccount();
  const { disconnectAsync: wagmiDisconnect } = useDisconnect();
  const { open: openAppKit } = useAppKit();
  const { data: connectorClient } = useConnectorClient();

  // ── Helper functions (declared before useEffect) ──
  const setupMagicClients = useCallback(() => {
    const magic = getMagic();
    if (!magic) return;

    const rpc = magic.rpcProvider as unknown;
    const client = createWalletClient({
      chain: polygon,
      transport: custom(rpc as Parameters<typeof custom>[0]),
    });
    const ethersProvider = new providers.Web3Provider(
      rpc as providers.ExternalProvider
    );

    setWalletClient(client);
    setEthersSigner(ethersProvider.getSigner());
  }, []);

  const fetchMagicUser = useCallback(async () => {
    const magic = getMagic();
    if (!magic) return;
    const userInfo = await magic.user.getInfo();
    const address = (
      userInfo as { wallets?: { ethereum?: { publicAddress?: string } } }
    ).wallets?.ethereum?.publicAddress;
    setEoaAddress(address ? (address as `0x${string}`) : undefined);
  }, []);

  // ── Magic Link: check existing session on mount ──
  useEffect(() => {
    if (walletType && walletType !== "magic") return;

    const magic = getMagic();
    if (!magic) return;

    magic.user.isLoggedIn().then((isLoggedIn) => {
      if (isLoggedIn) {
        setWalletType("magic");
        setupMagicClients();
        fetchMagicUser();
      }
    });
  }, [walletType, setupMagicClients, fetchMagicUser]);

  // ── WalletConnect: restore session on page refresh ──
  useEffect(() => {
    if (walletType) return;
    if (wagmiConnected && wagmiAddress) {
      setWalletType("walletconnect");
    }
  }, [wagmiConnected, wagmiAddress, walletType]);

  // ── WalletConnect: sync wagmi state when connected ──
  useEffect(() => {
    if (walletType !== "walletconnect") return;
    if (!wagmiConnected || !wagmiAddress || !connectorClient) return;

    setEoaAddress(wagmiAddress);

    const viemClient = createWalletClient({
      chain: polygon,
      transport: custom(connectorClient.transport),
    });
    const ethersProvider = new providers.Web3Provider(
      connectorClient.transport as unknown as providers.ExternalProvider
    );

    setWalletClient(viemClient);
    setEthersSigner(ethersProvider.getSigner());
  }, [wagmiConnected, wagmiAddress, connectorClient, walletType]);

  // ── Connect methods ──
  const connectMagic = useCallback(async () => {
    const magic = getMagic();
    if (!magic) return;
    try {
      await magic.wallet.connectWithUI();
      setWalletType("magic");
      setupMagicClients();
      await fetchMagicUser();
    } catch (error) {
      console.error("Magic connect error:", error);
    }
  }, [setupMagicClients, fetchMagicUser]);

  const connectWalletConnect = useCallback(async () => {
    try {
      setWalletType("walletconnect");
      await openAppKit();
    } catch (error) {
      console.error("WalletConnect error:", error);
    }
  }, [openAppKit]);

  // ── Disconnect ──
  const disconnect = useCallback(async () => {
    try {
      if (walletType === "magic") {
        const magic = getMagic();
        if (magic) await magic.user.logout();
      } else if (walletType === "walletconnect") {
        await wagmiDisconnect();
      }

      setEoaAddress(undefined);
      setWalletClient(null);
      setEthersSigner(null);
      setWalletType(null);
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  }, [walletType, wagmiDisconnect]);

  const value = useMemo<WalletContextType>(
    () => ({
      magic: getMagic(),
      eoaAddress,
      walletClient,
      ethersSigner,
      publicClient,
      connectMagic,
      connectWalletConnect,
      disconnect,
      isConnected: !!eoaAddress,
      walletType,
    }),
    [
      eoaAddress,
      walletClient,
      ethersSigner,
      connectMagic,
      connectWalletConnect,
      disconnect,
      walletType,
    ]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
