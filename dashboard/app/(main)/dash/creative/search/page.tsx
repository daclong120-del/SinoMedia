"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { mockCreativeAds, mockCreativeAdvertisers } from "@/lib/mock-data";
import CreativeCard from "@/components/dashboard/CreativeCard";
import DropdownSelect from "@/components/dashboard/DropdownSelect";
import Pagination from "@/components/dashboard/Pagination";
import { cn } from "@/lib/utils";
import type { Platform } from "@/types";

function CreativeSearchPageContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") || "";

  // State filters
  const [search, setSearch] = useState(initialSearch);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState("30d");
  const [sortBy, setSortBy] = useState("view_count_desc");
  const [contentType, setContentType] = useState("all"); // all, ad, organic

  // Advanced filters state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minViews, setMinViews] = useState("");
  const [minLikes, setMinLikes] = useState("");
  const [language, setLanguage] = useState("all"); // all, zh, en, other

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(60);

  // Multiply mock data to support paginating 60 items per page (180 items total)
  const extendedMockCreativeAds = useMemo(() => {
    const list = [...mockCreativeAds];
    const result = [];
    // We multiply 10 unique creatives by 18 to get 180 items
    for (let i = 0; i < 18; i++) {
      list.forEach((ad, index) => {
        result.push({
          ...ad,
          id: `${ad.id}_copy_${i}`,
          // Slightly vary metrics so the list isn't completely identical
          view_count: Math.round(ad.view_count * (1 + ((i + index) % 5) * 0.12)),
          like_count: Math.round(ad.like_count * (1 + ((i + index) % 4) * 0.08)),
          // Slightly stagger crawled_at
          crawled_at: new Date(new Date(ad.crawled_at).getTime() - i * 3600000).toISOString(),
        });
      });
    }
    return result;
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    selectedPlatforms,
    selectedMediaTypes,
    timeRange,
    sortBy,
    contentType,
    minViews,
    minLikes,
    language,
  ]);

  // Sync initial query param
  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  const togglePlatform = (p: Platform) => {
    if (selectedPlatforms.includes(p)) {
      setSelectedPlatforms(selectedPlatforms.filter((item) => item !== p));
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  const toggleMediaType = (type: string) => {
    if (selectedMediaTypes.includes(type)) {
      setSelectedMediaTypes(selectedMediaTypes.filter((item) => item !== type));
    } else {
      setSelectedMediaTypes([...selectedMediaTypes, type]);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedPlatforms([]);
    setSelectedMediaTypes([]);
    setTimeRange("30d");
    setSortBy("view_count_desc");
    setContentType("all");
    setMinViews("");
    setMinLikes("");
    setLanguage("all");
  };

  const handleExport = () => {
    alert("Tính năng đang được phát triển: Xuất danh sách creative dưới dạng CSV/Excel.");
  };

  // Filter logic
  const filtered = extendedMockCreativeAds.filter((ad) => {
    // 1. Search Query
    const matchesSearch =
      !search ||
      ad.caption.toLowerCase().includes(search.toLowerCase()) ||
      (ad.title || "").toLowerCase().includes(search.toLowerCase()) ||
      ad.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));

    // 2. Platforms
    const matchesPlatform =
      selectedPlatforms.length === 0 || selectedPlatforms.includes(ad.platform);

    // 3. Media Types
    const matchesMediaType =
      selectedMediaTypes.length === 0 || selectedMediaTypes.includes(ad.media_type);

    // 4. Content Type (ad / organic)
    const matchesContentType =
      contentType === "all" ||
      (contentType === "ad" && ad.is_ad) ||
      (contentType === "organic" && !ad.is_ad);

    // 5. Advanced Filters - Min Views
    const matchesMinViews = !minViews || ad.view_count >= parseInt(minViews, 10);

    // 6. Advanced Filters - Min Likes
    const matchesMinLikes = !minLikes || ad.like_count >= parseInt(minLikes, 10);

    // 7. Language (Mock check - if zh check for hanzi, if en check for en, etc.)
    let matchesLanguage = true;
    if (language !== "all") {
      const hasChinese = /[\u4e00-\u9fa5]/.test(ad.caption);
      if (language === "zh") {
        matchesLanguage = hasChinese;
      } else if (language === "en") {
        matchesLanguage = !hasChinese && ad.caption.includes(" ");
      } else {
        matchesLanguage = !hasChinese && !ad.caption.includes(" ");
      }
    }

    return (
      matchesSearch &&
      matchesPlatform &&
      matchesMediaType &&
      matchesContentType &&
      matchesMinViews &&
      matchesMinLikes &&
      matchesLanguage
    );
  });

  // Sorting logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "view_count_desc") return b.view_count - a.view_count;
    if (sortBy === "like_count_desc") return b.like_count - a.like_count;
    if (sortBy === "comment_count_desc") return b.comment_count - a.comment_count;
    if (sortBy === "published_at_desc") return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    if (sortBy === "published_at_asc") return new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginatedSorted = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1600px] mx-auto space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Tìm Creative</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Tìm kiếm và phân tích toàn diện các mẫu quảng cáo từ các nền tảng lớn</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="h-8 px-3 text-xs font-medium rounded-lg bg-card border border-border text-card-foreground hover:bg-muted transition-colors flex items-center gap-1.5 shrink-0"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Xuất danh sách
          </button>
        </div>
      </div>

      {/* Main Search and Basic Filters */}
      <div className="bg-card rounded-xl border border-border p-4 md:p-6 space-y-4">
        {/* Search Input Box */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo caption, hashtag, tên advertiser..."
            className="w-full h-11 pl-10 pr-4 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
          />
        </div>

        {/* Chips for Platform selection */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Nền tảng</span>
          <div className="flex flex-wrap gap-2">
            {(["douyin", "xhs", "bilibili", "weibo", "kuaishou", "zhihu", "tieba", "tiktok"] as Platform[]).map((p) => {
              const isSelected = selectedPlatforms.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 capitalize",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground shadow-sm"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  )}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor:
                        p === "douyin"
                          ? "#FE2C55"
                          : p === "xhs"
                          ? "#FF2442"
                          : p === "bilibili"
                          ? "#00A1D6"
                          : p === "weibo"
                          ? "#E6162D"
                          : p === "kuaishou"
                          ? "#FF4906"
                          : p === "zhihu"
                          ? "#0066FF"
                          : p === "tieba"
                          ? "#1678FF"
                          : "#000000",
                    }}
                  />
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Media type chips and Select drop downs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Media types */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Loại Media</span>
            <div className="flex gap-2">
              {["video", "image", "carousel"].map((type) => {
                const isSelected = selectedMediaTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleMediaType(type)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground shadow-sm"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    )}
                  >
                    {type === "video" ? "Video" : type === "image" ? "Ảnh" : "Carousel"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time range select */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Khoảng thời gian</span>
            <DropdownSelect
              value={timeRange}
              onChange={setTimeRange}
              options={[
                { value: "7d", label: "7 ngày vừa qua" },
                { value: "30d", label: "30 ngày vừa qua" },
                { value: "90d", label: "90 ngày vừa qua" },
                { value: "1y", label: "1 năm vừa qua" },
              ]}
              fullWidth
            />
          </div>

          {/* Sorting select */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Sắp xếp</span>
            <DropdownSelect
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: "view_count_desc", label: "Views cao nhất" },
                { value: "like_count_desc", label: "Likes cao nhất" },
                { value: "comment_count_desc", label: "Comments nhiều nhất" },
                { value: "published_at_desc", label: "Mới nhất" },
                { value: "published_at_asc", label: "Cũ nhất" },
              ]}
              fullWidth
            />
          </div>
        </div>

        {/* Expandable Advanced Filters */}
        <div className="pt-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline focus:outline-none"
          >
            <span>{showAdvanced ? "Ẩn lọc nâng cao" : "Lọc nâng cao"}</span>
            <svg
              className={cn("size-3.5 transition-transform duration-200", showAdvanced ? "rotate-180" : "")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAdvanced && (
            <div className="mt-4 p-4 rounded-xl bg-muted/40 border border-border/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-muted-foreground">View tối thiểu</span>
                <input
                  type="number"
                  value={minViews}
                  onChange={(e) => setMinViews(e.target.value)}
                  placeholder="Ví dụ: 10000"
                  className="w-full h-8 px-3 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-muted-foreground">Like tối thiểu</span>
                <input
                  type="number"
                  value={minLikes}
                  onChange={(e) => setMinLikes(e.target.value)}
                  placeholder="Ví dụ: 500"
                  className="w-full h-8 px-3 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-muted-foreground">Ngôn ngữ caption</span>
                <DropdownSelect
                  value={language}
                  onChange={setLanguage}
                  options={[
                    { value: "all", label: "Tất cả ngôn ngữ" },
                    { value: "zh", label: "Tiếng Trung (zh)" },
                    { value: "en", label: "Tiếng Anh (en)" },
                    { value: "other", label: "Khác" },
                  ]}
                  fullWidth
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Result summary and Content type Quick Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-4">
        <div className="text-xs text-muted-foreground">
          Tìm thấy <span className="text-foreground font-semibold">{sorted.length}</span> creative phù hợp
        </div>

        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg self-start sm:self-auto">
          {[
            { value: "all", label: "Tất cả" },
            { value: "ad", label: "Quảng cáo" },
            { value: "organic", label: "Tự nhiên" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setContentType(tab.value)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-all",
                contentType === tab.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Action Reset & Clear */}
      {(search ||
        selectedPlatforms.length > 0 ||
        selectedMediaTypes.length > 0 ||
        contentType !== "all" ||
        minViews ||
        minLikes ||
        language !== "all" ||
        timeRange !== "30d" ||
        sortBy !== "view_count_desc") && (
        <div className="flex items-center justify-between bg-orange-500/5 border border-orange-500/10 rounded-xl p-3 text-xs text-orange-600 dark:text-orange-400">
          <span>Bạn đang áp dụng bộ lọc tùy chọn.</span>
          <button onClick={handleResetFilters} className="font-semibold underline hover:text-orange-700">
            Đặt lại bộ lọc ✕
          </button>
        </div>
      )}

      {/* Grid of Results */}
      {paginatedSorted.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {paginatedSorted.map((ad) => {
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-foreground">Không tìm thấy creative nào</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn để mở rộng phạm vi kết quả.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs transition-all hover:opacity-90"
          >
            Đặt lại tất cả bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}

export default function CreativeSearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Đang tải trang tìm kiếm...</div>}>
      <CreativeSearchPageContent />
    </Suspense>
  );
}
