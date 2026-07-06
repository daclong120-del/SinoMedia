import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";
import { mockCreativeAds, mockCreativeAdvertisers } from "@/lib/mock-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const platform = searchParams.get("platform") || "all";
  const mediaType = searchParams.get("mediaType") || "all";
  const timeRange = searchParams.get("timeRange") || "all"; // all, 7d, 30d, 90d
  const tag = searchParams.get("tag") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  // Helper function to serve mock data when DB is offline or mock session is active
  const serveMockData = () => {
    let filtered = [...mockCreativeAds];
    
    // 1. Lọc theo platform (multi-select)
    if (platform !== "all") {
      const platforms = platform.split(",").map(p => p.trim());
      filtered = filtered.filter(ad => platforms.includes(ad.platform));
    }
    
    // 2. Lọc theo media type
    if (mediaType !== "all") {
      filtered = filtered.filter(ad => ad.media_type === mediaType);
    }
    
    // 3. Lọc theo tag
    if (tag) {
      filtered = filtered.filter(ad => ad.tags.includes(tag));
    }

    // 4. Lọc theo từ khóa (caption)
    if (query) {
      filtered = filtered.filter(ad => 
        ad.caption.toLowerCase().includes(query.toLowerCase()) || 
        (ad.title || "").toLowerCase().includes(query.toLowerCase())
      );
    }

    // 5. Sắp xếp
    if (sort === "views") {
      filtered.sort((a, b) => b.view_count - a.view_count);
    } else if (sort === "likes") {
      filtered.sort((a, b) => b.like_count - a.like_count);
    } else if (sort === "comments") {
      filtered.sort((a, b) => b.comment_count - a.comment_count);
    } else if (sort === "newest") {
      filtered.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    } else if (sort === "oldest") {
      filtered.sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime());
    }

    const total = filtered.length;
    const from = (page - 1) * limit;
    const paginated = filtered.slice(from, from + limit);

    // Map thêm author profile
    const paginatedWithAuthor = paginated.map(ad => {
      const author = mockCreativeAdvertisers.find(a => a.id === ad.author_id) || null;
      return {
        ...ad,
        stats: {
          play_count: ad.view_count,
          like_count: ad.like_count,
          comment_count: ad.comment_count,
          share_count: ad.share_count
        },
        author
      };
    });

    return NextResponse.json({
      data: paginatedWithAuthor,
      page,
      limit,
      total
    });
  };

  const mockSession = request.headers.get("cookie")?.includes("sb-mock-session=true");
  if (mockSession) {
    return serveMockData();
  }

  try {
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
      console.warn("[API Search] Database error, falling back to mock:", error);
      return serveMockData();
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
    console.warn("[API Search] Exception caught, falling back to mock:", err);
    return serveMockData();
  }
}
