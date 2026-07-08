# Embedded Iframe Player Strategy

Trạng thái: **Accepted for Bilibili / Preferred where supported**  
Cập nhật lần cuối: **2026-07-08**  
Phạm vi: Creative Hub media playback, download handoff, crawler metadata contract.

## 1. Quyết định

Với **Bilibili** và các platform có official embedded player ổn định, Dashboard không cần tải video về Cloudflare R2 để phát trong Creative Detail.

Hướng mặc định mới:

```text
Crawler
  -> lấy platform_uid / canonical_url / cover_url / metadata
  -> lưu vào Supabase normalized tables
  -> Dashboard render official iframe player
  -> Nút tải/mở nguồn đưa người dùng tới đường dẫn gốc
```

R2 không còn là điều kiện bắt buộc để xem video Bilibili trên Dashboard.

## 2. Vì sao đổi hướng

Luồng cũ cố gắng lấy direct CDN video URL, proxy qua Next server hoặc upload lên R2. Với Bilibili, cách đó có nhiều lỗi:

- CDN Bilibili chặn hotlink/CORS/Referer khi dùng `<video src="...">` từ origin khác.
- Direct media URL có thể hết hạn hoặc phụ thuộc cookie/token/CDN policy.
- Upload file lớn lên R2 dễ lỗi trong môi trường local/Windows/sandbox.
- Crawler chậm và tốn băng thông vì phải tải binary video thay vì chỉ lấy metadata.
- Dashboard phải xử lý nhiều trạng thái media không ổn định trong khi Bilibili đã có player chính thức.

Official iframe player giải quyết đúng bài toán:

- Browser tải player từ `player.bilibili.com`.
- Bilibili tự xử lý stream URL, Referer, chất lượng, token và CDN.
- Dashboard không cần biết direct MP4/DASH/HLS URL.
- Crawler nhẹ hơn: chỉ lấy thông tin định danh và hiển thị.

## 3. Data contract mới cho Bilibili

Với Bilibili video, crawler cần ưu tiên lưu các field sau:

| Field | Bắt buộc | Vai trò |
|---|---:|---|
| `platform` | Có | `bilibili` |
| `platform_uid` | Có | BVID, ví dụ `BV...`; dùng build iframe URL. |
| `canonical_url` hoặc equivalent | Nên có | Link video gốc trên Bilibili để mở/tải theo nguồn. |
| `cover_url` | Có | Thumbnail/card preview. |
| `title` / `caption` | Có | UI/search. |
| `published_at` / stats | Nên có | Sort/filter/analytics. |
| `media_type` | Có | `video`. |
| `media_source` | Có | `embed` hoặc `original`, không phải `r2` mặc định. |
| `media_status` | Có | `embed_available` hoặc `original_only` tùy schema hiện tại. |

Nếu schema hiện tại chưa có `canonical_url`, có thể tạm dùng một trong các field sẵn có:

- `original_media_urls[0] = https://www.bilibili.com/video/<BVID>`
- hoặc `media_urls[0] = https://www.bilibili.com/video/<BVID>`

Không lưu direct CDN URL làm nguồn phát chính cho Bilibili nếu có BVID.

## 4. Iframe render contract

Dashboard build iframe bằng BVID:

```tsx
const embedUrl =
  `https://player.bilibili.com/player.html?bvid=${creative.platform_uid}&high_quality=1&as_wide=1&autoplay=0`;
```

Render rule:

```text
if creative.platform == "bilibili" and platform_uid exists:
  render <iframe src={embedUrl}>
else if media_type == "video" and media_urls[0] is direct playable URL:
  render <video>
else if image/carousel:
  render image/gallery
else:
  render empty/failed state
```

Không cần gọi `/api/video/proxy` cho Bilibili iframe.

## 5. Download / open-source behavior

Với hướng embedded player, nút “Tải video” không nên giả vờ tải binary từ R2 nếu hệ thống không còn lưu file.

Hành vi đề xuất:

| Button | Hành vi |
|---|---|
| `Mở trên Bilibili` | Mở `https://www.bilibili.com/video/<BVID>` trong tab mới. |
| `Sao chép link` | Copy canonical URL. |
| `Tải video` | Nếu chưa có downloader service thật, trỏ tới canonical URL hoặc đổi nhãn thành `Mở nguồn`. |
| `Tải về máy` | Chỉ bật khi có local/remote downloader worker riêng. |

Nếu user muốn tải file thật về desktop sau này, đó là trách nhiệm của **video downloader service**, không phải Creative Detail tự tải và không phải R2 cache mặc định.

## 6. R2 còn dùng khi nào

R2 chuyển từ “đường phát bắt buộc” thành “archive/cache tùy chọn”.

Nên dùng R2 khi:

- Cần lưu media lâu dài để report/export/offline.
- Platform không có official embed.
- Link gốc chết nhanh hoặc không cho share.
- Người dùng chủ động chọn archive/cache.
- Downloader worker đã tải và verify file thành công.

Không nên dùng R2 mặc định cho:

- Bilibili playback trong Dashboard.
- Các platform có official iframe hoạt động ổn định.
- Giai đoạn crawler metadata/search khi chỉ cần xem nhanh và mở nguồn.

## 7. Crawler task metadata

Đề xuất đổi default cho Bilibili:

```json
{
  "upload_r2": false,
  "media_strategy": "embed"
}
```

Ý nghĩa:

- `upload_r2: false`: không tải binary video lên R2 trong task crawl mặc định.
- `media_strategy: "embed"`: crawler phải lưu đủ định danh để Dashboard render iframe.
- Nếu user cần archive, tạo flow riêng như `download_media`/downloader worker sau này.

## 8. Migration notes

Nếu dữ liệu cũ có Bilibili direct CDN URL trong `media_urls`, không cần xóa ngay. Nhưng Dashboard nên ưu tiên iframe khi `platform = bilibili` và có `platform_uid`.

Backfill gợi ý:

```sql
UPDATE public.crawled_posts
SET
  media_type = 'video',
  media_source = 'original',
  media_status = 'original_only',
  original_media_urls = COALESCE(
    original_media_urls,
    ARRAY['https://www.bilibili.com/video/' || platform_id]
  )
WHERE platform = 'bilibili'
  AND platform_id IS NOT NULL;
```

Nếu sau này thêm enum/status mới, cân nhắc:

- `media_source = 'embed'`
- `media_status = 'embed_available'`

## 9. Definition of Done

- Bilibili Creative Detail render iframe khi có BVID.
- Crawler Bilibili không cần upload R2 để video xem được.
- Card/list vẫn có thumbnail từ `cover_url`.
- Nút download không hứa tải file nếu chưa có downloader thật.
- Docs/status ghi rõ R2 là optional archive, không phải playback path mặc định.
- Agent không tạo lại `cache_media` hoặc ép Bilibili direct CDN URL vào `<video>`.
