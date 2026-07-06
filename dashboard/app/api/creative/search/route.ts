import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const platform = searchParams.get("platform") || "all";
    const mediaType = searchParams.get("mediaType") || "all";
    const timeRange = searchParams.get("timeRange") || "all"; // all, 7d, 30d, 90d
    const tag = searchParams.get("tag") || "";
    const sort = searchParams.get("sort") || "newest";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const supabase = await createClientServer();
    let q = supabase
      .from("crawled_posts")
      .select("*", { count: "exact" });

    // 1. Lọc theo platform (multi-select)
    if (platform !== "all") {
      const platforms = platform.split(",").map(p => p.trim());
      q = q.in("platform", platforms);
    }

    // 2. Lọc theo media type
    if (mediaType !== "all") {
      if (mediaType === "video") {
        // Post có cover_url hoặc stats.play_count thường là video
        q = q.not("cover_url", "is", null);
      } else if (mediaType === "image" || mediaType === "carousel") {
        q = q.is("cover_url", null);
      }
    }

    // 3. Lọc theo tag cụ thể
    if (tag) {
      q = q.contains("tags", [tag]);
    }

    // 4. Lọc theo time range (published_at)
    if (timeRange !== "all") {
      const now = new Date();
      const startDate = new Date();
      if (timeRange === "7d") {
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === "30d") {
        startDate.setDate(now.getDate() - 30);
      } else if (timeRange === "90d") {
        startDate.setDate(now.getDate() - 90);
      }
      q = q.gte("published_at", startDate.toISOString());
    }

    // 5. Tìm kiếm từ khóa theo caption
    if (query) {
      q = q.ilike("caption", `%${query}%`);
    }

    // 6. Sắp xếp
    if (sort === "newest") {
      q = q.order("published_at", { ascending: false, nullsFirst: false });
    } else if (sort === "oldest") {
      q = q.order("published_at", { ascending: true, nullsFirst: true });
    } else if (sort === "views") {
      q = q.order("stats->play_count", { ascending: false });
    } else if (sort === "likes") {
      q = q.order("stats->like_count", { ascending: false });
    } else if (sort === "comments") {
      q = q.order("stats->comment_count", { ascending: false });
    }

    // 7. Phân trang
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    q = q.range(from, to);

    const { data: posts, error, count } = await q;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        data: [],
        page,
        limit,
        total: count || 0,
      });
    }

    // 8. Đọc thông tin Authors (KOL/Advertiser) tương ứng và map lại
    const authorIds = Array.from(new Set(posts.map(p => p.author_id).filter(Boolean)));
    let authorsMap = new Map();
    
    if (authorIds.length > 0) {
      const { data: authors } = await supabase
        .from("crawled_authors")
        .select("*")
        .in("id", authorIds);
        
      if (authors) {
        authorsMap = new Map(authors.map(a => [a.id, a]));
      }
    }

    const postsWithAuthor = posts.map(p => ({
      ...p,
      author: p.author_id ? authorsMap.get(p.author_id) || null : null
    }));

    return NextResponse.json({
      data: postsWithAuthor,
      page,
      limit,
      total: count || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
