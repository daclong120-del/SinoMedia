import { NextResponse } from "next/server";
import { searchAds } from "@/lib/services/creative.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || undefined;
  const platform = searchParams.get("platform") || undefined;
  const mediaType = searchParams.get("mediaType") as any || undefined;
  const timeRange = searchParams.get("timeRange") as any || undefined;
  const tag = searchParams.get("tag") || undefined;
  const sort = searchParams.get("sort") as any || "newest";
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
