# 📐 Thiết kế Phase 1 — Khởi chạy thử nghiệm (Dry-run)

## Luồng thực thi
1. Sử dụng CLI của `crawler-pipeline` để thực thi tìm kiếm.
2. Bilibili test: `npx tsx src/index.ts search "AI" 1 -p bilibili`
3. Douyin test: `npx tsx src/index.ts search "marketing" 1 -p douyin`
4. Xác minh sự xuất hiện của các bản ghi mới trong Supabase REST API hoặc qua CLI check-count.

## Xử lý ngoại lệ
- Nếu tài khoản bị lỗi `banned` hoặc `expired`: CLI sẽ log thông báo lỗi.
- Nếu không ghi được vào Supabase: postgrest sẽ trả về status code khác 2xx.
