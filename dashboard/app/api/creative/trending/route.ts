import { NextResponse } from "next/server";
import { searchAds } from "@/lib/services/creative.service";

/**
 * @deprecated Các trang dashboard đã được refactor sang Server Component và gọi trực tiếp creative.service.ts
 * Endpoint này chỉ được giữ lại để tương thích ngược hoặc cho crawler/externals gọi.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") || undefined;
  const rawTimeRange = searchParams.get("timeRange") || "7d";
  const timeRange = rawTimeRange === "1y" ? "all" : (rawTimeRange as "7d" | "30d" | "90d" | "all");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const platforms = platform && platform !== "all" ? platform.split(",").map(p => p.trim()) : undefined;

  const result = await searchAds({
    platforms,
    timeRange,
    sort: "views",
    page,
    limit,
  });

  return NextResponse.json(result);
}
