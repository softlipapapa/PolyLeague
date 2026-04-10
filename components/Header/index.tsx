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
      <div className="text-lg font-semibold text-white">PolyLeague</div>

      <div>
        {eoaAddress ? (
          <WalletInfo onDisconnect={handleDisconnect} />
        ) : (
          <button
            className="bg-white/10 backdrop-blur-md rounded-lg px-6 py-3 hover:bg-white/20 cursor-pointer transition-colors font-semibold select-none"
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
