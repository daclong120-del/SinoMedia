# ✅ TODO — feat-crawler-tasks-trigger

## Phase 1: Tích hợp form "Tạo nhiệm vụ" trên Dashboard với Supabase
- [x] Tạo file migration `20260703090506_crawler_schema.sql` chứa schema các bảng crawler và RPC function `create_crawler_tasks` với atomic check & limit 50.
- [x] Khai báo hàm `createTasksBulk` kết nối RPC trong `dashboard/lib/api.ts`.
- [x] Tích hợp logic submit modal trong `dashboard/app/(main)/dash/tasks/page.tsx` (trim, skip empty, unique client, limit 50, nới max 500 chars).
- [x] Hiển thị toast báo cáo chi tiết kết quả insert thật từ RPC trả về.
- [x] Kiểm thử thủ công kiểm chứng dữ liệu thật trong table `crawler_tasks`.

## Phase 2: Tự động chạy Queue Worker qua CLI/Daemon & Atomic Claim Task
- [x] Tạo file migration `20260703090507_claim_task_rpc.sql` khai báo RPC `claim_next_crawler_task` với `FOR UPDATE SKIP LOCKED`.
- [x] Cập nhật `queue_worker.ts` sử dụng hàm RPC này để lấy và claim task nguyên tử.
- [x] Cài đặt `nodemon` và thêm script `"worker:dev"` trong `crawler-pipeline/package.json`.
- [x] Kiểm thử chạy worker bằng nodemon với dữ liệu task thật từ database local.

## Phase 3: Realtime update Trạng thái Task & Live Logs trên UI
- [x] Tạo migration `20260703090509_enable_realtime_crawler.sql` bật Realtime publication cho `crawler_tasks` và `crawler_logs`.
- [x] Thêm hàm `fetchTaskLogs`, `subscribeToTasks`, `subscribeToTaskLogs` vào `dashboard/lib/api.ts`.
- [x] Cập nhật `page.tsx` — live task status update (INSERT/UPDATE) + live log streaming per-task.
- [x] TypeScript build check — 0 errors.
