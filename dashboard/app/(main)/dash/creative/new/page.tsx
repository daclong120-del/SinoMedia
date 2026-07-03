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
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(60);

  // Multiply mock data to support paginating 60 items per page (180 items total)
  const extendedMockCreativeAds = useMemo(() => {
    const list = [...mockCreativeAds];
    const result: CreativeAd[] = [];

    const imagePool = [
      "/assets_test/image/TikTok_SPY_30062026_1.jpg",
      "/assets_test/image/TikTok_SPY_30062026_2.jpg",
      "/assets_test/image/Instagram_SPY_30062026_1.jpg",
      "/assets_test/image/Facebook_SPY_30062026_1.jpg",
      "/assets_test/image/Spotify_SPY_30062026_1.jpg",
      "/assets_test/image/StarMaker_SPY_30062026_1.jpg",
      "/assets_test/image/StarMaker_SPY_30062026_2.jpg",
      "/assets_test/image/Temu_SPY_30062026_1.jpg",
      "/assets_test/image/Temu_SPY_30062026_2.jpg",
      "/assets_test/image/Alibabacom_SPY_30062026_1.jpg",
      "/assets_test/image/FxPro_SPY_30062026_1.jpg",
      "/assets_test/image/FxPro_SPY_30062026_2.jpg",
      "/assets_test/image/WeatherRain_SPY_30062026_1.jpg",
      "/assets_test/image/ASTRO_SPY_30062026_1.jpg",
      "/assets_test/image/Glovo_SPY_30062026_1.jpg",
      "/assets_test/image/Glovo_SPY_30062026_2.jpg",
      "/assets_test/image/Magalu_SPY_30062026_1.jpg",
      "/assets_test/image/Specialized_SPY_30062026_1.jpg"
    ];

    const videoPool = [
      "/assets_test/video/English/TikTok_SPY_30062026_1.mp4",
      "/assets_test/video/English/FontKeyboard_SPY_30062026_1.mp4",
      "/assets_test/video/English/HDVideo_SPY_30062026_1.mp4",
      "/assets_test/video/English/GlobalNews_SPY_30062026_1.mp4",
      "/assets_test/video/English/GFXHyperUPFPS_SPY_30062026_1.mp4",
      "/assets_test/video/English/AITranslator_SPY_30062026_11.mp4",
      "/assets_test/video/English/CONTOURDIABETES_SPY_30062026_1.mp4",
      "/assets_test/video/English/HSVPN_SPY_30062026_1.mp4",
      "/assets_test/video/English/MoboReels_SPY_30062026_1.mp4",
      "/assets_test/video/English/PersonalPay_SPY_30062026_1.mp4",
      "/assets_test/video/English/PicTrace_SPY_30062026_1.mp4",
      "/assets_test/video/English/Plantify_SPY_30062026_1.mp4",
      "/assets_test/video/English/RemoteControl_SPY_30062026_1.mp4",
      "/assets_test/video/English/ShopeeBrands_SPY_30062026_1.mp4",
      "/assets_test/video/English/VPN_SPY_30062026_1.mp4",
      "/assets_test/video/English/VidCash_SPY_30062026_1.mp4"
    ];

    for (let i = 0; i < 18; i++) {
      list.forEach((ad, index) => {
        let copyCover = imagePool[(index * 7 + i * 3) % imagePool.length];
        let copyVideo = videoPool[(index * 5 + i * 2) % videoPool.length];
        let viewCount = Math.round(ad.view_count * (1 + ((i + index) % 5) * 0.12));
        let likeCount = Math.round(ad.like_count * (1 + ((i + index) % 4) * 0.08));
        let crawledAt = new Date(new Date(ad.crawled_at).getTime() - i * 3600000).toISOString();
        let mediaType = ad.media_type;

        // Custom overrides for the first 3 items (CR-001_copy_0, CR-002_copy_0, CR-003_copy_0)
        if (i === 0 && ad.id === "CR-001") {
          copyCover = "/assets_test/image/TikTok_SPY_30062026_1.jpg";
          copyVideo = "/assets_test/video/BN/AITranslator_SPY_30062026_12.mp4";
          viewCount = 6000000;
          crawledAt = new Date().toISOString();
          mediaType = "video";
        } else if (i === 0 && ad.id === "CR-002") {
          copyCover = "/assets_test/image/StarMaker_SPY_30062026_1.jpg";
          copyVideo = "/assets_test/video/BN/AITranslator_SPY_30062026_92.mp4";
          viewCount = 5900000;
          crawledAt = new Date(Date.now() - 60000).toISOString();
          mediaType = "video";
        } else if (i === 0 && ad.id === "CR-003") {
          copyCover = "/assets_test/image/Temu_SPY_30062026_1.jpg";
          copyVideo = "/assets_test/video/BN/OlymptradeTrading_SPY_30062026_1.mp4";
          viewCount = 5800000;
          crawledAt = new Date(Date.now() - 120000).toISOString();
          mediaType = "video";
        }

        result.push({
          ...ad,
          id: `${ad.id}_copy_${i}`,
          cover_url: copyCover,
          media_urls: mediaType === "video" ? [copyVideo] : [copyCover],
          media_type: mediaType,
          view_count: viewCount,
          like_count: likeCount,
          crawled_at: crawledAt,
        });
      });
    }
    return result;
  }, []);

  // Reset to page 1 when platform filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlatform]);

  // Simple auto refresh mock
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 800);
      }, 10000); // refresh every 10s for demo
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const filtered = extendedMockCreativeAds.filter((ad) => {
    return selectedPlatform === "all" || ad.platform === selectedPlatform;
  });

  // Sort by crawled_at DESC (newest crawled first)
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.crawled_at).getTime() - new Date(a.crawled_at).getTime()
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginatedSorted = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Creative mới</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Dòng thời gian các creative vừa được hệ thống crawler phát hiện và thu thập</p>
        </div>
        <div className="flex items-center gap-3">
          {refreshing && (
            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
              Đang làm mới...
            </span>
          )}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "h-8 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5",
              autoRefresh
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-card border-border text-foreground hover:bg-muted"
            )}
          >
            <span className={cn("size-2 rounded-full", autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-zinc-400")} />
            Tự động cập nhật
          </button>
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
      {paginatedSorted.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {paginatedSorted.map((ad) => {
              const adv = mockCreativeAdvertisers.find((a) => a.id === ad.author_id);
              // Custom Card layout showing crawl relative time
              return (
                <div key={ad.id} className="relative">
                  {/* Custom "Mới" Badge overlay */}
                  <div className="absolute top-2 right-2 z-20 pointer-events-none">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-white shadow-sm uppercase">
                      Mới
                    </span>
                  </div>
                  <CreativeCard
                    creative={ad}
                    advertiserName={adv?.nickname}
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
