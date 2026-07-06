# 🗺️ ROADMAP — refactor-migrate-platforms

Di chuyển logic cào (Request, Parse, Signature) của 6 nền tảng còn lại từ Python (`ChinaMediaCrawler/_mediaCrawler/media_platform/`) sang TypeScript trong `crawler-pipeline/src/crawl/` theo thiết kế hướng đối tượng tuân thủ giao diện `ICrawler`.

---

## Các Phase Thực Hiện

- ✅ **Phase 1 — Bilibili Crawler**
  - Viết lại thuật toán WBI Sign sang TypeScript (`src/sign/bilibili_sign.ts`).
  - Viết `src/crawl/bilibili/client.ts` để gọi API và phân tích cú pháp dữ liệu.
  - Hoàn thiện `src/crawl/bilibili/core.ts` bọc qua giao diện `ICrawler`.
  - Tích hợp ghi dữ liệu cào được (bài viết, bình luận, tác giả) xuống Supabase & R2.
  - Xây dựng và tích hợp Hệ thống Xoay vòng Tài khoản (Account Rotation Pool).

- ✅ **Phase 2 — Zhihu Crawler**
  - Tích hợp `src/sign/zhihu_sign.ts` hiện có.
  - Viết `src/crawl/zhihu/client.ts` và `core.ts` bọc `ICrawler`.
  - Phân tích và trích xuất dữ liệu bài đăng, câu trả lời, và bình luận.

- ✅ **Phase 3 — Weibo Crawler**
  - Viết `src/crawl/weibo/client.ts` và `core.ts` sử dụng Cookie thủ công.
  - Xử lý các API web của Weibo để lấy bài đăng, bình luận, và thông tin creator.

- ✅ **Phase 4 — Tieba Crawler**
  - Viết `src/crawl/tieba/client.ts` và `core.ts` bọc `ICrawler`.
  - Xử lý trích xuất bài viết từ các forum (thread) và bình luận.

- ✅ **Phase 5 — Kuaishou Crawler**
  - Xây dựng client request và core bọc `ICrawler` cho Kuaishou.
  - Xử lý cơ chế ký signature của Kuaishou nếu có yêu cầu.

- ✅ **Phase 6 — Xiaohongshu (XHS) Crawler**
  - Triển khai cơ chế ký `x-s`/`x-t`/`x-s-common` thông qua page.evaluate() trên CloakBrowser/Playwright (Hướng A).
  - Viết `src/crawl/xhs/client.ts` và `core.ts` hoàn tất di chuyển.

---

## 🛠️ Nguyên Tắc & Quy Ước Kỹ Thuật

1. **Khử Phụ Thuộc (SOLID):** Không chỉnh sửa `queue_worker.ts` khi thêm/sửa platform. Mọi giao tiếp thông qua `CrawlerFactory` và interface `ICrawler`.
2. **Cấu Hình Giới Hạn & Tránh Bị Chặn:**
   - Sử dụng delay random 1–3 giây giữa các request.
   - Giới hạn mặc định: 50 bình luận/bài, 20 video/creator. Có hỗ trợ override qua tham số `maxCount`.
3. **Session & Cookie:** Sử dụng cookie cấu hình thủ công lưu trữ trong `.env` hoặc DB session store cho đến khi hệ thống ổn định mới tính đến auto QR code login.
4. **Log & Báo Cáo:** Viết log chi tiết bằng tiếng Việt có dấu.
