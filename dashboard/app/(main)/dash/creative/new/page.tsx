"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { mockCreativeAds, mockCreativeAdvertisers } from "@/lib/mock-data";
import CreativeCard from "@/components/dashboard/CreativeCard";
import Pagination from "@/components/dashboard/Pagination";
import { PlatformBadge } from "@/components/dashboard/Badges";
import CreativeDetailView from "@/components/dashboard/CreativeDetailView";
import { timeAgo, formatNumber, cn } from "@/lib/utils";
import type { Platform, CreativeAd } from "@/types";

function NewCreativesPageContent() {
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

  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(60);

  const [creatives, setCreatives] = useState<CreativeAd[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Reset to page 1 when platform changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlatform]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedPlatform !== "all") {
          params.set("platform", selectedPlatform);
        }
        params.set("page", String(currentPage));
        params.set("limit", String(pageSize));

        const res = await fetch(`/api/creative/new?${params.toString()}`);
        if (!res.ok) throw new Error("Fetch failed");
        const json = await res.json();
        
        const mapped = json.data.map((row: any) => {
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

        setCreatives(mapped);
        setTotalCount(json.total);
      } catch (err) {
        console.error("Error loading new creatives:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedPlatform, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Creative mới</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Dòng thời gian các creative vừa được hệ thống crawler phát hiện và thu thập</p>
        </div>
      </div>

      {/* Platform filters */}
      <div className="flex flex-wrap gap-1.5 bg-card rounded-xl border border-border p-4">
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

      {/* Grid creative results */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          Đang tải creative mới...
        </div>
      ) : creatives.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {creatives.map((ad) => {
              const nickname = (ad as any).author?.nickname || "Không rõ";
              return (
                <div key={ad.id} className="relative">
                  <div className="absolute top-2 right-2 z-20 pointer-events-none">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-white shadow-sm uppercase">
                      Mới
                    </span>
                  </div>
                  <CreativeCard
                    creative={ad}
                    advertiserName={nickname}
                    onClick={() => handleCardClick(ad.id)}
                  />
                </div>
              );
            })}
          </div>
          
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center max-w-md mx-auto space-y-3">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-foreground">Chưa có creative mới</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Creative sẽ tự động xuất hiện tại đây khi crawler của bạn thu thập dữ liệu mới.
          </p>
        </div>
      )}

      {/* Detail view Modal */}
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

export default function NewCreativesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Đang tải creative mới...</div>}>
      <NewCreativesPageContent />
    </Suspense>
  );
}
