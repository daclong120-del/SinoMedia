# 🗺️ ROADMAP — feat-crawler-ts-features

Port các tính năng cào còn thiếu của **MediaCrawler (Python, Douyin)** sang bản **TypeScript** ở `crawler-pipeline/`, để pipeline sinh khối lượng lớn dữ liệu nuôi feed app Expo. Crawler GHI → Supabase + R2 → App ĐỌC.

> Đọc `README.md` trước. Endpoint chính xác ở `maps/douyin-api-reference.md`.

- ✅ Phase 0 — Refactor nền tảng dùng chung (`douyinGet`, `persistAweme`)  → design/00-refactor-foundation.md
- ✅ Phase A — Creator videos (`get_all_user_aweme_posts`)                  → design/01-creator-videos.md
- ✅ Phase B — Search theo từ khóa (`search_info_by_keyword`)               → design/02-search-keyword.md
- ✅ Phase C — Comments (+ bảng `crawled_comments`)                         → design/03-comments.md
- ✅ Phase D — Model/types (dọn `any`, song song)                          → design/04-model-types.md

> Marker: ⏳ chưa · 🔄 đang làm · ✅ xong · ⛔ chặn

## Phụ thuộc
- Phase 0 **chặn** A/B/C (chúng gọi `douyinGet`/`persistAweme`).
- Phase D độc lập, làm lúc nào cũng được.
- Mỗi phase phải **verify chạy thật** (thấy dữ liệu ở Supabase/R2) trước khi sang phase kế.

## Nguyên tắc (đọc trước khi làm)
1. Chỉ sửa `crawler-pipeline/` (+ migration Supabase cho Phase C). ⛔ Không đụng repo tham chiếu `ChinaMediaCrawler`/`socialpeta-*`.
2. Reuse tối đa code sẵn có (client `impit`, sign, R2, writer). Không viết lại phần đã chạy.
3. Search **KHÔNG** ký `a_bogus`; các endpoint khác **CÓ** ký.
4. Nuốt lỗi theo từng item, nghỉ giữa request/trang, đặt trần số lượng khi test.
