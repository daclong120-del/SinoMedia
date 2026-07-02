# Phase C — Cào bình luận

> Port `get_aweme_comments` / `get_sub_comments` / `get_aweme_all_comments` (client.py) +
> `batch_get_note_comments` / `get_comments` (core.py). **Cần thêm bảng mới** + writer mới.

## Endpoint (chi tiết: `maps/douyin-api-reference.md` mục 5–6)
- Cấp 1: `GET /aweme/v1/web/comment/list/` params `{ aweme_id, cursor:0, count:20, item_type:0 }` → `{ comments, has_more, cursor }`
- Cấp 2: `GET /aweme/v1/web/comment/list/reply/` params `{ comment_id, cursor:0, count:20, item_type:0, item_id:aweme_id }`
- Cả hai **CÓ ký a_bogus** (không phải search) — `douyinGet` mặc định ký. Cần `Referer` search-style.

## 1. Migration DB mới
Tạo `supabase/migrations/<ts>_crawled_comments.sql` (theo mẫu bảng hiện có, RLS đọc công khai + chỉ service_role ghi):
```sql
create table if not exists public.crawled_comments (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null,
  platform_cid  text not null,              -- comment id gốc (cid)
  post_id       uuid references public.crawled_posts(id) on delete cascade,
  platform_post_id text not null,           -- aweme_id (tiện join/log)
  parent_cid    text,                       -- null nếu comment gốc, có giá trị nếu là reply
  author_uid    text,
  author_nickname text,
  content       text,
  like_count    int default 0,
  raw           jsonb,
  published_at  timestamptz,
  crawled_at    timestamptz default now(),
  unique (platform, platform_cid)
);
create index if not exists idx_crawled_comments_post on public.crawled_comments (post_id, crawled_at desc);
alter table public.crawled_comments enable row level security;
drop policy if exists "public read comments" on public.crawled_comments;
create policy "public read comments" on public.crawled_comments for select using (true);
grant select on public.crawled_comments to anon, authenticated;
```
> Áp migration: `npx supabase db push` (hoặc quy trình migration đang dùng trong repo — kiểm tra `supabase/config.toml`).

## 2. Writer — `src/store/supabase_writer.ts`
Thêm `upsertComments(rows)`: POST `crawled_comments` với `on_conflict=platform,platform_cid`, `Prefer: resolution=merge-duplicates`. Map `cid→platform_cid, text→content, digg_count→like_count, create_time→published_at, user.nickname→author_nickname, user.sec_uid→author_uid`. Cần resolve `post_id` (UUID) — hoặc lưu theo `platform_post_id` rồi để trigger/query join, hoặc select post trước để lấy UUID. Đơn giản: lưu `platform_post_id` và để `post_id` null nếu chưa join được.

## 3. Crawl — `src/crawl/douyin.ts`
```
crawlComments(awemeId, { maxCount=50, withReplies=false }):
  let cursor=0, hasMore=1; const out=[];
  while (hasMore && out.length < maxCount) {
    res = await douyinGet("/aweme/v1/web/comment/list/", { aweme_id:awemeId, cursor:String(cursor), count:"20", item_type:"0" }, { referer });
    hasMore = res.has_more ?? 0; cursor = res.cursor ?? 0;
    const comments = res.comments ?? [];
    out.push(...comments);
    if (withReplies) for (c of comments) if (c.reply_comment_total>0) { /* lặp get_sub_comments như client.py */ }
    await sleep(CRAWL_SLEEP_MS);
  }
  await upsertComments(out.slice(0,maxCount).map(mapComment(awemeId)));
```
- Đối chiếu vòng lặp `get_aweme_all_comments` trong client.py (dòng ~253–310) cho đúng điều kiện dừng.

## 4. Tích hợp & CLI
- Thêm flag/lệnh: `comments <aweme_id>` và/hoặc option `--comments` cho `creator`/`search` (mô phỏng `ENABLE_GET_COMMENTS`). Mặc định TẮT để không tốn request.
- CLI mới trong `index.ts` + script `package.json`.

## Tiêu chí hoàn thành
- Migration tạo bảng thành công.
- `npm run comments <aweme_id>` ghi ≥ vài chục comment, chạy lại không trùng.
- (Nếu bật) reply cấp 2 được lấy khi `reply_comment_total > 0`.

## ⚠️ Bẫy
- Có ký a_bogus (khác search). `Referer` search-style là bắt buộc.
- Đặt trần `maxCount` để tránh cào vô hạn video hot.
