# Thiết kế Phase 2: Tối ưu hóa Crawler (Mục 1, 2, 4, 5)

## 1. Mục 1: Đồng bộ TLS Fingerprint & Bổ sung Client Hints

### Vị trí sửa đổi:
* File: `d:\Python\expo-supabase-ai-template\crawler-pipeline\src\crawl\client.ts`

### Chi tiết thay đổi:
Thêm các header Client Hints động dựa trên `activeUserAgent` hiện tại để gửi kèm request HTTP qua `impit`:
```typescript
/**
 * # Sinh các Client Hints động dựa trên User-Agent hiện tại
 */
export function getClientHintsHeaders(): Record<string, string> {
  const ua = getActiveUserAgent();
  const isWin = ua.includes("Windows");
  const isMac = ua.includes("Macintosh");
  const isLinux = ua.includes("Linux") && !ua.includes("Android");
  const isMobile = ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone");

  const chromeVersionMatch = ua.match(/Chrome\/([\d.]+)/);
  const chromeMajor = chromeVersionMatch ? chromeVersionMatch[1].split(".")[0] : "120";

  let platform = '"Windows"';
  if (isMac) platform = '"macOS"';
  else if (isLinux) platform = '"Linux"';
  else if (isMobile) platform = ua.includes("iPhone") ? '"iOS"' : '"Android"';

  return {
    "sec-ch-ua": `"Not_A Brand";v="8", "Chromium";v="${chromeMajor}", "Google Chrome";v="${chromeMajor}"`,
    "sec-ch-ua-mobile": isMobile ? "?1" : "?0",
    "sec-ch-ua-platform": platform,
    "sec-ch-ua-platform-version": isWin ? '"10.0.0"' : '""',
  };
}
```
Và cập nhật headers mặc định trong `douyinRequest`:
```typescript
  const headers = {
    "User-Agent": getActiveUserAgent(),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": "https://www.douyin.com/",
    ...getClientHintsHeaders(), // Thêm các Client Hints động
    "Cookie": cookieStr,
    ...options.headers,
  };
```

---

## 2. Mục 2: Ngăn ngừa rò rỉ RAM (Browser Context Recycle)

### Vị trí sửa đổi:
* File: `d:\Python\expo-supabase-ai-template\crawler-pipeline\src\crawl\client.ts`

### Chi tiết thay đổi:
Tích hợp bộ đếm lượt tải trang (`pageLoadCount`) và tự động đóng/mở lại trình duyệt để thu hồi RAM sau mỗi 50 lượt tải:
```typescript
let pageLoadCount = 0;

export async function incrementPageLoad(): Promise<void> {
  pageLoadCount++;
  if (pageLoadCount >= 50) {
    console.log(`[Recycle] Lượt tải trang đạt ${pageLoadCount}. Đang tái khởi động trình duyệt để tránh rò rỉ RAM...`);
    await closeBrowser();
    pageLoadCount = 0;
  }
}
```
Hàm `closeBrowser()` sẽ đóng context cũ và reset biến global để lượt gọi `getBrowserPage()` tiếp theo khởi chạy lại một instance sạch.

---

## 3. Mục 4: Loại bỏ Hardcoded Sleep khi chờ DOM

### Vị trí sửa đổi:
* File: `d:\Python\expo-supabase-ai-template\crawler-pipeline\src\crawl\client.ts`

### Chi tiết thay đổi:
Thay thế `await new Promise((r) => setTimeout(r, 2000))` bằng cơ chế chờ selector của Playwright với timeout hợp lý (ví dụ: `page.waitForFunction` kiểm tra `RENDER_DATA` hoặc check element):
```typescript
        try {
          await page.goto(`https://www.douyin.com/video/${awemeId}`, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
          
          // Chờ dữ liệu RENDER_DATA sẵn sàng trên DOM thay vì sleep 2s
          await page.waitForFunction(() => {
            const el = document.getElementById("RENDER_DATA");
            return el && el.textContent && el.textContent.trim().length > 0;
          }, { timeout: 10000 }).catch(() => {
            console.log("Timeout chờ RENDER_DATA được điền dữ liệu.");
          });
        }
```

---

## 4. Mục 5: Tối ưu hiệu năng ghi DB (Bulk-Upsert)

### Vị trí sửa đổi 1:
* File: `d:\Python\expo-supabase-ai-template\crawler-pipeline\src\store\supabase_writer.ts`

### Chi tiết thay đổi 1:
Thêm hàm `upsertPosts` cho phép bulk-upsert các bài viết trong một request:
```typescript
/**
 * # Thêm mới hoặc cập nhật danh sách bài đăng/video (Bulk-Upsert)
 */
export async function upsertPosts(posts: CrawledPostRow[]): Promise<void> {
  if (posts.length === 0) return;
  await supabaseRest("crawled_posts", {
    method: "POST",
    params: { on_conflict: "platform,platform_id" },
    body: posts.map((post) => ({
      platform: post.platform,
      platform_id: post.platform_id,
      author_id: post.author_id,
      caption: post.caption,
      media_urls: post.media_urls || [],
      cover_url: post.cover_url,
      stats: post.stats,
      raw: post.raw,
      crawled_at: new Date().toISOString(),
      published_at: post.published_at,
    })),
  });
}
```

### Vị trí sửa đổi 2:
* File: `d:\Python\expo-supabase-ai-template\crawler-pipeline\src\crawl\douyin.ts`

### Chi tiết thay đổi 2:
* Cho phép `persistAweme` nhận `authorUuid?: string` truyền từ ngoài để bỏ qua việc query/upsert author nhiều lần khi cào kênh của cùng một creator.
* Cập nhật `persistAweme` để nó trả về thông tin `CrawledPostRow` thay vì tự ghi DB, hoặc nhận thêm tham số `skipDbWrite?: boolean`.
* Trong `crawlCreator` và `crawlSearch`, gộp các video cào được trong trang và gọi `upsertPosts` một lần duy nhất theo lô (batch) thay vì ghi ghi tuần tự row-by-row.
