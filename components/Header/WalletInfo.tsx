import { useWallet } from "@/providers/WalletContext";
import useAddressCopy from "@/hooks/useAddressCopy";
import useSafeDeployment from "@/hooks/useSafeDeployment";
import { formatAddress } from "@/utils/formatting";

export default function WalletInfo({
  onDisconnect,
}: {
  onDisconnect: () => void;
}) {
  const { eoaAddress } = useWallet();
  const { derivedSafeAddressFromEoa } = useSafeDeployment(eoaAddress);
  const { copied: copiedSafe, copyAddress: copySafeAddress } = useAddressCopy(
    derivedSafeAddressFromEoa || null
  );

  return (
    <div className="flex items-center gap-2">
      {/* Safe address pill */}
      {derivedSafeAddressFromEoa && (
        <button
          onClick={copySafeAddress}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/8 border border-white/6 transition-all cursor-pointer group"
        >
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-data text-white/50 group-hover:text-white/80 transition-colors">
            {copiedSafe ? "Copied!" : formatAddress(derivedSafeAddressFromEoa)}
          </span>
        </button>
      )}

      {/* Disconnect */}
      <button
        onClick={onDisconnect}
        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
      >
        Disconnect
      </button>
    </div>
  );
}
