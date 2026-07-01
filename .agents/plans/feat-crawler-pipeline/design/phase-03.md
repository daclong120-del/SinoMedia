# Phase 3 — Khung Crawler + Sign Service (CloakBrowser)

## Mục tiêu
Dựng bộ khung crawler bằng TypeScript trong repo `socialpeta-crawl` (độc lập với repo Expo) và Sign Service dùng CloakBrowser để: login, lấy cookie/msToken, và trích/sinh chữ ký JS.

## Quyết định đã chốt
1. **Vị trí repo**: Sử dụng repo `D:\Python\socialpeta-crawl` đã có sẵn.
2. **Ngôn ngữ**: Viết bằng **TypeScript (Node.js)** để tận dụng cấu hình `tsconfig.json`, `tsx` và các dependency sẵn có trong repo.

## Cấu trúc thư mục đề xuất dưới `src/crawler-pipeline/`
```
src/crawler-pipeline/
├── config.ts                # đọc env: SUPABASE_*, R2_*, PROXY, ACCOUNTS
├── sign/
│   ├── browser_sign.ts      # Sign Service dùng CloakBrowser (chạy ít để lấy session)
│   └── js_sign.ts           # tính toán chữ ký a_bogus bằng VM/JS engine (nhẹ, chạy nhiều)
├── crawl/
│   ├── client.ts            # Http client (impersonate chrome headers)
│   ├── douyin.ts            # logic cào danh sách video
│   └── models.ts            # interface Post/Author
├── store/
│   ├── supabase_writer.ts   # upsert dữ liệu vào Supabase REST API
│   └── r2_uploader.py       # upload media lên R2 (sử dụng AWS SDK S3 client)
└── index.ts                 # orchestrator chính
```

## Dependencies bổ sung
```json
"dependencies": {
  "cloakbrowser": "^1.0.0",
  "playwright-core": "^1.53.0"
}
```

## Sign Service — logic TypeScript (src/crawler-pipeline/sign/browser_sign.ts)

```typescript
import { launchPersistentContext } from 'cloakbrowser';

export async function bootstrapSession(account: { profileDir: string }, proxy: string) {
  const browserContext = await launchPersistentContext({
    userDataDir: account.profileDir,
    headless: true,          // VPS 2GB: ưu tiên True; đổi False nếu cần scan QR code
    proxy: proxy,            // residential proxy
    geoip: true,
    humanize: true,
  });

  try {
    const page = browserContext.pages()[0] || await browserContext.newPage();

    // Chặn tải tài nguyên nặng để tiết kiệm RAM (Cực kỳ quan trọng trên VPS 2GB)
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "media", "font", "stylesheet"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Điều hướng đến trang chủ Douyin/TikTok
    await page.goto("https://www.douyin.com", { waitUntil: "domcontentloaded" });

    // Đợi người dùng login thủ công nếu chạy headless: false, hoặc lấy cookies có sẵn
    const cookies = await browserContext.cookies();
    const msToken = await page.evaluate(() => localStorage.getItem("msToken") || "");

    return { cookies, msToken };
  } finally {
    await browserContext.close(); // Giải phóng bộ nhớ RAM ngay lập tức
  }
}
```

- Kết quả (cookies + msToken) sẽ được **lưu ra file `session.json`** để tầng HTTP/cào bằng HTTP client tái sử dụng.
- Chỉ chạy lại khi cookie hết hạn (vài giờ/lần hoặc khi API báo lỗi auth), KHÔNG chạy trình duyệt cho mỗi request cào.

## Tiêu chí hoàn thành
- Chạy `bootstrapSession` thành công và ghi cookies/token ra file `session.json`.
- Browser tự đóng hoàn toàn sau khi xong, không để lại tiến trình ngầm tốn RAM.
- Ghi session thành công để sẵn sàng cho Phase 4 (Cào dữ liệu qua HTTP client).
