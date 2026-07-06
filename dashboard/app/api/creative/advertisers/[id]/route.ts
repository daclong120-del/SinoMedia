import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing advertiser ID" }, { status: 400 });
    }

    const supabase = await createClientServer();

    // 1. Lấy thông tin advertiser profile
    const { data: author, error: authorError } = await supabase
      .from("crawled_authors")
      .select("*")
      .eq("id", id)
      .single();

    if (authorError || !author) {
      return NextResponse.json({ error: "Advertiser not found" }, { status: 404 });
    }

    // 2. Lấy toàn bộ posts của advertiser này
    const { data: posts, error: postsError } = await supabase
      .from("crawled_posts")
      .select("*")
      .eq("author_id", id)
      .order("published_at", { ascending: false });

    if (postsError) {
      return NextResponse.json({ error: postsError.message }, { status: 500 });
    }

    // 3. Tính toán các thông số tổng hợp
    let totalViews = 0;
    let totalLikes = 0;
    
    posts.forEach(p => {
      totalViews += parseInt(p.stats?.play_count || p.stats?.view_count || "0", 10);
      totalLikes += parseInt(p.stats?.like_count || "0", 10);
    });

    const enrichedProfile = {
      ...author,
      creative_count: posts.length,
      total_views: totalViews,
      total_likes: totalLikes,
    };

    return NextResponse.json({
      advertiser: enrichedProfile,
      creatives: posts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
