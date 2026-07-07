import { NextResponse } from "next/server";
import { searchAds } from "@/lib/services/creative.service";

/**
 * @deprecated Các trang dashboard đã được refactor sang Server Component và gọi trực tiếp creative.service.ts
 * Endpoint này chỉ được giữ lại để tương thích ngược hoặc cho crawler/externals gọi.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || undefined;
  const platform = searchParams.get("platform") || undefined;
  const rawMediaType = searchParams.get("mediaType") || undefined;
  const mediaType = rawMediaType === "carousel" ? "image" : (rawMediaType as "video" | "image" | "all" | undefined);
  const rawTimeRange = searchParams.get("timeRange") || undefined;
  const timeRange = rawTimeRange === "1y" ? "all" : (rawTimeRange as "7d" | "30d" | "90d" | "all" | undefined);
  const tag = searchParams.get("tag") || undefined;
  const sort = (searchParams.get("sort") || "newest") as "views" | "likes" | "comments" | "newest" | "oldest";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const platforms = platform && platform !== "all" ? platform.split(",").map(p => p.trim()) : undefined;

  const result = await searchAds({
    search: query,
    platforms,
    mediaType,
    timeRange,
    tag,
    sort,
    page,
    limit,
  });

  return NextResponse.json(result);
}
