# Phase 2 — Schema Supabase Cho Dữ Liệu Cào

## Mục tiêu
Tạo bảng lưu dữ liệu cào trong cùng Supabase Postgres mà app Expo đang dùng, để app đọc trực tiếp. Chống trùng, bảo mật bằng RLS.

## Vị trí
Thêm file migration mới trong `supabase/migrations/`, đặt tên theo convention sẵn có:
`supabase/migrations/<timestamp>_crawler_schema.sql`
(tham chiếu file có sẵn: `20241011000001_initial_schema.sql`)

## Schema đề xuất

```sql
-- Bảng tác giả (tùy chọn, tách ra để chuẩn hóa)
create table if not exists crawled_authors (
  id           uuid primary key default gen_random_uuid(),
  platform     text not null,
  platform_uid text not null,
  nickname     text,
  avatar_url   text,          -- URL avatar đã lên R2
  raw          jsonb,
  updated_at   timestamptz default now(),
  unique (platform, platform_uid)
);

-- Bảng bài đăng/video
create table if not exists crawled_posts (
  id           uuid primary key default gen_random_uuid(),
  platform     text not null,          -- 'douyin' | 'tiktok' | 'xhs'
  platform_id  text not null,          -- id gốc trên nền tảng
  author_id    uuid references crawled_authors(id) on delete set null,
  caption      text,
  media_urls   text[] default '{}',    -- URL file đã upload lên R2
  cover_url    text,
  stats        jsonb,                  -- like/comment/share/view
  raw          jsonb,                  -- data thô, phòng khi cần field mới
  crawled_at   timestamptz default now(),
  published_at timestamptz,
  unique (platform, platform_id)       -- upsert chống trùng theo cặp này
);

create index if not exists idx_crawled_posts_platform on crawled_posts (platform, crawled_at desc);
create index if not exists idx_crawled_posts_author on crawled_posts (author_id);
```

## RLS (bắt buộc)
App Expo dùng **anon key** → phải chặn anon ghi, chỉ cho đọc. Crawler dùng **service_role key** → bypass RLS nên ghi được.

```sql
alter table crawled_posts   enable row level security;
alter table crawled_authors enable row level security;

-- Đọc công khai (hoặc đổi thành 'authenticated' nếu chỉ user đăng nhập được xem)
create policy "public read posts"   on crawled_posts   for select using (true);
create policy "public read authors" on crawled_authors for select using (true);

-- KHÔNG tạo policy insert/update/delete cho anon.
-- service_role bypass RLS nên crawler vẫn ghi được bình thường.
```

## Cloudflare R2
- Xác nhận/ tạo bucket chứa media (đọc `R2_BUCKET_NAME`).
- Quyết định cấu trúc key: `{platform}/{platform_id}/{filename}` để dễ dedup và quản lý.
- Nếu muốn app hiển thị ảnh trực tiếp: bật public access cho bucket hoặc dùng domain R2 public / signed URL.

## Áp dụng migration
```bash
# local
supabase db reset            # hoặc
supabase migration up
# remote
supabase db push
```

## Tiêu chí hoàn thành
- Migration chạy được, tạo đủ 2 bảng + index + RLS.
- Anon key KHÔNG ghi được; service_role ghi được.
- Bucket R2 sẵn sàng nhận media.

## Câu hỏi mở
- Nội dung cào cho **công khai** hay chỉ **user đăng nhập** xem? → quyết định policy `using (true)` vs `using (auth.role() = 'authenticated')`.
