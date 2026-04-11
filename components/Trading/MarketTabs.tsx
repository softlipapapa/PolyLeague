"use client";

import { useState } from "react";

import Card from "@/components/shared/Card";
import ActiveOrders from "@/components/Trading/Orders";
import UserPositions from "@/components/Trading/Positions";
import LoLMarkets from "@/components/LoL/LoLMarkets";

import { cn } from "@/utils/classNames";

type TabId = "live" | "upcoming" | "positions" | "orders";

interface Tab {
  id: TabId;
  label: string;
}

const tabs: Tab[] = [
  { id: "live", label: "Live" },
  { id: "upcoming", label: "Upcoming" },
  { id: "positions", label: "My Positions" },
  { id: "orders", label: "Open Orders" },
];

export default function MarketTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("live");

  return (
    <div className="space-y-5">
      {/* Tab Navigation */}
      <div className="bg-white/3 backdrop-blur-md rounded-xl border border-white/6 p-1 flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200",
              activeTab === tab.id
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "live" && <LoLMarkets status="live" />}
        {activeTab === "upcoming" && <LoLMarkets status="upcoming" />}
        {activeTab === "positions" && <UserPositions />}
        {activeTab === "orders" && <ActiveOrders />}
      </div>
    </div>
  );
}
