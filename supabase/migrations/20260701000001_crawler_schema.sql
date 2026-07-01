-- Schema setup for crawler pipeline (Douyin / TikTok / XHS)
-- This migration creates crawled_authors and crawled_posts tables and sets up RLS

-- Bảng tác giả (tách ra để chuẩn hóa thông tin người sáng tạo)
create table if not exists public.crawled_authors (
  id           uuid primary key default gen_random_uuid(),
  platform     text not null,
  platform_uid text not null,
  nickname     text,
  avatar_url   text,          -- URL avatar đã được crawler tải lên R2
  raw          jsonb,          -- Lưu toàn bộ raw payload phòng khi cần trường mới
  updated_at   timestamptz default now(),
  unique (platform, platform_uid)
);

-- Bảng bài đăng / video cào được
create table if not exists public.crawled_posts (
  id           uuid primary key default gen_random_uuid(),
  platform     text not null,          -- 'douyin' | 'tiktok' | 'xhs'
  platform_id  text not null,          -- ID bài đăng gốc trên nền tảng
  author_id    uuid references public.crawled_authors(id) on delete set null,
  caption      text,
  media_urls   text[] default '{}',    -- Danh sách URL file media đã upload lên R2
  cover_url    text,                   -- URL ảnh bìa đã upload lên R2
  stats        jsonb,                  -- Lưu thống kê lượt tương tác (like, share, view, comment)
  raw          jsonb,                  -- Dữ liệu JSON gốc của bài viết
  crawled_at   timestamptz default now(),
  published_at timestamptz,
  unique (platform, platform_id)       -- Ràng buộc unique để crawler thực hiện upsert chống trùng
);

-- Tạo indexes tối ưu hóa hiệu năng truy vấn feed
create index if not exists idx_crawled_posts_platform_crawled on public.crawled_posts (platform, crawled_at desc);
create index if not exists idx_crawled_posts_author on public.crawled_posts (author_id);

-- Kích hoạt Row Level Security (RLS) bảo mật dữ liệu
alter table public.crawled_posts enable row level security;
alter table public.crawled_authors enable row level security;

-- Thiết lập RLS Policies: Cho phép Anon / Authenticated đọc dữ liệu công khai
drop policy if exists "public read posts" on public.crawled_posts;
create policy "public read posts" on public.crawled_posts
  for select using (true);

drop policy if exists "public read authors" on public.crawled_authors;
create policy "public read authors" on public.crawled_authors
  for select using (true);

-- Cho phép phân quyền truy cập cho anon, authenticated và service_role
grant usage on schema public to anon, authenticated;
grant select on public.crawled_authors to anon, authenticated;
grant select on public.crawled_posts to anon, authenticated;
