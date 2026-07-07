# Creative Media Refactor Plan

Trạng thái: **Draft / Implementation Guide**  
Ngày tạo: **2026-07-07**  
Phạm vi: `dashboard`, `crawler-pipeline`, `supabase`, Cloudflare R2.

Tài liệu này hướng dẫn refactor luồng media của Creative Hub để sửa lỗi video không play, giảm phụ thuộc upload R2 ngay lập tức, nhưng vẫn giữ khả năng lưu trữ ổn định khi cần.

## 1. Vấn đề hiện tại

### 1.1 Lỗi video detail không play

Ví dụ row `post_bili_1` hiện có:

```json
{
  "cover_url": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400",
  "media_urls": [
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800"
  ]
}
```

Trong `dashboard/lib/services/creative.service.ts`, mapper đang suy luận:

```ts
media_type: row.cover_url ? "video" : "image"
```

Như vậy chỉ cần có `cover_url` là UI coi creative là video. `CreativeDetailView` sau đó render:

```tsx
<video src={creative.media_urls[0]} poster={creative.cover_url} />
```

Nếu `media_urls[0]` thật ra là ảnh, browser sẽ cố play ảnh như video và player không chạy.

### 1.2 Media URL contract chưa rõ

Bảng `crawled_posts` hiện có:

```sql
cover_url text,
media_urls text[]
```

Nhưng chưa phân biệt:

- URL gốc từ platform.
- URL đã cache qua R2.
- URL thumbnail/poster.
- Loại media thật: `video`, `image`, `carousel`.
- Trạng thái media: còn sống, expired, upload failed, cached.

Kết quả là Dashboard phải đoán, còn crawler có platform thì upload R2, có platform thì giữ URL gốc, làm behavior không thống nhất.

## 2. Mục tiêu refactor

1. Dashboard không đoán `media_type` từ `cover_url`.
2. Detail player chỉ render `<video>` khi có video URL thật.
3. Cho phép dùng URL gốc để tiết kiệm R2 ở giai đoạn MVP/dev.
4. Vẫn có đường cache sang R2 cho creative quan trọng hoặc khi URL gốc chết.
5. Giữ kiến trúc chuẩn: Dashboard đọc qua `Service -> Repository`, crawler ghi qua store layer.
6. Không query raw platform tables trực tiếp từ UI.

## 3. Quyết định kiến trúc đề xuất

Dùng mô hình hybrid:

```text
Crawler extracts original media URLs
  -> Normalize into crawled_posts
  -> Store original URLs + media metadata
  -> Optionally cache to R2
  -> Dashboard prefers cached URL, falls back to original URL
```

Nguyên tắc:

- `original_media_urls`: nguồn gốc từ platform, có thể hết hạn.
- `media_urls`: URL Dashboard dùng để render, ưu tiên URL stable như R2.
- `cover_url`: thumbnail/poster render nhanh.
- `media_type`: loại media thật, không suy luận từ cover.
- `media_status`: trạng thái khả dụng của media.
- `media_source`: media hiện đang lấy từ đâu.

## 4. Schema migration

Tạo migration mới trong `supabase/migrations/`, ví dụ:

```text
20260707000001_creative_media_contract.sql
```

Nội dung đề xuất:

```sql
ALTER TABLE public.crawled_posts
ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'image',
ADD COLUMN IF NOT EXISTS original_media_urls text[],
ADD COLUMN IF NOT EXISTS original_cover_url text,
ADD COLUMN IF NOT EXISTS media_status text DEFAULT 'original_only',
ADD COLUMN IF NOT EXISTS media_source text DEFAULT 'original',
ADD COLUMN IF NOT EXISTS media_error text,
ADD COLUMN IF NOT EXISTS media_cached_at timestamp with time zone;

ALTER TABLE public.crawled_posts
DROP CONSTRAINT IF EXISTS crawled_posts_media_type_check;

ALTER TABLE public.crawled_posts
ADD CONSTRAINT crawled_posts_media_type_check
CHECK (media_type IN ('video', 'image', 'carousel', 'unknown'));

ALTER TABLE public.crawled_posts
DROP CONSTRAINT IF EXISTS crawled_posts_media_status_check;

ALTER TABLE public.crawled_posts
ADD CONSTRAINT crawled_posts_media_status_check
CHECK (media_status IN ('original_only', 'cached', 'failed', 'expired', 'unavailable'));

ALTER TABLE public.crawled_posts
DROP CONSTRAINT IF EXISTS crawled_posts_media_source_check;

ALTER TABLE public.crawled_posts
ADD CONSTRAINT crawled_posts_media_source_check
CHECK (media_source IN ('original', 'r2', 'mixed', 'none'));
```

Backfill tối thiểu:

```sql
UPDATE public.crawled_posts
SET
  original_media_urls = COALESCE(original_media_urls, media_urls),
  original_cover_url = COALESCE(original_cover_url, cover_url),
  media_type = CASE
    WHEN media_urls IS NULL OR array_length(media_urls, 1) IS NULL THEN 'unknown'
    WHEN media_urls[1] ~* '\.(mp4|webm|mov|m3u8)(\?|$)' THEN 'video'
    WHEN array_length(media_urls, 1) > 1 THEN 'carousel'
    ELSE 'image'
  END,
  media_source = CASE
    WHEN media_urls IS NULL OR array_length(media_urls, 1) IS NULL THEN 'none'
    WHEN media_urls[1] LIKE '%r2%' THEN 'r2'
    ELSE 'original'
  END,
  media_status = CASE
    WHEN media_urls IS NULL OR array_length(media_urls, 1) IS NULL THEN 'unavailable'
    WHEN media_urls[1] LIKE '%r2%' THEN 'cached'
    ELSE 'original_only'
  END
WHERE media_type IS NULL
   OR original_media_urls IS NULL
   OR media_status IS NULL
   OR media_source IS NULL;
```

Sau migration, regenerate Supabase types:

```powershell
cd D:\Python\SinoMedia\dashboard
npx.cmd supabase gen types typescript --local > types\supabase.ts
```

Nếu bạn dùng remote:

```powershell
npx.cmd supabase gen types typescript --project-id <project-id> > types\supabase.ts
```

## 5. Type updates

File cần kiểm tra:

- `dashboard/types/supabase.ts`
- `dashboard/types/index.ts`
- `dashboard/lib/repositories/types.ts`
- `crawler-pipeline/src/model/storage.ts`

Trong domain type `CreativeAd`, thêm hoặc đảm bảo có:

```ts
media_type: "video" | "image" | "carousel" | "unknown";
media_urls: string[];
cover_url: string;
original_media_urls?: string[];
original_cover_url?: string;
media_status?: "original_only" | "cached" | "failed" | "expired" | "unavailable";
media_source?: "original" | "r2" | "mixed" | "none";
media_error?: string | null;
```

Trong crawler storage model `CrawledPostRow`, thêm cùng các field tương ứng.

## 6. Dashboard service refactor

Trước khi sửa, chạy impact:

```text
impact({ repo: "SinoMedia", target: "mapPostToCreativeAd", direction: "upstream" })
impact({ repo: "SinoMedia", target: "CreativeDetailView", direction: "upstream" })
impact({ repo: "SinoMedia", target: "CreativeCard", direction: "upstream" })
```

### 6.1 Sửa `mapPostToCreativeAd`

File:

```text
dashboard/lib/services/creative.service.ts
```

Không dùng:

```ts
media_type: row.cover_url ? "video" : "image"
```

Thay bằng helper:

```ts
function inferMediaType(row: TableRow<"crawled_posts">): CreativeAd["media_type"] {
  const explicit = row.media_type;
  if (explicit === "video" || explicit === "image" || explicit === "carousel" || explicit === "unknown") {
    return explicit;
  }

  const urls = Array.isArray(row.media_urls) ? row.media_urls : [];
  const firstUrl = urls[0] ?? "";

  if (/\.(mp4|webm|mov|m3u8)(\?|$)/i.test(firstUrl)) return "video";
  if (urls.length > 1) return "carousel";
  if (firstUrl || row.cover_url) return "image";
  return "unknown";
}
```

Mapper nên trả:

```ts
const mediaUrls = Array.isArray(row.media_urls) ? row.media_urls : [];

return {
  ...
  media_type: inferMediaType(row),
  media_urls: mediaUrls,
  cover_url: row.cover_url || row.original_cover_url || "",
  original_media_urls: Array.isArray(row.original_media_urls) ? row.original_media_urls : mediaUrls,
  original_cover_url: row.original_cover_url || row.cover_url || "",
  media_status: row.media_status || "unknown",
  media_source: row.media_source || "original",
  media_error: row.media_error || null,
};
```

Nếu generated type chưa có column mới, regenerate types trước hoặc dùng migration/types trong cùng PR.

### 6.2 Sửa `CreativeDetailView`

File:

```text
dashboard/components/dashboard/CreativeDetailView.tsx
```

Tạo derived values gần `renderContent`:

```ts
const primaryMediaUrl = creative.media_urls?.[0] || "";
const canRenderVideo = creative.media_type === "video" && primaryMediaUrl;
const canRenderImage =
  (creative.media_type === "image" || creative.media_type === "carousel") &&
  (primaryMediaUrl || creative.cover_url);
```

Render rule:

- Nếu `canRenderVideo`, render `<video>`.
- Nếu `canRenderImage`, render `<img>`.
- Nếu `media_status` là `expired` hoặc `failed`, hiện warning.
- Nếu không có media, hiện placeholder.

Cho video:

```tsx
<video
  ref={videoRef}
  src={primaryMediaUrl}
  poster={creative.cover_url}
  controls
  playsInline
  preload="metadata"
  onError={() => {
    console.warn("Video failed to load", primaryMediaUrl);
  }}
/>
```

Không nên auto play có âm thanh:

```ts
videoRef.current.muted = false;
videoRef.current.play()
```

Browser thường block autoplay có audio. Để user bấm play sẽ ổn hơn. Nếu muốn autoplay preview, chỉ autoplay khi `muted`.

### 6.3 Sửa `CreativeCard`

File:

```text
dashboard/components/dashboard/CreativeCard.tsx
```

Rule:

- Card preview video chỉ dùng `<video>` nếu `creative.media_type === "video"` và URL có vẻ là video.
- Nếu không, dùng `cover_url` hoặc image URL.
- Nếu `mediaError`, fallback placeholder.

Không nên render video preview với URL ảnh.

## 7. Crawler refactor

Trước khi sửa, chạy impact theo platform bạn đụng:

```text
impact({ repo: "SinoMedia", target: "upsertPost", direction: "upstream" })
impact({ repo: "SinoMedia", target: "persistAweme", direction: "upstream" })
impact({ repo: "SinoMedia", target: "persistPost", direction: "upstream" })
```

Vì có nhiều `persistPost`, dùng `file_path` để disambiguate:

```text
impact({
  repo: "SinoMedia",
  target: "persistPost",
  file_path: "crawler-pipeline/src/crawl/xhs/core.ts",
  direction: "upstream"
})
```

### 7.1 Store layer

File:

```text
crawler-pipeline/src/store/supabase_writer.ts
```

`upsertPost` và `upsertPosts` phải ghi thêm:

```ts
media_type: post.media_type || "unknown",
original_media_urls: post.original_media_urls || post.media_urls || [],
original_cover_url: post.original_cover_url || post.cover_url,
media_status: post.media_status || "original_only",
media_source: post.media_source || "original",
media_error: post.media_error,
media_cached_at: post.media_cached_at,
```

### 7.2 Platform crawler contract

Mỗi platform nên normalize theo contract:

```ts
const postRow: CrawledPostRow = {
  ...
  media_type: "video",
  original_media_urls: [originalVideoUrl],
  original_cover_url: originalCoverUrl,
  media_urls: shouldUploadR2 ? [r2VideoUrl] : [originalVideoUrl],
  cover_url: shouldUploadR2 ? r2CoverUrl : originalCoverUrl,
  media_source: shouldUploadR2 ? "r2" : "original",
  media_status: shouldUploadR2 ? "cached" : "original_only",
};
```

Nếu upload R2 fail:

```ts
media_urls: [originalVideoUrl],
cover_url: originalCoverUrl,
media_source: "original",
media_status: "failed",
media_error: errorMessage,
```

Nếu không có video URL thật:

```ts
media_type: "image",
media_urls: imageUrls,
cover_url: imageUrls[0] || coverUrl,
```

### 7.3 R2 upload mode

Hiện `queue_worker.ts` có:

```ts
process.env.ENABLE_UPLOAD_R2 = String(task.metadata?.upload_r2 ?? true);
```

Giữ cơ chế này, nhưng định nghĩa rõ:

- `upload_r2: true`: cache media ngay khi crawl.
- `upload_r2: false`: chỉ lưu original URL.
- `upload_r2: "on_demand"`: lưu original URL trước, cache khi user mở detail hoặc đánh dấu.

Nếu chưa làm on-demand ngay, chỉ cần hỗ trợ `true/false` sạch trước.

## 8. On-demand cache giai đoạn sau

Đây là phase 2, không cần làm ngay.

Flow đề xuất:

```text
User opens CreativeDetailView
  -> media_status = original_only
  -> UI tries original URL
  -> if play fails or user clicks "Cache media"
  -> Server Action creates cache task
  -> Worker downloads original URL and uploads R2
  -> Update crawled_posts.media_urls, media_status = cached
```

Không download media lớn trực tiếp trong Next.js request nếu tránh được. Hãy tạo task cho worker.

Server action có thể là:

```text
dashboard/lib/actions/media.actions.ts
```

Mutation path:

```text
Client button -> Server Action -> TaskRepository.createBulk -> worker -> SupabaseWriter
```

## 9. Backfill data hiện tại

Với dữ liệu demo như Unsplash, chạy SQL để tránh UI coi ảnh là video:

```sql
UPDATE public.crawled_posts
SET media_type = 'image'
WHERE media_urls IS NOT NULL
  AND array_length(media_urls, 1) > 0
  AND media_urls[1] ~* 'images\.unsplash\.com';
```

Với row có URL file video:

```sql
UPDATE public.crawled_posts
SET media_type = 'video'
WHERE media_urls IS NOT NULL
  AND array_length(media_urls, 1) > 0
  AND media_urls[1] ~* '\.(mp4|webm|mov|m3u8)(\?|$)';
```

Với nhiều ảnh:

```sql
UPDATE public.crawled_posts
SET media_type = 'carousel'
WHERE media_urls IS NOT NULL
  AND array_length(media_urls, 1) > 1
  AND media_type IS DISTINCT FROM 'video';
```

## 10. Manual QA checklist

### 10.1 Dashboard Search

Open:

```text
http://localhost:3000/dash/creative/search
```

Check:

- Cards có ảnh thì render ảnh, không hiện video player giả.
- Cards có video thật thì hover preview được hoặc fallback thumbnail nếu browser block.
- Không còn `Rendering...` loop.

### 10.2 Creative Detail

Open detail của:

- Một image creative.
- Một video creative có URL MP4/WebM/R2.
- Một creative không có media.
- Một creative có `media_status = failed`.

Expected:

- Image creative dùng `<img>`.
- Video creative dùng `<video>`.
- URL ảnh không bị đưa vào `<video>`.
- Media failed có warning rõ, không im lặng.

### 10.3 Crawler

Tạo task với:

```json
{
  "upload_r2": false
}
```

Expected:

- `original_media_urls` có link gốc.
- `media_urls` có link gốc.
- `media_source = original`.
- `media_status = original_only`.

Tạo task với:

```json
{
  "upload_r2": true
}
```

Expected:

- `original_media_urls` giữ link gốc.
- `media_urls` là R2 URL hoặc path public.
- `media_source = r2`.
- `media_status = cached`.

## 11. Validation commands

Dashboard:

```powershell
cd D:\Python\SinoMedia\dashboard
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Crawler:

```powershell
cd D:\Python\SinoMedia\crawler-pipeline
npx.cmd tsc --noEmit
npm.cmd test
```

GitNexus:

```text
detect_changes({ repo: "SinoMedia", scope: "all" })
```

Nếu sắp commit:

```text
detect_changes({ repo: "SinoMedia", scope: "compare", base_ref: "main" })
```

## 12. Suggested implementation order

1. Add Supabase migration for media contract.
2. Regenerate dashboard Supabase types.
3. Update domain/storage types.
4. Fix `mapPostToCreativeAd` so media type is explicit.
5. Fix `CreativeDetailView` render rules.
6. Fix `CreativeCard` preview rules.
7. Update `SupabaseWriter`.
8. Update one platform crawler first, preferably Bilibili or Douyin.
9. Backfill existing rows.
10. Run validation commands.
11. Repeat platform crawler updates one by one.

## 13. Definition of Done

Refactor hoàn tất khi:

- `crawled_posts.media_type` tồn tại và được crawler ghi đúng.
- Dashboard không suy luận video từ `cover_url`.
- Detail không render `<video>` cho URL ảnh.
- `original_media_urls` được giữ lại để debug và fallback.
- `media_urls` là URL Dashboard ưu tiên render.
- R2 upload có thể bật/tắt qua task metadata.
- Existing demo rows không còn bị coi nhầm là video.
- `tsc`, `lint`, `build` pass cho Dashboard.
- Crawler typecheck/test pass.
- GitNexus `detect_changes` chỉ báo các flow/media symbols mong đợi.

## 14. Khi nào vẫn nên dùng R2

Dùng original URL giúp tiết kiệm nhanh, nhưng không đủ bền cho production vì:

- URL gốc có thể hết hạn.
- Một số CDN chặn hotlink.
- Một số platform cần cookie, referer, hoặc chữ ký.
- Video có thể là HLS/DASH hoặc split audio/video.
- Platform có thể đổi URL bất cứ lúc nào.

Vì vậy R2 nên là cache/stable storage cho:

- Creative quan trọng.
- Creative đã được user mở detail.
- Creative dùng trong report/export.
- Media có original URL hay chết.
- Media cần giữ lâu dài.

Không cần upload mọi thứ lên R2 ngay từ đầu. Hãy dùng R2 có chọn lọc.
