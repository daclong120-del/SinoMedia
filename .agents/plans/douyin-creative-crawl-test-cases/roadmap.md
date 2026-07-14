# Roadmap: Douyin Creative Crawl Test Cases

Sáng kiến này nhằm xây dựng bộ kiểm thử (test suite) toàn diện cho quy trình crawl creative Douyin, bao gồm từ session, search, creator, video detail, comments đến Creative Hub, sử dụng cả mock contract tests và live smoke tests an toàn.

## 📍 Đang làm
- **Hoàn thành**: Đã hoàn thành tất cả các Phase.

---

## 📋 Danh sách các Phase

- [x] **Phase A: Contract Fixtures & Basic Mapping Tests**
  - Tạo các file fixtures JSON giả lập dữ liệu trả về từ Douyin (video detail, image detail, search-page, creator profile, comments, session diagnostics).
  - Viết `douyin-creative-contract.spec.ts` kiểm thử logic mapping dữ liệu sang DB schema, xử lý statistics, author, tags/language metadata mà không gọi API thật.
- [x] **Phase B: Queue Task & Lifecycle Contract Tests**
  - Thiết lập mock `CrawlerFactory`, task metadata, và Supabase client.
  - Viết kiểm thử trạng thái task (running, completed full/partial/empty, timeout, error classification, headless config overrides).
- [x] **Phase C: Storage & Creative Hub Backend Read Path Tests**
  - Seed dữ liệu giả lập cho các bảng `crawled_posts`, `crawled_authors`, `post_metric_snapshots`.
  - Viết test cho `creative.service.ts` để kiểm chứng bộ lọc platform, trending sorting, growth snapshots.
- [x] **Phase D: Live Douyin Smoke Tests Opt-In**
  - Viết `douyin-creative-live.spec.ts` có cấu hình guard `RUN_LIVE_DOUYIN_CREATIVE=1`.
  - Giới hạn số lượng crawl live nhỏ (`maxCount <= 3`, comments <= 5) phục vụ kiểm thử khói (smoke test).
