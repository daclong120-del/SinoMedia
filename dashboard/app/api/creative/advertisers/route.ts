import { NextResponse } from "next/server";
import { getAdvertisers } from "@/lib/services/creative.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") || undefined;
  const query = searchParams.get("query") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const offset = (page - 1) * limit;

  const result = await getAdvertisers({
    platform: platform === "all" ? undefined : platform,
    search: query,
    limit,
    offset,
  });

  return NextResponse.json({
    data: result.data,
    page,
    limit,
    total: result.total,
  });
}
