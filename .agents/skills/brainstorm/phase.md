# 🎯 BRAINSTORM PHASE — Brainstorm & Triển Khai Một Phase

> **Đọc kèm `skills/brainstorm/common.md` (luật dùng chung).**
>
> Skill VI MÔ: lấy MỘT phase (vừa được chọn từ roadmap) hoặc một vấn đề nhỏ gọn → brainstorm chi tiết các tình huống/use case → tự kiểm chứng → lập kế hoạch → xin phép → triển khai → DỪNG.

## Khi nào dùng skill này
- Người dùng vừa **chọn một phase** từ roadmap của `skills/brainstorm/plan.md`
- HOẶC vấn đề đã đủ nhỏ/gọn, phạm vi rõ ràng (làm trong một mạch)
→ (Việc chọn skill do `hooks/brainstorm-first.md` lo.)

⚠️ Coi phase/vấn đề này là **"vấn đề số 1 thật sự, không chia nhỏ thêm"**. Brainstorm cho nó nghiêm túc — KHÔNG vì nó là "phase nhỏ" mà đoán đại. **Áp dụng cho cả Phase 1.**

---

## Quy trình

### B0. ĐỌC TRẠNG THÁI (bám tài liệu — bắt buộc trước tiên)
Mở `<dự-án>/.agents/plans/INDEX.md` → biết **initiative nào** đang 🔄 (active) → mở `<initiative>/roadmap.md` (mục `📍 Đang làm` cho biết phase 🔄 + item + bước kế), và `<initiative>/design/phase-XX.md` + `<initiative>/maps/` của phase này nếu đã có. Nếu đang tiếp tục dở → bám đúng chỗ đã ghi, KHÔNG làm lại từ đầu. Đổi phase này sang 🔄 trong `<initiative>/roadmap.md` + cập nhật mục `📍 Đang làm` (+ `INDEX.md` nếu trạng thái initiative đổi).

### B1. Hiểu chi tiết + USE CASE (hỏi từng câu một)
Áp dụng **QUY TẮC HỎI — TÁCH 2 LỚP** (`skills/brainstorm/common.md`).
- Lớp 1: mục đích cụ thể của phase, hành vi mong muốn, các **tình huống/use case** người dùng quan tâm, thế nào là "đúng ý".
- Lớp 2: luồng chạy, cấu trúc, phương án triển khai (AI đề xuất + phân tích).
- Nghĩ tới cả **edge case / trường hợp lỗi** của phase này.

### B2. Yêu cầu phi chức năng (nêu giả định rõ ràng)
Chỉ những gì liên quan phase này: hiệu năng, quy mô, bảo mật/riêng tư, độ tin cậy, ai bảo trì.

### B3. Khóa hiểu biết (Understanding Lock — cổng chặn)
Nói lại để xác nhận: tóm tắt hiểu biết (5–7 ý) + liệt kê giả định.

### B4. Khám phá hướng + PHẢN BIỆN (sản phẩm LẪN kỹ thuật)
Áp dụng **QUY TẮC TRÌNH BÀY HƯỚNG ĐI** (`skills/brainstorm/common.md`).
- Đủ 2 lớp; dẫn đầu bằng 👉 khuyến nghị + lý do; phản biện điểm yếu TỪNG hướng.
- **Theo `hooks/tool-gate.md`: nghiên cứu giải pháp thật/best practice bằng tool TRƯỚC khi chốt — không đề xuất theo trí nhớ.**
- YAGNI — không tối ưu sớm.

### B5. Lập kế hoạch chi tiết cho phase
- Các bước cụ thể; mỗi bước: làm gì, cần gì, output kỳ vọng.
- Nêu bước nào rủi ro; đề cập kiến trúc/luồng dữ liệu/xử lý lỗi/edge case nếu liên quan.
- **🔴 BẮT BUỘC tự KIỂM CHỨNG cách làm TRƯỚC khi trình bày** (`hooks/tool-gate.md`): đọc file/code thật, tra cú pháp/API/tài liệu bằng tool. CẤM bịa cách làm rồi hỏi người dùng "đúng chưa". Chưa kiểm được điểm nào → nói rõ "điểm này chưa chắc, đang kiểm".

### B5.5 — 🛑 CỔNG ĐÀO SÂU CHI TIẾT: cây "à, nghĩa là..." (bắt buộc — CẤM bỏ qua)

⛔ **CẤM sang B6 khi CHƯA chạy cây "à, nghĩa là..." cho TỪNG deliverable cụ thể trong kế hoạch vừa lập ở B5.**

Vi phạm bước này = **làm sai yêu cầu**, không phải "linh hoạt" hay "gọn nhẹ".

**Cách thực hiện:**
Với mỗi thứ cụ thể bạn sẽ TẠO/SỬA trong phase này (file, component, UI element, function, config, asset…):
- Truy xuống tận đáy bằng chuỗi "à, nghĩa là..." — mỗi nhánh phải đến một **QUYẾT ĐỊNH CÓ CHỦ ĐÍCH**
- KHÔNG để bất kỳ chi tiết nào ở trạng thái "mặc-định-cho-qua" / "chắc ok" / "để default cũng được"
- Mỗi nhánh còn bỏ ngỏ = **CHƯA được phép sang bước kế**

> Ví dụ (block gỗ):
> → à, nghĩa là cần **texture** → kích thước bao nhiêu px? (16×16?) → **bảng màu** gì ra đúng chất gỗ? → **vân gỗ** vẽ thế nào để không phẳng lì? → có khớp phong cách block khác chưa? → xếp cạnh nhau / nhìn từ xa ổn không?

**Tự kiểm bắt buộc — thấy tín hiệu nào dưới đây là DỪNG, đào tiếp ngay:**
- Đang nghĩ *"tạm được rồi"*, *"chắc ok"*, *"để default cũng được"* → đó CHÍNH LÀ tín hiệu **CHƯA XONG**
- Điền một giá trị / chọn một thứ mà không tự hỏi "vì sao là cái này chứ không phải cái khác?"
- Làm xong chức năng nhưng **chưa hình dung được nó TRÔNG/CHẠY ra sao** trong thực tế
- Lướt qua một phần vì nó "nhỏ" — chi tiết nhỏ làm nên hay dở

**Khi cây đủ sâu → BẮT BUỘC ghi ra file thật:**
- `<dự-án>/.agents/plans/<initiative>/maps/<feature>.md` — đánh dấu ✅/🔄/⏳ từng nhánh
- KHÔNG chỉ nghĩ trong đầu rồi quên; KHÔNG chỉ ghi trong chat tạm

### B6. Decision Log
Mỗi quyết định ghi vào `<dự-án>/.agents/docs/decisions.md`: đã quyết gì, phương án thay thế, vì sao chọn.

### B7. GHI tài liệu (theo `skills/workspace.md`) — tất cả TRONG thư mục initiative đang active
- `<dự-án>/.agents/plans/<initiative>/design/phase-XX.md` — thiết kế chi tiết phase.
- `<dự-án>/.agents/plans/<initiative>/maps/<feature>.md` — cây "à nghĩa là" đã đào ở B5.5 (phải tồn tại trước khi sang đây).
- `<dự-án>/.agents/plans/<initiative>/todo.md` — checklist việc nhỏ của phase.
- Cập nhật `<initiative>/roadmap.md`: phase 🔄 + mục `📍 Đang làm` (item đang làm, bước kế) + câu hỏi mở nếu có.

### B8. 🛑 Xin PHÉP triển khai — RỒI KẾT THÚC LƯỢT NGAY (KHÔNG phải xin xác nhận ĐÚNG-SAI)
Theo mục **⚖️** và **🛑🛑 CỔNG XIN PHÉP = KẾT THÚC LƯỢT NGAY** của `skills/brainstorm/common.md`:
- ❌ CẤM hỏi "cách này đúng chưa / file viết vậy ổn không?" để bắt người dùng thẩm định kỹ thuật.
- ✅ Trình bày: *"Tôi **đã xác minh** cách đúng là X (vì đã đọc Y / tra Z). Xin phép triển khai."* → người dùng chỉ cho GO-AHEAD.
- 🛑 **Câu xin phép là NỘI DUNG CUỐI CÙNG của lượt này.** Viết xong → DỪNG BÚT, kết thúc lượt. **CẤM gọi bất kỳ tool nào sau câu xin phép** (kể cả đọc/khám phá). CẤM bước sang B9 trong cùng lượt. Đợi người dùng nhắn GO-AHEAD ở lượt SAU.

### B9. Triển khai (CHỈ ở một LƯỢT MỚI, sau khi người dùng đã nhắn GO-AHEAD)
> ⚠️ Bước này **không bao giờ** nằm chung lượt với B8. Chỉ chạy khi đã có tin nhắn cho phép rõ ràng từ người dùng (xem "GO-AHEAD hợp lệ" trong common.md). Chưa có → quay lại đứng yên ở cuối B8.
Áp dụng **🚦 LUẬT TRIỂN KHAI THEO PHASE** (`skills/brainstorm/common.md`) — tín hiệu 🅱️ mới viết code; làm đúng một phase.

---

## 🔁 Sau khi xong phase
1. **🛑 CỔNG ĐÓNG PHASE — GHI TRƯỚC KHI BÁO XONG** (bắt buộc, theo `skills/brainstorm/common.md`). CẤM tuyên bố "xong phase" khi chưa gọi tool ghi đủ 2 file:
   - `<initiative>/roadmap.md` → phase này ✅ **VÀ** dời con trỏ `📍 Đang làm` sang phase kế (hoặc "chờ chọn")
   - `plans/INDEX.md` → cập nhật tiến độ initiative (vd `2/5 phase`)
2. Báo cáo: đã làm gì, kết quả, điểm cần lưu ý — **kèm biên nhận** (trích đúng đường dẫn 2 file vừa ghi + marker mới), ví dụ:
   > ✅ ĐÓNG PHASE — biên nhận: roadmap `plans/feat-auth/roadmap.md` Phase 2 ✅ · 📍 con trỏ → Phase 3 · INDEX feat-auth 2/5.
3. **🛑 DỪNG HOÀN TOÀN.** Không tự động sang phase tiếp. Rồi **hiện lại bảng roadmap** cho người dùng (đọc từ `<initiative>/roadmap.md`):
   > **Tiến độ:**
   > - ✅ Phase 1 — ... *(đã xong)*
   > - ⏳ Phase 2 — ...
   >
   > **Còn lại N phase.** ⭐ Khuyên làm **Phase 2** tiếp, vì...
   > Bạn muốn làm phase nào? A. ... *(khuyến nghị)*  B. ...  C. Tạm dừng
4. Người dùng chọn phase kế → quay lại B1 với phase mới (brainstorm-first sẽ giữ ở `skills/brainstorm/phase.md`).
5. Hết phase trong initiative → ghi `INDEX.md` initiative này ✅; nói rõ **"Tất cả phase của initiative đã hoàn tất"** + tóm tắt; gợi ý xem `INDEX.md` cho initiative kế nếu còn.
