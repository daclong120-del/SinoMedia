"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PlatformBadge } from "@/components/dashboard/Badges";
import DropdownSelect from "@/components/dashboard/DropdownSelect";
import { getPosts, getComments, getTags } from "@/lib/actions/data.actions";
import { formatNumber, timeAgo, cn } from "@/lib/utils";
import type { CrawledPost, CrawledComment } from "@/types";

// Mock comments for detail view
const mockComments = [
  { id: "c1", content: "Bài viết chia sẻ rất chi tiết, cảm ơn bạn!", like: 342, author: "User A", created_at: "2026-07-02T12:00:00Z", replies: [] },
  {
    id: "c2",
    content: "Cho mình hỏi mua sản phẩm này ở đâu uy tín ạ?",
    like: 89,
    author: "User B",
    created_at: "2026-07-02T13:10:00Z",
    replies: [
      { id: "c2-1", content: "Bạn xem link bio của creator nhé.", like: 12, author: "User C", created_at: "2026-07-02T13:15:00Z" },
      { id: "c2-2", content: "Mình thấy trên Douyin Mall có mall chính hãng đó.", like: 5, author: "User D", created_at: "2026-07-02T13:20:00Z" }
    ]
  },
  { id: "c3", content: "Đã thử và hiệu quả thật sự nha mọi người.", like: 156, author: "User E", created_at: "2026-07-02T14:30:00Z", replies: [] }
];

function PostsPageContent() {
  const searchParams = useSearchParams();
  const authorFilterParam = searchParams.get("author");

  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedPost, setSelectedPost] = useState<CrawledPost | null>(null);
  const [posts, setPosts] = useState<CrawledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<CrawledComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [tags, setTags] = useState<{ id: string; name: string; color: string; description: string; usage_count: number; created_at: string }[]>([]);

  // Fetch posts and tags from Supabase
  useEffect(() => {
    async function load() {
      try {
        const [postsResult, tagsResult] = await Promise.all([
          getPosts({ limit: 100 }),
          getTags()
        ]);
        setPosts(postsResult.data);
        setTags(tagsResult);
        if (postsResult.data.length > 0) {
          setSelectedPost(postsResult.data[0]);
        }
      } catch (err) {
        console.error("Error loading posts or tags:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Fetch comments when selectedPost changes
  useEffect(() => {
    if (!selectedPost) {
      setComments([]);
      return;
    }
    async function loadComments() {
      setLoadingComments(true);
      try {
        const data = await getComments(selectedPost!.id);
        setComments(data);
      } catch (err) {
        console.error("Error loading comments:", err);
      } finally {
        setLoadingComments(false);
      }
    }
    loadComments();
  }, [selectedPost?.id]);

  // Rebuild comment tree from flat DB structure
  const commentTree = useMemo(() => {
    const roots = comments.filter((c) => !c.parent_cid);
    const replies = comments.filter((c) => c.parent_cid);

    return roots.map((root) => {
      const childReplies = replies.filter((r) => r.parent_cid === root.id);
      return {
        ...root,
        replies: childReplies,
      };
    });
  }, [comments]);

  const filtered = posts.filter((post) => {
    const matchesSearch = post.caption.toLowerCase().includes(search.toLowerCase()) || (post.title || "").toLowerCase().includes(search.toLowerCase());
    const matchesPlatform = platform === "all" || post.platform === platform;
    const matchesTag = selectedTag === "all" || post.tags.includes(selectedTag);
    const matchesAuthor = !authorFilterParam || post.platform_uid === authorFilterParam;
    return matchesSearch && matchesPlatform && matchesTag && matchesAuthor;
  });

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Kho Bài viết & Video</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Kho lưu trữ nội dung cào từ các nền tảng mạng xã hội</p>
        </div>
        <div className="flex items-center gap-2">
          {authorFilterParam && (
            <button
              onClick={() => window.history.replaceState({}, "", "/dash/data/posts")}
              className="h-8 px-3 text-xs font-medium rounded-lg bg-orange-100 dark:bg-orange-950/30 text-orange-600 border border-orange-200 dark:border-orange-900 transition-colors"
            >
              Hủy lọc Creator ✕
            </button>
          )}
          <button className="h-8 px-3 text-xs font-medium rounded-lg bg-card border border-border text-card-foreground hover:bg-muted transition-colors flex items-center gap-1.5 shrink-0">
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-card rounded-xl border border-border p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="space-y-1 block">
          <span className="text-[11px] font-medium text-muted-foreground">Từ khóa tìm kiếm</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo nội dung, tag..."
            className="w-full h-8 px-3 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none placeholder:text-muted-foreground"
          />
        </label>
        <label className="space-y-1 block">
          <span className="text-[11px] font-medium text-muted-foreground">Nền tảng</span>
          <DropdownSelect
            value={platform}
            onChange={setPlatform}
            options={[
              { value: "all", label: "Tất cả nền tảng" },
              { value: "douyin", label: "Douyin" },
              { value: "xhs", label: "XHS" },
              { value: "bilibili", label: "Bilibili" },
              { value: "weibo", label: "Weibo" },
              { value: "kuaishou", label: "Kuaishou" },
              { value: "tiktok", label: "TikTok" }
            ]}
            fullWidth
          />
        </label>
        <label className="space-y-1 block">
          <span className="text-[11px] font-medium text-muted-foreground">Phân loại / Nhãn</span>
          <DropdownSelect
            value={selectedTag}
            onChange={setSelectedTag}
            options={[
              { value: "all", label: "Tất cả nhãn" },
              ...tags.map((tag) => ({ value: tag.name, label: tag.name }))
            ]}
            fullWidth
          />
        </label>
      </div>

      {/* Master Detail Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Side: Post Feed List */}
        <div className="lg:col-span-3 space-y-3 max-h-[70vh] overflow-y-auto pr-2">
          {filtered.map((post) => (
            <div
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer flex gap-4 bg-card",
                selectedPost?.id === post.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-zinc-300 dark:hover:border-zinc-700"
              )}
            >
              {/* Cover mock */}
              <div className="size-20 rounded bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-[10px] font-medium uppercase select-none border border-border">
                {post.platform} Cover
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <PlatformBadge platform={post.platform} />
                    <span className="text-[10px] text-muted-foreground">{timeAgo(post.published_at)}</span>
                  </div>
                  <p className="text-xs text-card-foreground line-clamp-2 mt-2 leading-relaxed">
                    {post.caption || "Không có chú thích."}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 text-[10px] text-muted-foreground mt-2 border-t border-border/50 pt-2">
                  <span className="font-mono">Likes: {formatNumber(post.like_count)}</span>
                  <span className="font-mono">Views: {formatNumber(post.view_count)}</span>
                  <span className="font-mono">Creator ID: {post.platform_uid}</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-16 text-center text-muted-foreground text-xs bg-card rounded-xl border border-border">
              Không tìm thấy bài viết nào.
            </div>
          )}
        </div>

        {/* Right Side: Post Detail & Comments View */}
        <div className="lg:col-span-2">
          {selectedPost ? (
            <div className="bg-card rounded-xl border border-border p-4 sticky top-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                <PlatformBadge platform={selectedPost.platform} />
                <span className="text-[11px] text-muted-foreground font-mono">UID: {selectedPost.platform_uid}</span>
              </div>

              {/* Player mockup */}
              <div className="aspect-video w-full rounded bg-black flex flex-col items-center justify-center text-zinc-400 gap-1.5 p-4 text-center border border-border">
                <svg className="size-8 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7" /><rect width="15" height="14" x="1" y="5" rx="2" ry="2" /></svg>
                <span className="text-[11px] font-semibold text-zinc-200">Video Player Mockup</span>
                <span className="text-[9px] text-zinc-500">Dữ liệu media gốc được lưu tại Cloudflare R2</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-card-foreground">Chú thích gốc</h4>
                <p className="text-xs text-card-foreground leading-relaxed whitespace-pre-wrap">{selectedPost.caption}</p>
                <div className="flex gap-1 flex-wrap pt-1">
                  {selectedPost.tags.map((t) => (
                    <span key={t} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">#{t}</span>
                  ))}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 bg-muted/40 p-3 rounded-lg border border-border/50 text-center font-mono">
                <div>
                  <p className="text-[9px] text-muted-foreground">Likes</p>
                  <p className="text-xs font-bold text-foreground mt-0.5">{formatNumber(selectedPost.like_count)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Views</p>
                  <p className="text-xs font-bold text-foreground mt-0.5">{formatNumber(selectedPost.view_count)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Comments</p>
                  <p className="text-xs font-bold text-foreground mt-0.5">{formatNumber(selectedPost.comment_count)}</p>
                </div>
              </div>

              {/* Comment Tree */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-card-foreground border-b border-border pb-2">Bình luận cào được</h4>
                <div className="space-y-3 text-[11px] leading-relaxed">
                  {loadingComments ? (
                    <div className="text-center py-4 text-muted-foreground text-xs">Đang tải bình luận...</div>
                  ) : commentTree.length > 0 ? (
                    commentTree.map((comment) => (
                      <div key={comment.id} className="space-y-2">
                        <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
                            <span className="font-semibold text-foreground">{comment.author_nickname || "Anonymous"}</span>
                            <span>{timeAgo(comment.created_at)}</span>
                          </div>
                          <p className="text-card-foreground">{comment.content}</p>
                          <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-zinc-500 font-mono">
                            <span>❤️ {comment.like_count} likes</span>
                          </div>
                        </div>
                        {/* Replies */}
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="ml-5 bg-muted/20 p-2 rounded-lg border border-border/30">
                            <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
                              <span className="font-semibold text-foreground">{reply.author_nickname || "Anonymous"}</span>
                              <span>{timeAgo(reply.created_at)}</span>
                            </div>
                            <p className="text-card-foreground">{reply.content}</p>
                            <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-zinc-500 font-mono">
                              <span>❤️ {reply.like_count} likes</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-xs">Chưa có bình luận nào cho bài đăng này.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-40 rounded-xl border border-border border-dashed flex items-center justify-center text-muted-foreground text-xs bg-card">
              Chọn một bài viết để xem chi tiết
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PostsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Đang tải bài viết...</div>}>
      <PostsPageContent />
    </Suspense>
  );
}
