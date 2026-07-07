import React, { Suspense } from "react";
import { searchAds } from "@/lib/services/creative.service";
import CreativeSearchClient from "./search-client";
import type { Platform } from "@/types";

export default async function CreativeSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const q = params.q || "";
  const platform = params.platform ? (params.platform.split(",") as Platform[]) : [];
  const mediaType = params.mediaType ? params.mediaType.split(",") : [];
  const sort = params.sort || "views";
  const page = params.page ? parseInt(params.page, 10) : 1;
  const limit = params.limit ? parseInt(params.limit, 10) : 60;
  const timeRange = params.timeRange || "30d";

  const rawMediaType = mediaType.length > 0 ? mediaType[0] : undefined;
  const mappedMediaType = rawMediaType === "carousel" ? "image" : (rawMediaType as "video" | "image" | "all" | undefined);
  const mappedTimeRange = timeRange === "1y" ? "all" : (timeRange as "7d" | "30d" | "90d" | "all" | undefined);

  const result = await searchAds({
    search: q,
    platforms: platform,
    mediaType: mappedMediaType,
    timeRange: mappedTimeRange,
    sort: sort as "views" | "likes" | "comments" | "newest" | "oldest",
    page,
    limit,
  });

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Đang tải trang tìm kiếm...</div>}>
      <CreativeSearchClient
        initialData={result}
        initialFilters={{
          q,
          platform,
          mediaType,
          timeRange,
          sort,
          page,
          limit,
        }}
      />
    </Suspense>
  );
}
