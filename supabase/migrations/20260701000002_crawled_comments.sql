-- Schema setup for crawled comments (Douyin / TikTok / XHS)
-- This migration creates crawled_comments table and sets up RLS

create table if not exists public.crawled_comments (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null,
  platform_cid  text not null,              -- ID binh luan goc tren nen tang (cid)
  post_id       uuid references public.crawled_posts(id) on delete cascade,
  platform_post_id text not null,           -- ID bai dang goc (aweme_id)
  parent_cid    text,                       -- ID binh luan cha (neu la binh luan con/reply)
  author_uid    text,                       -- ID nguoi viet binh luan
  author_nickname text,                     -- Ten nguoi viet binh luan
  content       text,                       -- Noi dung binh luan
  like_count    int default 0,              -- So luot thich binh luan
  raw           jsonb,                      -- Du lieu raw cua comment
  published_at  timestamptz,
  crawled_at    timestamptz default now(),
  unique (platform, platform_cid)
);

create index if not exists idx_crawled_comments_post on public.crawled_comments (post_id, crawled_at desc);

alter table public.crawled_comments enable row level security;

drop policy if exists "public read comments" on public.crawled_comments;
create policy "public read comments" on public.crawled_comments 
  for select using (true);

grant select on public.crawled_comments to anon, authenticated;
