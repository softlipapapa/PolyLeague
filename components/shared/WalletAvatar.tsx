"use client";

import { useState } from "react";

// Generate a deterministic color from a wallet address
function walletToColor(address: string): string {
  const colors = [
    "bg-purple-500/30",
    "bg-blue-500/30",
    "bg-cyan-500/30",
    "bg-green-500/30",
    "bg-amber-500/30",
    "bg-orange-500/30",
    "bg-red-500/30",
    "bg-pink-500/30",
    "bg-indigo-500/30",
    "bg-teal-500/30",
  ];
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string, address: string): string {
  if (name && name.length > 0) {
    return name.slice(0, 2).toUpperCase();
  }
  // Use last 2 chars of address
  return address.slice(-2).toUpperCase();
}

interface WalletAvatarProps {
  address: string;
  name?: string;
  imageUrl?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const SIZES = {
  xs: "w-5 h-5 text-[8px]",
  sm: "w-8 h-8 text-[10px]",
  md: "w-10 h-10 text-xs",
};

export default function WalletAvatar({
  address,
  name,
  imageUrl,
  size = "sm",
  className = "",
}: WalletAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZES[size];

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={`${sizeClass} rounded-full shrink-0 object-cover ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  const bgColor = walletToColor(address);
  const initials = getInitials(name || "", address);

  return (
    <div
      className={`${sizeClass} rounded-full shrink-0 ${bgColor} flex items-center justify-center ${className}`}
    >
      <span className="font-bold text-white/70">{initials}</span>
    </div>
  );
}
