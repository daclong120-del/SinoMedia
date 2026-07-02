# Phase 0 — Refactor nền tảng dùng chung (BẮT BUỘC làm trước)

## Vấn đề
Toàn bộ logic (build common params → ký a_bogus → gọi request) và (parse aweme → download → upload R2 → upsert Supabase) hiện **kẹt cứng bên trong `crawlVideo`** ở `src/crawl/douyin.ts`. Nếu không tách, creator/search/comments sẽ copy-paste hàng trăm dòng.

## Việc cần làm

### 1. `douyinGet(uri, extraParams, opts)` — client Douyin dùng chung
Tạo trong `src/crawl/douyin_client.ts` (hoặc bổ sung `client.ts`).

```ts
// opts: { sign?: boolean (default true), referer?: string, dropOrigin?: boolean }
export async function douyinGet(
  uri: string,
  extraParams: Record<string, string>,
  opts: { sign?: boolean; referer?: string } = {}
): Promise<any> {
  const session = await loadSession();
  if (!session) throw new Error("Chưa có session, chạy bootstrap trước.");

  const params = { ...COMMON_PARAMS(session.msToken), ...extraParams };
  const queryString = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  // Search KHÔNG ký a_bogus (xem map mục "Ký a_bogus")
  const sign = opts.sign !== false && !uri.includes("/v1/web/general/search");
  const finalUrl = sign
    ? `https://www.douyin.com${uri}?${queryString}&a_bogus=${signDetail(queryString, DEFAULT_USER_AGENT)}`
    : `https://www.douyin.com${uri}?${queryString}`;

  return douyinRequest(finalUrl, opts.referer ? { headers: { Referer: opts.referer } } : {});
}
```
- Đưa `COMMON_PARAMS`, `DEFAULT_USER_AGENT`, `getWebId()` ra chỗ export chung (hiện `getWebId` + `DEFAULT_USER_AGENT` nằm trong `douyin.ts`).
- `douyinRequest` (`client.ts`) đã hỗ trợ `options.headers` → chỉ cần truyền `Referer`.

### 2. `persistAweme(awemeItem)` — lưu 1 video (tách khỏi `crawlVideo`)
Trích nguyên khối "author → avatar → video/cover/images → upsertPost" trong `crawlVideo` (dòng ~128–200 của `douyin.ts`) thành hàm tái dùng:

```ts
export async function persistAweme(detail: any): Promise<void> {
  // ... y hệt logic hiện có trong crawlVideo, nhận `detail` thay vì tự fetch ...
  // upsertAuthor(...) → upsertPost({ platform: "douyin", platform_id: detail.aweme_id, ... })
}
```
Sau đó `crawlVideo(urlOrId)` chỉ còn: resolve URL → `extractAwemeId` → `douyinGet("/aweme/v1/web/aweme/detail/", { aweme_id })` → `persistAweme(res.aweme_detail)`.

### 3. Helper nhịp độ
`export const sleep = (ms) => new Promise(r => setTimeout(r, ms));` và một hằng `CRAWL_SLEEP_MS` (mặc định ~1500ms) để chèn giữa request/trang.

## Tiêu chí hoàn thành
- `crawlVideo` cũ vẫn chạy đúng như trước (`npm run crawl <id>` → 1 dòng Supabase + media R2) nhưng nay gọi qua `douyinGet` + `persistAweme`.
- Không còn params/sign lặp lại; creator/search/comments chỉ việc gọi `douyinGet`.

## ⚠️ Bẫy
- Giữ nguyên thứ tự param khi build query string (sign nhạy cảm với chuỗi query). Đừng sort lại keys.
- `msToken` lấy từ `session.msToken` (Python lấy từ `localStorage.xmst` lúc sign — đã được `bootstrapSession` lưu vào session).
