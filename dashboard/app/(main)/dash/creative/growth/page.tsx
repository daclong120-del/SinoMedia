"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { mockCreativeAds, mockCreativeAdvertisers } from "@/lib/mock-data";
import CreativeCard from "@/components/dashboard/CreativeCard";
import DropdownSelect from "@/components/dashboard/DropdownSelect";
import { cn } from "@/lib/utils";
import type { Platform } from "@/types";

function GrowthPageContent() {
  const [comparisonPeriod, setComparisonPeriod] = useState("7d_vs_7d");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [sortBy, setSortBy] = useState("growth_pct_desc");

  const filtered = mockCreativeAds.filter((ad) => {
    const matchesPlatform = selectedPlatform === "all" || ad.platform === selectedPlatform;
    return matchesPlatform && ad.growth_rate > 0;
  });

  // Sort by growth rate descending or absolute growth
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "growth_pct_desc") {
      return b.growth_rate - a.growth_rate;
    } else {
      // absolute growth mock: view_count * (growth_rate / 100)
      const absA = a.view_count * (a.growth_rate / 100);
      const absB = b.view_count * (b.growth_rate / 100);
      return absB - absA;
    }
  });

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-bold text-foreground">BXH Creative — Tăng trưởng nhanh</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Xác định nhanh các ad creative đang lan truyền mạnh mẽ nhất trong thời gian ngắn</p>
      </div>

      {/* Select Bars and Filtering Controls */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Comparison period select */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Kỳ so sánh</span>
            <DropdownSelect
              value={comparisonPeriod}
              onChange={setComparisonPeriod}
              options={[
                { value: "7d_vs_7d", label: "7 ngày gần nhất" },
                { value: "30d_vs_30d", label: "30 ngày gần nhất" },
              ]}
              fullWidth
            />
          </div>

          {/* Sort selection */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Sắp xếp theo</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy("growth_pct_desc")}
                className={cn(
                  "flex-1 h-8 rounded-lg text-xs font-semibold border transition-all",
                  sortBy === "growth_pct_desc"
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "bg-background border-border text-foreground hover:bg-muted"
                )}
              >
                Tăng trưởng % cao nhất
              </button>
              <button
                onClick={() => setSortBy("growth_abs_desc")}
                className={cn(
                  "flex-1 h-8 rounded-lg text-xs font-semibold border transition-all",
                  sortBy === "growth_abs_desc"
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "bg-background border-border text-foreground hover:bg-muted"
                )}
              >
                Tăng trưởng tuyệt đối
              </button>
            </div>
          </div>
        </div>

        {/* Platform chips */}
        <div className="space-y-1.5 pt-2 border-t border-border/55">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Nền tảng</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedPlatform("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                selectedPlatform === "all"
                  ? "bg-foreground border-foreground text-background"
                  : "bg-background border-border text-foreground hover:bg-muted"
              )}
            >
              Tất cả
            </button>
            {["douyin", "kuaishou", "xhs", "bilibili", "weibo", "zhihu", "tieba", "tiktok"].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPlatform(p)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize",
                  selectedPlatform === p
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background border-border text-foreground hover:bg-muted"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid creative results */}
      {sorted.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sorted.map((ad) => {
            const adv = mockCreativeAdvertisers.find((a) => a.id === ad.author_id);
            return (
              <CreativeCard
                key={ad.id}
                creative={ad}
                advertiserName={adv ? adv.nickname : "Không rõ"}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center max-w-md mx-auto space-y-3">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <svg className="size-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-foreground">Chưa có dữ liệu tăng trưởng</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cần ít nhất 2 kỳ dữ liệu để tính toán tăng trưởng. Tiếp tục chạy crawler để thu thập thêm dữ liệu so sánh.
          </p>
        </div>
      )}
    </div>
  );
}

export default function GrowthPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Đang tải bảng xếp hạng tăng trưởng...</div>}>
      <GrowthPageContent />
    </Suspense>
  );
}
