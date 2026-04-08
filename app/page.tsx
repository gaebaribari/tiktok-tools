"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import LookupTab from "@/components/LookupTab";
import DownloadTab from "@/components/DownloadTab";

const TABS = [
  { id: "lookup", label: "크리에이터 조회", icon: "🔍" },
  { id: "download", label: "영상 다운로드", icon: "⬇" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("lookup");
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="max-w-[960px] mx-auto px-5 py-10">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="TikTok" width={36} height={36} />
          <h1 className="text-[24px] font-bold text-foreground">
            TikTok Tools
          </h1>
        </div>
        <p className="text-sm text-muted mt-1">틱톡 크리에이터 조회, 영상 다운로드</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-6 py-2.5 text-[15px] font-semibold transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? "text-accent border-accent"
                : "text-muted border-transparent hover:text-accent"
            }`}
          >
            <span className="text-sm leading-none">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "lookup" && <LookupTab />}
      {activeTab === "download" && <DownloadTab />}

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 w-11 h-11 rounded-full bg-accent text-white shadow-lg flex items-center justify-center hover:bg-accent-hover transition-all z-50"
        >
          ↑
        </button>
      )}
    </main>
  );
}
