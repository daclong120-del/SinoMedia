# 🌳 Detail Map — Crawler Queue Worker Automation & Claim Task

- Khởi chạy Queue Worker ở môi trường local development
  - └ à, nghĩa là cần công cụ chạy nóng và giám sát tiện lợi  [quyết định: dùng nodemon trỏ thẳng file queue_worker.ts]  🔄
      - └ à, nghĩa là cần cài devDependencies  [quyết định: npm install -D nodemon]  🔄
      - └ à, nghĩa là cần thiết lập npm script chạy  [quyết định: "worker:dev": "nodemon --watch src --exec tsx src/queue_worker.ts" trong package.json]  🔄
      - └ à, nghĩa là cần đọc config chuẩn local  [quyết định: nạp .env.local trên host trực tiếp]  🔄
  - └ à, nghĩa là cần dừng worker cũ trong docker để tránh chạy song song  [quyết định: docker stop crawler-worker]  ✅
- Cơ chế lấy nhiệm vụ (Claim Task) từ database Supabase
  - └ à, nghĩa là cần lấy task pending đầu tiên và đổi trạng thái sang running một cách nguyên tử (atomic)  [quyết định: viết RPC `claim_next_crawler_task`]  🔄
      - └ à, nghĩa là cần khóa dòng được chọn để tránh tranh chấp  [quyết định: dùng SELECT ... FOR UPDATE SKIP LOCKED trong SQL]  🔄
      - └ à, nghĩa là cần cập nhật trạng thái ngay trong transaction  [quyết định: UPDATE crawler_tasks SET status = 'running', updated_at = now() WHERE id = lock_id RETURNING *]  🔄
      - └ à, nghĩa là RPC trả về task vừa nhận hoặc NULL nếu không có task  [quyết định: return to_jsonb(task)]  🔄
  - └ à, nghĩa là queue_worker.ts phải gọi RPC này thay vì 2 bước SELECT và PATCH như trước  [quyết định: gọi `supabaseRest("rpc/claim_next_crawler_task", { method: "POST" })`]  🔄
