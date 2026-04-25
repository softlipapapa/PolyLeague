"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/providers/WalletContext";
import WalletInfo from "@/components/Header/WalletInfo";
import ConnectModal from "@/components/ConnectModal";

export default function Header({
  onEndSession,
}: {
  onEndSession?: () => void;
}) {
  const { eoaAddress, disconnect } = useWallet();
  const [showModal, setShowModal] = useState(false);

  // Allow other components to open the connect modal via custom event
  useEffect(() => {
    const handler = () => setShowModal(true);
    window.addEventListener("open-connect-modal", handler);
    return () => window.removeEventListener("open-connect-modal", handler);
  }, []);

  const handleDisconnect = async () => {
    try {
      onEndSession?.();
      await disconnect();
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  };

  return (
    <header className="flex items-center justify-between w-full py-2">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="RiftMarket" className="h-[60px] w-[60px] rounded-lg" />
          <span className="text-lg font-bold tracking-tight text-white">
            Rift<span className="text-blue-400">Market</span>
          </span>
        </Link>
        <Link
          href="/leaderboard"
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 border border-white/8 hover:border-white/15 transition-all"
        >
          Leaderboard
        </Link>
      </div>

      <div>
        {eoaAddress ? (
          <WalletInfo onDisconnect={handleDisconnect} />
        ) : (
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 text-white/80 hover:text-white transition-all cursor-pointer"
            onClick={() => setShowModal(true)}
          >
            Connect
          </button>
        )}
      </div>

      <ConnectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </header>
  );
}
