# 🗺️ BRAINSTORM PLAN — Phân Rã Vấn Đề & Lập Kế Hoạch Toàn Cảnh

> **Đọc kèm `skills/brainstorm/common.md` (luật dùng chung).**
>
> Skill VĨ MÔ: biến một yêu cầu lớn/mơ hồ thành **bức tranh toàn cảnh = danh sách phase rõ ràng**, rồi DỪNG cho người dùng chọn phase. **KHÔNG đi sâu chi tiết kỹ thuật từng phase. KHÔNG viết code.**

## Khi nào dùng skill này
- Yêu cầu lớn / nhiều phần chức năng tách biệt được
- Phạm vi còn mơ hồ ("làm app X", "làm cho tốt hơn", "refactor/migrate/tích hợp")
- CHƯA có roadmap/bảng phase cho việc này
→ (Việc chọn skill do `hooks/brainstorm-first.md` lo. Nếu vấn đề đã nhỏ gọn → dùng `skills/brainstorm/phase.md` thay vì file này.)

---

## Quy trình

### 1. Hiểu bối cảnh hiện tại
- **Đọc kho tài liệu nếu đã có:** `<dự-án>/.agents/docs/` (overview, architecture, decisions), `<dự-án>/.agents/plans/INDEX.md` (các initiative đã có; initiative 🔄 = đang active → mở `roadmap.md` của nó) — bám tài liệu cũ, đừng làm lại từ đầu (xem `skills/workspace.md`).
- Xem trạng thái dự án (file, tài liệu, kế hoạch, quyết định trước). Dùng `tools/project-inspector/` để xem cấu trúc thật nếu là dự án lạ.
- Phân biệt cái đã có sẵn vs cái đang đề xuất.
- Ghi nhận ràng buộc ngầm chưa xác nhận.
- **Xác định việc này là một initiative MỚI hay tiếp một initiative đã có trong `INDEX.md`.** Nếu mới → đây sẽ là một thư mục `<loại>-<slug>/` riêng (xem bước ⓪).

### ⓪ PHÂN LOẠI & ĐẶT TÊN INITIATIVE
- Phân loại việc: **`feat-`** (tính năng mới) · **`refactor-`** (tái cấu trúc/migrate). *(nếu là "đang HỎNG/lỗi" → đây là việc của `skills/brainstorm/debug.md`, không phải file này.)*
- Đặt **slug** ngắn, kebab-case theo nội dung việc → tên initiative `<loại>-<slug>` (vd `feat-auth`, `refactor-db-layer`).
- **Chưa ghi thư mục/INDEX vội** — chỉ chốt tên trong đầu; việc tạo thư mục + roadmap + đăng ký INDEX làm ở **bước 4** (sau khi đã LÀM RÕ). KHÔNG dồn việc mới vào roadmap của initiative khác.

### 2. ① LÀM RÕ — 🛑 CỔNG CHẶN CỨNG (trước khi chia phase / ghi BẤT KỲ file nào)

⛔ **CẤM chia phase. CẤM tạo/ghi roadmap · docs · INDEX khi CHƯA làm rõ yêu cầu.**
Với chủ đề lớn/mơ hồ (vd "make a minecraft clone"), **lượt phản hồi ĐẦU TIÊN PHẢI là câu hỏi làm rõ — TUYỆT ĐỐI không phải tài liệu hay danh sách phase.**

- Hỏi **từng câu một** (ưu tiên A/B/C/D, Lớp 1 sản phẩm — `skills/brainstorm/common.md`): mục đích, đối tượng, phạm vi, tiêu chí "đúng ý", non-goals, ràng buộc lớn.
- Người dùng đã **cho phép hỏi thoải mái** — hỏi tới khi ĐỦ RÕ, đừng vội.
- Khi đủ rõ → **tóm tắt hiểu biết (5–7 ý) để người dùng xác nhận**, RỒI mới được sang bước 3.

→ Chưa bàn sâu kỹ thuật từng phase — để dành cho `skills/brainstorm/phase.md`.

### 3. Đề xuất DANH SÁCH PHASE
Chia vấn đề lớn thành các phase rõ ràng. Mỗi phase nêu ngắn gọn (ngôn ngữ người dùng):
- Phase này mang lại **gì cho người dùng** (kết quả nhìn thấy được)
- Vì sao tách riêng
- Thứ tự nên làm + lý do (phụ thuộc, rủi ro, giá trị)

### 4. 🛑 GHI TÀI LIỆU + DỪNG, hỏi chọn phase
> ⚠️ CHỈ tới bước này SAU khi đã qua cổng ① LÀM RÕ (bước 2) — đã hỏi đủ và người dùng xác nhận hiểu biết. Chưa làm rõ mà ghi file = SAI.
- **GHI ra file thật** theo `skills/workspace.md` (KHÔNG chỉ nói trong chat) — roadmap nằm TRONG thư mục initiative `<loại>-<slug>/` (đặt tên ở bước ⓪), KHÔNG dồn vào một roadmap chung:
  - `<dự-án>/.agents/plans/<loại>-<slug>/roadmap.md` — danh sách phase của initiative này (tất cả ⏳), kèm mục `📍 Đang làm` ghi "chưa bắt đầu phase nào".
  - `<dự-án>/.agents/plans/INDEX.md` — thêm/đăng ký dòng cho initiative này (loại, trạng thái 🔄/⏳); đây là cổng vào toàn cục.
  - `<dự-án>/.agents/docs/overview.md` — dự án là gì, mục tiêu, phạm vi, non-goals.
  - `<dự-án>/.agents/docs/architecture.md` — nếu đã rõ kiến trúc/luồng tổng thể.
- Trình bày danh sách, rồi hỏi:
  > "Đây là các phase tôi đề xuất. Bắt đầu với phase nào?
  > A. Phase 1 — ... *(khuyến nghị, vì...)*
  > B. Phase 2 — ...
  > C. Đổi thứ tự / phase khác
  > D. Tôi chưa rõ — bạn gợi ý nên làm gì trước"
- **KHÔNG tự ý bắt đầu phase nào. KHÔNG viết code.** Chờ người dùng chọn.
- 🛑 Theo **🛑🛑 CỔNG XIN PHÉP = KẾT THÚC LƯỢT NGAY** (`skills/brainstorm/common.md`): câu hỏi chọn phase là nội dung CUỐI CÙNG của lượt — viết xong là DỪNG BÚT, **CẤM gọi tool đi tiếp sang phase** trong cùng lượt. Đợi người dùng chọn ở lượt SAU.

→ Khi người dùng chọn phase X: bàn giao sang **`skills/brainstorm/phase.md`** (brainstorm-first sẽ nạp) để brainstorm chi tiết phase đó. Roadmap vừa tạo là nguồn sự thật cho bước sau.
