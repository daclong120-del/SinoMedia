"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
// Data được fetch qua /api/creative/growth (API Route)
import CreativeCard from "@/components/dashboard/CreativeCard";
import DropdownSelect from "@/components/dashboard/DropdownSelect";
import CreativeDetailView from "@/components/dashboard/CreativeDetailView";
import { cn } from "@/lib/utils";
import type { Platform } from "@/types";

function GrowthPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewId = searchParams.get("viewId") || "";

  const handleCardClick = (id: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("viewId", id);
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  };

  const handleCloseModal = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("viewId");
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  };

  const handleNavigateModal = (targetId: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("viewId", targetId);
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  };

  const [comparisonPeriod, setComparisonPeriod] = useState("7d_vs_7d");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [sortBy, setSortBy] = useState("growth_pct_desc");

  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedPlatform !== "all") {
          params.set("platform", selectedPlatform);
        }
        const res = await fetch(`/api/creative/growth?${params.toString()}`);
        if (!res.ok) throw new Error("Fetch failed");
        const json = await res.json();
        
        let data = json.data.map((row: any) => {
          const views = parseInt(row.stats?.play_count || row.stats?.view_count || "0", 10);
          const likes = parseInt(row.stats?.like_count || "0", 10);
          
          return {
            id: row.id,
            platform: row.platform,
            author_id: row.author_id || "",
            platform_uid: row.platform_uid || "",
            title: row.caption ? row.caption.slice(0, 30) : "",
            caption: row.caption || "",
            cover_url: row.cover_url || "",
            media_type: row.cover_url ? "video" : "image",
            like_count: likes,
            view_count: views,
            comment_count: parseInt(row.stats?.comment_count || "0", 10),
            share_count: parseInt(row.stats?.share_count || "0", 10),
            media_urls: row.media_urls || [],
            tags: row.tags || [],
            published_at: row.published_at || row.crawled_at,
            crawled_at: row.crawled_at,
            is_ad: true,
            growth_rate: row.growth_rate || 0,
            views_history: [],
            author: row.author
          };
        });

        if (sortBy === "growth_pct_desc") {
          data.sort((a: any, b: any) => b.growth_rate - a.growth_rate);
        } else {
          data.sort((a: any, b: any) => b.view_count - a.view_count);
        }

        setCreatives(data);
      } catch (err) {
        console.error("Error loading growth data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedPlatform, sortBy]);

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-bold text-foreground">Tăng trưởng nhanh</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Phát hiện các mẫu quảng cáo đang bứt phá về tương tác so với kỳ trước</p>
      </div>

      {/* Filter panel */}
      <div className="bg-card rounded-xl border border-border p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Comparison period */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Kỳ so sánh</span>
            <DropdownSelect
              value={comparisonPeriod}
              onChange={setComparisonPeriod}
              options={[
                { value: "7d_vs_7d", label: "7 ngày gần nhất vs 7 ngày trước" },
                { value: "30d_vs_30d", label: "30 ngày gần nhất vs 30 ngày trước" },
              ]}
              fullWidth
            />
          </div>

          {/* Metric Sort */}
          <div className="space-y-1.5 md:col-span-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Sắp xếp theo chỉ số</span>
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
                Tỷ lệ tăng trưởng (%)
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
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          Đang tải dữ liệu tăng trưởng...
        </div>
      ) : creatives.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {creatives.map((ad) => {
            const nickname = ad.author?.nickname || "Không rõ";
            return (
              <CreativeCard
                key={ad.id}
                creative={ad}
                advertiserName={nickname}
                onClick={() => handleCardClick(ad.id)}
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
            Tiếp tục chạy crawler để thu thập thêm dữ liệu so sánh cho kỳ gần nhất.
          </p>
        </div>
      )}

      {/* Modal Creative Detail View */}
      {viewId && (
        <CreativeDetailView
          id={viewId}
          isModal={true}
          onClose={handleCloseModal}
          onNavigate={handleNavigateModal}
        />
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
