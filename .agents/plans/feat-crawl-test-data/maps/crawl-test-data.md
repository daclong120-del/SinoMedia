# 🗺️ Cây "À, nghĩa là..." — feat-crawl-test-data

Đào sâu chi tiết kỹ thuật cho việc cào và nạp 100 dữ liệu thử nghiệm.

## 🧭 Các nhánh chi tiết

- Cào và nạp 100 dữ liệu
  - à, nghĩa là chạy CLI command `search` từ project `crawler-pipeline`.
  - à, nghĩa là cần truyền từ khóa và giới hạn số lượng bài viết:
    - Bilibili: từ khóa `"AI"`, giới hạn `50` bài viết.
    - Douyin: từ khóa `"marketing"`, giới hạn `50` bài viết.
  - à, nghĩa là ta cần kiểm tra cookie trước:
    - Bilibili có tài khoản active: `bili_acc_1` ✅
    - Douyin có tài khoản active: `douyin_acc_1` ✅
  - à, nghĩa là ta nên chạy Dry-run trước:
    - Chạy Bilibili search 1 bài để test kết nối: `npx tsx src/index.ts search "AI" 1 -p bilibili`
    - Chạy Douyin search 1 bài để test kết nối: `npx tsx src/index.ts search "marketing" 1 -p douyin`
  - à, nghĩa là nếu Dry-run thành công, ta sẽ chạy cào hàng loạt:
    - Chạy Bilibili search 50 bài: `npx tsx src/index.ts search "AI" 50 -p bilibili`
    - Chạy Douyin search 50 bài: `npx tsx src/index.ts search "marketing" 50 -p douyin`
  - à, nghĩa là sau khi cào, ta cần verify số lượng trong Supabase:
    - Chạy script check count trong database: `npx tsx scratch/count-db.ts`
    - So sánh số lượng trước và sau khi cào để tính số bản ghi thực tế tăng lên.
