import { NextResponse } from "next/server";
import { searchAds } from "@/lib/services/creative.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const platforms = platform && platform !== "all" ? platform.split(",").map(p => p.trim()) : undefined;

  const result = await searchAds({
    platforms,
    timeRange: "7d",
    sort: "likes",
    page,
    limit,
  });

  return NextResponse.json(result);
}
