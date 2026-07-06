# 🔎 REVIEW — Đánh giá / Rà soát / Phản biện có bằng chứng

> **Đọc kèm phần LÕI của `skills/brainstorm/common.md`** (triết lý, phân vai 🧑/🤖, hỏi 2 lớp) và **`hooks/tool-gate.md`** (nền bằng chứng + steelman).
> Đây là skill cho tác vụ **NHẬN XÉT/ĐÁNH GIÁ một thứ đã có** (code, repo, kiến trúc, tài liệu, một tuyên bố) — KHÁC plan/phase (xây mới) và debug (đang hỏng).

## Khi nào dùng skill này
- Người dùng bảo: "đánh giá / review / nhận xét / chấm điểm / phản biện / soi lỗi / so sánh" một thứ ĐÃ TỒN TẠI.
- Tín hiệu: "cái này có ổn không", "chấm 1–10", "tìm điểm yếu", "đánh giá repo/code/PR này".
> (Đang HỎNG → `debug.md`. Muốn LÀM MỚI → `plan.md`/`phase.md`.)

## Mục đích
Cho ra nhận xét **đúng và trung thực**, mỗi khẳng định có bằng chứng — KHÔNG khen lấy lòng, KHÔNG chê gồng cho đủ số. Giọng senior thẳng thắn.

---

## ⛔ LUẬT CỨNG (vi phạm = review vô giá trị)

1. **CITE-HOẶC-CÂM.** Mọi nhận xét quan trọng PHẢI kèm bằng chứng cụ thể: `file:dòng`, trích nguyên văn, hoặc kết quả kiểm tra thật. **Dẫn không được = không viết.** Cấm nhận xét từ trí nhớ / đoán theo tên file.
2. **ĐỌC THẬT trước khi xét.** Mở đúng file/nguồn liên quan bằng tool. Tóm tắt từ vibe = chưa đọc = chưa được xét.
3. **NHÃN ĐỘ CHẮC** cho mỗi khẳng định: ✅ đã kiểm (nói rõ kiểm bằng gì) / ⚠️ phỏng đoán chưa kiểm. Cấm giọng chắc nịch cho thứ chưa kiểm.

---

## Quy trình R1–R6

### R1. Khóa phạm vi + tiêu chí + TÁCH CLAIM CON (hỏi nếu mơ hồ)
- Đánh giá theo **mục tiêu nào**? (vd "tăng one-shot", "bảo mật", "dễ bảo trì"). Tiêu chí khác nhau → kết luận khác nhau. Mơ hồ → hỏi 1 câu chốt tiêu chí.
- Phạm vi: xét toàn bộ hay phần nào?
- 🔪 **Phát biểu lại mục tiêu cho chính xác, rồi TÁCH thành các claim con.** Câu hỏi hay gói nhiều tuyên bố trong một (vd "tăng one-shot" + "cho agent BẤT KỲ" = 2 claim). Chấm/đánh giá TỪNG claim trước, rồi mới tổng hợp — gộp chấm một lần là nguồn gây nhiễu điểm.

### R2. Thu thập bằng chứng (đọc thật)
- Đọc các file/nguồn trong phạm vi. Dùng `tools/INDEX.md` nếu có tool khảo sát (vd `project-inspector`).
- Ghi lại bằng chứng kèm `file:dòng` cho từng quan sát — đây là nguyên liệu cho mọi nhận xét sau.

### R3. 🛑 KIỂM ĐỊNH KHÁI NIỆM (chống đánh tráo — nhưng đừng buộc tội oan)
- Mục tiêu/tuyên bố dùng thuật ngữ quan trọng nào? Định nghĩa NGẦM của đối tượng có khớp định nghĩa CHUẨN không?
- Lệch định nghĩa → **kiểm việc reframe có được CÔNG KHAI nói rõ không** trước khi gắn nhãn:
  - Tác giả **tự tuyên bố** reframe + có giải thích/analogy (vd README nói thẳng "one shot = không phải sửa lại") → **reframing HỢP LỆ**, KHÔNG phải đánh tráo. Chỉ ghi chú: "lệch định nghĩa chuẩn nhưng đã nói rõ".
  - Chỉ gọi **"đánh tráo khái niệm"** khi sự lệch bị **GIẤU** để lừa kỳ vọng người đọc.
- ⚠️ Mặc định của reviewer hay nghiêng về "buộc tội đánh tráo" — phải vượt lằn ranh "có giấu không" mới được kết tội.

### R4. 🛑 STEELMAN ĐỐI XỨNG — cân ƯU ngang NHƯỢC (cổng chống lệch — theo `hooks/tool-gate.md`)

⚠️ **Lỗi NẶNG NHẤT của review là LỆCH ÂM:** mải soi lỗi nên bỏ sót/hạ thấp cơ chế được thiết kế tốt → điểm tụt oan. Bỏ sót ưu = **gồng lệch y hệt** thổi phồng nhược. Cổng này bắt cân CẢ HAI phía:

**4a — Với MỖI điểm yếu/lỗi/mâu thuẫn định nêu** (chống thổi phồng nhược):
- Tự hỏi: **"Tác giả có CỐ Ý vậy và đã giải thích ở đâu đó chưa?"** → đọc thử chỗ liên quan để chắc.
  - Có giải thích hợp lý → **bỏ ra, không tính là lỗi.**
  - Thật sự là lỗi → giữ, đánh **đúng mức nghiêm trọng** (đừng thổi nuance nhỏ thành thảm họa, đừng dìm bug thật).
- ⛔ "Liệt kê N điểm" KHÔNG ép phải bịa đủ N. **Thà 3 phát hiện thật hơn 10 cái gồng.**

**4b — ĐỐI XỨNG: chủ động ĐI TÌM và cân đúng ƯU điểm** (chống bỏ sót ưu):
- Chủ động truy tìm cơ chế **được thiết kế tốt**, không chỉ liệt kê cho có.
- Với MỖI ưu điểm: **steelman nó** — vì sao nó thật sự giải đúng một vấn đề KHÓ? rồi cân **trọng số NGANG HÀNG** với nhược.
- Tự hỏi bắt buộc: **"Có cơ chế giỏi nào tôi đang lướt qua vì mải soi lỗi không?"**
- Bỏ sót / hạ thấp ưu = cũng phải sửa trước khi chốt, y như thổi phồng nhược ở 4a.

### R5. TỰ-VERIFY tuyên bố hiệu quả
- Đối tượng có tuyên bố về hiệu quả ("nhanh hơn", "đạt X%", "tốt hơn") không? → nó có **tự chứng minh** bằng số liệu/benchmark/bằng chứng không, hay chỉ là assertion? Nêu rõ.

### R6. Kết luận — chấm điểm bằng SỔ CÂN, rồi TỰ CÃI LẠI
- Tách rõ: **sự thật khách quan** (có bằng chứng) vs **ý kiến chủ quan**; **cốt lõi** vs **phụ thuộc môi trường/ngữ cảnh**.
- Có chấm điểm → KHÔNG cảm tính, KHÔNG chọn số tròn "an toàn ở giữa". Phải suy từ **sổ cân**:
  1. **Neo thang:** với mục tiêu NÀY, "1 điểm" nghĩa là gì? "10 điểm" nghĩa là gì? (định nghĩa rõ 2 đầu mút trước khi đặt số).
  2. **Bảng cân:** cột ƯU (kèm trọng số — từ R4b) ⟷ cột NHƯỢC (kèm mức nghiêm trọng thật — từ R4a). Đặt điểm lên thang từ bảng này.
  3. **Bắt buộc trả lời 2 câu:** "Vì sao KHÔNG cao hơn 1 bậc? Vì sao KHÔNG thấp hơn 1 bậc?"
- 🔴 **RED-TEAM điểm số (bắt buộc):** có điểm NHÁP rồi → **tự cãi lại nó**: lập luận thử cho cao hơn 1 bậc VÀ thấp hơn 1 bậc. Điểm nháp **sống sót cả hai phía** mới được chốt.
- Nêu **cần gì để tốt hơn** + đâu là **trần bản chất** không vượt được.
- Cuối cùng thêm mục **"❓ Điểm tôi KHÔNG chắc, nên tự kiểm"** — liệt kê thật những chỗ còn ngờ.

---

## Tự kiểm trước khi gửi (bắt buộc)
- Mọi khẳng định lớn đã có bằng chứng `file:dòng` chưa?
- Có phát hiện nào đang **gồng cho đủ số** (thổi phồng nhược) không? (R4a)
- 🔁 **Có ƯU điểm giỏi nào đang bị bỏ sót/hạ thấp vì mải soi lỗi không?** (R4b) — câu này hay bị quên nhất.
- Có gọi "đánh tráo khái niệm" cho một reframe vốn đã nói công khai không? (R3)
- Điểm số đã qua **red-team** (cãi cả 2 phía) chưa, hay là số tròn an toàn? (R6)
- Có đang nói chắc về thứ mình **chưa kiểm** không?
- → Trúng bất kỳ cái nào = sửa TRƯỚC khi trả lời.

> Review KHÔNG sửa code. Phát hiện ra việc cần làm → chuyển `plan.md`/`phase.md` (xây mới) hoặc `debug.md` (đang hỏng), tạo initiative tương ứng theo `skills/workspace.md`.
