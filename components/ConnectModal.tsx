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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="glass p-6 w-full max-w-85 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Connect</h2>
          <button
            onClick={onClose}
            className="text-white/20 hover:text-white/60 transition-colors text-lg leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleMagic}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white/3 hover:bg-white/6 border border-white/6 hover:border-white/10 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 text-sm font-bold shrink-0">
              @
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                Email
              </div>
              <div className="text-[11px] text-white/20">Magic Link</div>
            </div>
          </button>

          <button
            onClick={handleWalletConnect}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white/3 hover:bg-white/6 border border-white/6 hover:border-white/10 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-sm font-bold shrink-0">
              W
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                WalletConnect
              </div>
              <div className="text-[11px] text-white/20">MetaMask, Rainbow, etc.</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
