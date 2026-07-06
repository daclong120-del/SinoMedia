import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform") || "all";
    const query = searchParams.get("query") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const supabase = await createClientServer();
    let q = supabase
      .from("crawled_authors")
      .select("*", { count: "exact" });

    // 1. Lọc theo platform
    if (platform !== "all") {
      const platforms = platform.split(",").map(p => p.trim());
      q = q.in("platform", platforms);
    }

    // 2. Tìm kiếm tên advertiser/author
    if (query) {
      q = q.ilike("nickname", `%${query}%`);
    }

    // 3. Sắp xếp theo số lượng fans (tương đương quy mô)
    q = q.order("fans_count", { ascending: false });

    // 4. Phân trang
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    q = q.range(from, to);

    const { data: authors, error, count } = await q;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!authors || authors.length === 0) {
      return NextResponse.json({
        data: [],
        page,
        limit,
        total: count || 0,
      });
    }

    // 5. Aggregate: Đọc toàn bộ posts của các authors này để tính tổng số bài và tổng views
    const authorIds = authors.map(a => a.id);
    let postsData: any[] = [];
    
    if (authorIds.length > 0) {
      const { data } = await supabase
        .from("crawled_posts")
        .select("author_id, stats")
        .in("author_id", authorIds);
      if (data) {
        postsData = data;
      }
    }

    // Gom dữ liệu aggregate trong memory
    const aggregationMap = new Map<string, { creative_count: number; total_views: number; total_likes: number }>();
    
    postsData.forEach(post => {
      const aId = post.author_id;
      if (!aId) return;

      const views = parseInt(post.stats?.play_count || post.stats?.view_count || "0", 10);
      const likes = parseInt(post.stats?.like_count || "0", 10);

      if (!aggregationMap.has(aId)) {
        aggregationMap.set(aId, { creative_count: 0, total_views: 0, total_likes: 0 });
      }

      const agg = aggregationMap.get(aId)!;
      agg.creative_count += 1;
      agg.total_views += views;
      agg.total_likes += likes;
    });

    // 6. Trộn kết quả trả về
    const result = authors.map(author => {
      const agg = aggregationMap.get(author.id) || { creative_count: 0, total_views: 0, total_likes: 0 };
      return {
        ...author,
        creative_count: agg.creative_count,
        total_views: agg.total_views,
        total_likes: agg.total_likes
      };
    });

    return NextResponse.json({
      data: result,
      page,
      limit,
      total: count || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
