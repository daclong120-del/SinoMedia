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

    // 2. Lọc bài đăng xuất bản trong vòng 7 ngày gần nhất (định nghĩa bứt phá)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    q = q.gte("published_at", startDate.toISOString());

    // 3. Sắp xếp theo likes nhiều nhất trong các bài đăng mới này
    // Bài viết mới xuất bản có nhiều likes/views tức là có tốc độ tăng trưởng cực mạnh
    q = q.order("stats->like_count", { ascending: false })
         .order("stats->play_count", { ascending: false });

    // 4. Phân trang
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

    // 5. Đọc thông tin Authors và map lại
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

    // 6. Tính toán mock growth percentage giả lập cho UI đẹp mắt
    // Ví dụ: dựa vào thời gian đăng, bài càng mới + tương tác càng cao thì growth rate càng khủng
    const postsWithAuthor = posts.map(p => {
      const published = new Date(p.published_at || p.crawled_at);
      const hoursAgo = Math.max(1, (Date.now() - published.getTime()) / (1000 * 60 * 60));
      const likes = parseInt(p.stats?.like_count || "0", 10);
      
      // Tỷ lệ tăng trưởng giả định tỉ lệ thuận với lượng like thu về mỗi giờ
      const growthRate = Math.min(999, Math.round((likes / hoursAgo) * 10 + 15));

      return {
        ...p,
        growth_rate: growthRate, // Trả về số % tăng trưởng để render badge xanh lá ở UI
        author: p.author_id ? authorsMap.get(p.author_id) || null : null
      };
    });

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
