"use client";

import { useState, useEffect } from "react";

export default function MobileBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (window.innerWidth < 768 && !sessionStorage.getItem("mobile-banner-dismissed")) {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("mobile-banner-dismissed", "1");
  };

  return (
    <div className="md:hidden flex items-center gap-2 px-3 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
      <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <p className="flex-1 text-[11px] text-purple-200/80">
        For the best experience, use a desktop browser.
      </p>
      <button onClick={handleDismiss} className="p-1 rounded hover:bg-white/5 shrink-0">
        <svg className="w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
