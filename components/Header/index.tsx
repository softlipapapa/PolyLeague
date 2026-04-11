"use client";

import { useState, useEffect } from "react";
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
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white text-sm">
          PL
        </div>
        <span className="text-xl font-bold tracking-tight bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          PolyLeague
        </span>
      </div>

      <div>
        {eoaAddress ? (
          <WalletInfo onDisconnect={handleDisconnect} />
        ) : (
          <button
            className="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg px-5 py-2.5 cursor-pointer transition-all font-semibold text-sm select-none shadow-lg shadow-purple-600/20"
            onClick={() => setShowModal(true)}
          >
            Connect Wallet
          </button>
        )}
      </div>

      <ConnectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
