# Phase 6 — App Expo Hiển Thị Nội Dung Đã Cào

## Mục tiêu
App Expo hiện tại đọc bảng `crawled_posts` từ Supabase và hiển thị (danh sách + chi tiết), render media từ R2.

## Điểm tích hợp có sẵn
- Supabase client đã cấu hình: [lib/supabase.ts](../../../lib/supabase.ts) — tái dùng, KHÔNG tạo client mới.
- Routing file-based (Expo Router v6) trong [src/app/](../../../src/app/). Các tab hiện có: `(tabs)/index.tsx`, `openai.tsx`, `account.tsx`.
- Style: NativeWind (Tailwind), theo pattern card sẵn có.

## Việc cần làm

### 1. Data layer
Tạo `src/utils/crawledPosts.ts` (hoặc trong `lib/`):
```ts
import { supabase } from "@/lib/supabase";

export async function fetchCrawledPosts({ platform, page = 0, size = 20 }) {
  let q = supabase
    .from("crawled_posts")
    .select("id, platform, platform_id, caption, media_urls, cover_url, stats, published_at")
    .order("crawled_at", { ascending: false })
    .range(page * size, page * size + size - 1);
  if (platform) q = q.eq("platform", platform);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
```
> App dùng **anon key** → chỉ SELECT được (đúng theo RLS ở Phase 2). Không ghi được — đúng thiết kế.

### 2. Màn hình danh sách
- Thêm tab mới hoặc màn hình `src/app/(tabs)/feed.tsx` (đăng ký trong `(tabs)/_layout.tsx`).
- `FlatList` render card: `cover_url` (ảnh từ R2), `caption`, `stats`.
- Infinite scroll: tăng `page` khi cuộn tới đáy (`onEndReached`).

### 3. Màn hình chi tiết
- Route động `src/app/post/[id].tsx`.
- Render `media_urls` (ảnh/video từ R2). Video dùng `expo-av`/`expo-video`.

### 4. Media từ R2
- Nếu bucket R2 public → `<Image source={{ uri: url }} />` dùng trực tiếp.
- Nếu private → cần signed URL; tạo Supabase Edge Function trả signed URL (tham khảo pattern `supabase/functions/openai`).

## Tiêu chí hoàn thành
- Tab feed hiển thị danh sách bài đã cào, phân trang mượt.
- Bấm vào xem chi tiết + media render được từ R2.
- Không lỗi RLS (chỉ đọc, đúng quyền anon).

## Câu hỏi mở
- Feed công khai cho mọi người hay chỉ user đã đăng nhập? → khớp với quyết định RLS ở Phase 2.
- Có cần filter theo platform/tác giả/hashtag ngay từ đầu không?
