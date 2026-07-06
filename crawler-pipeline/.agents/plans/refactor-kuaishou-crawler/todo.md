# ✅ TODO — refactor-kuaishou-crawler

## Phase hiện tại: Phase 1 — Kuaishou Crawler Migration
- [x] Định nghĩa các hằng số và kiểu dữ liệu trong `field.ts`
- [x] Tích hợp các file GraphQL query của Kuaishou làm hằng số hoặc module riêng biệt
- [x] Phát triển bộ trích xuất dữ liệu `extractor.ts` để chuyển đổi kết quả thành định dạng database
- [x] Triển khai `KuaishouClient` thực hiện các yêu cầu GraphQL và REST V2 thông qua trình duyệt
- [x] Triển khai `KuaishouLogin` hỗ trợ kiểm tra đăng nhập bằng cookie
- [x] Hoàn thiện `KuaishouCrawler` trong `core.ts` điều phối các tác vụ crawl, creator, search, comments
- [x] Đăng ký `KuaishouCrawler` vào hệ thống `CrawlerFactory` (nếu chưa có)
- [x] Chạy kiểm tra biên dịch dự án sạch lỗi `npx tsc --noEmit`

## Backlog (chưa xếp phase)
- [ ] Thử nghiệm cào thực tế khi cấu hình cookie Kuaishou hoạt động
