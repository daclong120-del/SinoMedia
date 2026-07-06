import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform") || "all";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const supabase = await createClientServer();
    let q = supabase
      .from("crawled_posts")
      .select("*", { count: "exact" });

    // 1. Lọc theo platform
    if (platform !== "all") {
      const platforms = platform.split(",").map(p => p.trim());
      q = q.in("platform", platforms);
    }

    // 2. Sắp xếp theo thời gian cào về mới nhất (crawled_at DESC)
    q = q.order("crawled_at", { ascending: false });

    // 3. Phân trang
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

    // 4. Đọc thông tin Authors và map lại
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
