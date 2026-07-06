import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing creative ID" }, { status: 400 });
    }

    const supabase = await createClientServer();

    // 1. Lấy thông tin bài viết (creative)
    const { data: post, error: postError } = await supabase
      .from("crawled_posts")
      .select("*")
      .eq("id", id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: "Creative not found" }, { status: 404 });
    }

    // 2. Lấy thông tin tác giả tương ứng
    let author = null;
    if (post.author_id) {
      const { data: authorData } = await supabase
        .from("crawled_authors")
        .select("*")
        .eq("id", post.author_id)
        .single();
      
      if (authorData) {
        author = authorData;
      }
    }

    return NextResponse.json({
      ...post,
      author,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
