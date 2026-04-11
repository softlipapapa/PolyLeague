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
        className="bg-[#12121e] border border-white/8 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors text-xl leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleMagic}
            className="flex items-center gap-3 w-full bg-white/3 hover:bg-purple-500/10 border border-white/6 hover:border-purple-500/25 rounded-xl px-4 py-3.5 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-300 text-lg shrink-0">
              @
            </div>
            <div className="text-left">
              <div className="text-white font-medium text-sm group-hover:text-purple-200 transition-colors">
                Email Login
              </div>
              <div className="text-white/30 text-xs">
                Sign in with Magic Link
              </div>
            </div>
          </button>

          <button
            onClick={handleWalletConnect}
            className="flex items-center gap-3 w-full bg-white/3 hover:bg-blue-500/10 border border-white/6 hover:border-blue-500/25 rounded-xl px-4 py-3.5 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-300 text-lg shrink-0">
              W
            </div>
            <div className="text-left">
              <div className="text-white font-medium text-sm group-hover:text-blue-200 transition-colors">
                WalletConnect
              </div>
              <div className="text-white/30 text-xs">
                MetaMask, Rainbow, etc.
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
