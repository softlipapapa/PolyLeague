"use client";

import { useWallet } from "@/providers/WalletContext";

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConnectModal({ isOpen, onClose }: ConnectModalProps) {
  const { connectMagic, connectWalletConnect } = useWallet();

  if (!isOpen) return null;

  const handleMagic = async () => {
    await connectMagic();
    onClose();
  };

  const handleWalletConnect = async () => {
    await connectWalletConnect();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 transition-colors text-xl leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleMagic}
            className="flex items-center gap-3 w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl px-4 py-4 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-300 text-lg shrink-0">
              @
            </div>
            <div className="text-left">
              <div className="text-white font-medium group-hover:text-purple-200 transition-colors">
                Email Login
              </div>
              <div className="text-white/40 text-sm">
                Sign in with Magic Link
              </div>
            </div>
          </button>

          <button
            onClick={handleWalletConnect}
            className="flex items-center gap-3 w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl px-4 py-4 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-300 text-lg shrink-0">
              W
            </div>
            <div className="text-left">
              <div className="text-white font-medium group-hover:text-blue-200 transition-colors">
                WalletConnect
              </div>
              <div className="text-white/40 text-sm">
                MetaMask, Rainbow, etc.
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
