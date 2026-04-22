"use client";

import { useState } from "react";

import ActiveOrders from "@/components/Trading/Orders";
import UserPositions from "@/components/Trading/Positions";
import LoLMarkets from "@/components/LoL/LoLMarkets";

import { cn } from "@/utils/classNames";

type TabId = "upcoming" | "live" | "settling" | "resolved" | "positions" | "orders";

interface Tab {
  id: TabId;
  label: string;
}

const tabs: Tab[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "live", label: "Live" },
  { id: "settling", label: "Settling" },
  { id: "resolved", label: "Results" },
  { id: "positions", label: "Positions" },
  { id: "orders", label: "Orders" },
];

export default function MarketTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("upcoming");

  return (
    <div className="space-y-5">
      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-white/6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-all relative",
              activeTab === tab.id
                ? "text-white"
                : "text-white/30 hover:text-white/60"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-purple-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "upcoming" && <LoLMarkets status="upcoming" />}
        {activeTab === "live" && <LoLMarkets status="live" />}
        {activeTab === "settling" && <LoLMarkets status="settling" />}
        {activeTab === "resolved" && <LoLMarkets status="resolved" />}
        {activeTab === "positions" && <UserPositions />}
        {activeTab === "orders" && <ActiveOrders />}
      </div>
    </div>
  );
}
