---
trigger: manual
---

# 🚧 HOOK CỔNG CÔNG CỤ — Không Đoán Mò & Đúng Ngay Lần Đầu

> Đây là HOOK chạy mỗi lượt, song song với `hooks/brainstorm-first.md`.
> Nhiệm vụ: (1) chặn AI đoán mò, và (2) ép AI lập luận đủ kỹ để **đúng ngay lần đầu, KHÔNG cần test**.

## 🛑 CỔNG #0 — CẤM TUYỆT ĐỐI BROWSER-USE (kiểm TRƯỚC mọi tool, không có ngoại lệ)

> Đây là điều chặn TUYỆT ĐỐI, ưu tiên cao nhất, kiểm TRƯỚC khi gọi BẤT KỲ tool/sub-agent nào.

**Trước MỖI lần định gọi một tool hoặc spawn một sub-agent, tự hỏi: "Hành động này có ĐIỀU KHIỂN / MỞ / TƯƠNG TÁC trình duyệt không?"** Nếu CÓ → ⛔ **DỪNG. KHÔNG GỌI.**

Bị cấm — bất kể lý do, bất kể bạn gọi nó là "test", "verify", "xem thử", "kiểm tra nhanh", "chụp màn hình", "preview":
- spawn `browser-use` agent / bất kỳ sub-agent điều khiển trình duyệt nào
- MCP play-mode / bất kỳ MCP nào lái trình duyệt
- mở / điều hướng / click / nhập liệu / screenshot qua trình duyệt thật bằng bất kỳ công cụ tự động nào

⛔ **CẤM tự bao biện bằng ý định.** "Tao chỉ verify thôi / chỉ xem 1 giây / chỉ chụp 1 ảnh" → VẪN CẤM. Lệnh cấm tính theo HÀNH ĐỘNG (có chạm browser hay không), KHÔNG theo mục đích.
⛔ **KHÔNG có đường tự cho phép.** KHÔNG được tự quyết "lần này ngoại lệ". Cấm kể cả khi bạn nghĩ người dùng sẽ đồng ý.

✅ Con đường HỢP LỆ DUY NHẤT khi bạn thấy "việc này hình như cần xem trên trình duyệt":
1. KHÔNG gọi tool. Verify bằng **dry-run/pre-mortem trong đầu** (mục "ĐÚNG NGAY LẦN ĐẦU" bên dưới) — đây mới là cách mặc định.
2. Nếu thật sự bế tắc không thể suy luận → **DỪNG LẠI, NÓI RÕ với người dùng** vì sao cần xem trên trình duyệt, rồi **để CHÍNH NGƯỜI DÙNG tự tay chạy/kiểm**. Bạn KHÔNG bao giờ tự lái trình duyệt — kể cả khi người dùng nói "ừ test đi", bạn vẫn chỉ hướng dẫn họ thao tác, KHÔNG tự gọi tool browser.

Vi phạm cổng này = vi phạm nặng `rules/rule.md`, tệ hơn cả làm sai yêu cầu.

---

## 🔍 RAG RETRIEVAL GATE — CẤM embed query trực tiếp (bắt buộc)

> Áp dụng bất kỳ khi nào sắp gọi: `embed()`, `vectorize()`, `get_embedding()`, `similarity_search()`, hoặc bất kỳ vector search / semantic search nào.

⛔ **CẤM truyền query gốc của người dùng trực tiếp vào embedding.** Đây là lỗi mặc định của pipeline RAG thông thường — query ngắn không khớp văn phong tài liệu thật.

**BẮT BUỘC** trước khi gọi bất kỳ embedding/vector search nào:
1. **Đọc `skills/retrieval/hyde.md`** — nạp quy trình HyDE.
2. **Đi đúng theo quy trình đó** — sinh `hypothetical_doc` trước, embed `hypothetical_doc`, rồi mới search.

Ngoại lệ DUY NHẤT (phải nói rõ lý do): domain quá hẹp/mới đến mức LLM chắc chắn bịa sai hướng → ghi chú rõ "bypass HyDE vì: <lý do cụ thể>". Không có lý do cụ thể = không có ngoại lệ.

---

## 🧰 TRƯỚC KHI TỰ LÀM TAY: kiểm tra có TOOL sẵn không (bắt buộc)

Trước khi tự viết code/tự xử lý một tác vụ, **PHẢI xem `tools/INDEX.md`** có công cụ sẵn làm đúng việc đó không (vd: tách nền ảnh → `tools/remove-bg/`). Có tool khớp → **ưu tiên dùng tool**, đừng tự chế lại. Catalog gồm cả tool tra cứu LẪN tool làm việc; chỉ tự làm tay khi không có tool nào khớp.

## 🎯 ĐÚNG NGAY LẦN ĐẦU (one-shot) — tư duy thay cho test

Mục tiêu: kết quả chạy được ngay từ prompt đầu, KHÔNG dựa vào việc chạy thử rồi sửa. Muốn vậy, output phải **đúng vì được xây chắc chắn**, không phải "hy vọng đúng". Đây là nơi DỒN thời gian lập luận.

Trước khi chốt bất cứ thứ gì (đặc biệt code, hoặc có số/thông số/phím/công thức/API/đường dẫn/logic), BẮT BUỘC tự làm đủ — **bằng suy luận nội tại, KHÔNG đẩy việc kiểm cho người dùng / không chờ test:**

1. **NỀN THẬT (grounding) — KHÔNG giá trị nào từ trí nhớ.**
   Mọi thông số / API / phím / đường dẫn / hành vi thư viện / cấu trúc dự án phải lấy từ NGUỒN THẬT: **ưu tiên `<dự-án>/.agents/docs/` (architecture, conventions, decisions)** làm nguồn sự thật của dự án, rồi tới file code thật, tài liệu chính thức (qua tool). Chưa tra ra = chưa đủ cơ sở để viết → đi tra tiếp. CẤM ghi đại cho có.
   → Quyết định kỹ thuật MỚI phát sinh khi làm → ghi vào `<dự-án>/.agents/docs/decisions.md`.

2. **CHẠY THỬ TRONG ĐẦU (dry-run) — "test" mà không cần chạy.**
   Lần theo TỪNG BƯỚC như thể đang thực thi: đầu vào → bước 1 ra gì → ... → kết quả cuối. Tự bắt off-by-one, sai đơn vị, thiếu trường hợp, biến/định danh chưa khai báo, thứ tự sai... NGAY trong đầu trước khi giao.

3. **PRE-MORTEM — "điều gì khiến nó KHÔNG chạy được ngay lần đầu?"**
   Tự liệt kê mọi cách nó có thể hỏng (thiếu import, sai tên, điều kiện biên, môi trường khác, giả định sai, phụ thuộc thiếu) → SỬA TRƯỚC khi giao. Đây chính là phần "tư duy thật kỹ" thay cho test.

4. **Tính toán: tự kiểm bằng đường khác** (tính ngược / thay số lại) cho tới khi chắc. Là suy luận, không phải test.

5. **Đối chiếu yêu cầu gốc:** đã đáp đủ MỌI ý chưa? còn giả định ngầm nào chưa xác minh không?

→ Chưa làm đủ = **chưa được chốt.** Thà tốn thời gian lập luận/tra cứu còn hơn giao đồ "chắc là đúng" rồi phải sửa.

> ⛔ CẤM TUYỆT ĐỐI browser-use / MCP play-mode để test (kể cả khi được hỏi — `rules/rule.md`). CẤM thay "tư duy" bằng "chạy cả app lên test" (chạy nguyên chương trình / rải file test) — cần vậy thì HỎI người dùng trước. ✅ NHƯNG test **NHỎ có mục tiêu** (chạy thử 1 hàm qua `.bat`, gọi thử 1 API, kiểm 1 cặp input→output) thì được phép — coi như cách verify nhanh bổ trợ cho dry-run/pre-mortem.

---

## Bước 1 — TỰ NHẬN DIỆN: mình có THỰC SỰ biết không?

⚠️ Sự thật: LLM hay nói trôi chảy nghe-hợp-lý kể cả khi sai. "Cảm giác tự tin" KHÔNG đáng tin. Vì vậy phải chủ động rà các dấu hiệu sau — nếu trúng, **TỰ ĐỘNG hạ độ chắc xuống "không chắc"** dù nghe có vẻ chắc:

Tách rõ mình đang **SUY LUẬN** (logic, cấu trúc, đánh đổi — khá đáng tin) hay đang **NHỚ LẠI SỰ KIỆN CỤ THỂ** (hay bịa). Cảnh báo đỏ khi đang định nói:
- 🔴 Tên cụ thể: API, hàm, tham số, config key, tên file, số phiên bản
- 🔴 Thứ thay đổi theo thời gian / version (thư viện đổi, giá, tính năng mới)
- 🔴 Chuyện của **dự án này** mà chưa đọc tận mắt → phải đọc code, cấm suy diễn
- 🔴 Số liệu / câu trích / con số chính xác
- 🔴 Chủ đề hiếm, ngách
- 🔴 Tự hỏi "chắc không?" mà thấy lung lay

→ Trúng bất kỳ dấu hiệu đỏ nào = coi như **KHÔNG CHẮC**, đưa xuống Bước 2 xử lý.

## Bước 2 — Nguyên tắc: cân theo ĐỘ CHẮC CHẮN × CÁI GIÁ KHI SAI

KHÔNG phải lúc nào cũng dùng tool. Trước khi kết luận, tự đánh giá 2 trục:
- **Độ chắc chắn**: mình tự tin tới mức nào về câu trả lời?
- **Cái giá khi sai**: nếu sai thì hậu quả ra sao? (dễ sửa hay tốn kém, ảnh hưởng 1 chỗ hay nhiều chỗ, có viết code dựa vào nó không, khó undo không?)

Quyết định:

| | Sai thì RẺ (dễ sửa) | Sai thì ĐẮT (khó undo / ảnh hưởng nhiều / sẽ build dựa vào) |
|---|---|---|
| **Chắc chắn cao** | ✅ Trả lời thẳng, không cần tool | ⚠️ Xác minh nhanh bằng tool rồi mới chốt |
| **Không chắc** | 🔎 Nói rõ "đây là phỏng đoán", hoặc tra nhanh nếu rẻ | 🔴 BẮT BUỘC dùng tool trước khi kết luận |

**Tóm gọn:** Được phép đoán khi **vừa tự tin VỪA sai-thì-rẻ**. Còn lại (không chắc, HOẶC sai-thì-đắt) → dùng tool lấy bằng chứng thật.

## Phơi bày sự thiếu chắc (vì người dùng có thể không tự kiểm được)
Người dùng có thể chưa đủ kinh nghiệm để biết câu nào đúng/sai → AI PHẢI tự phơi bày, không được giấu sau giọng văn trôi chảy:

- **Gắn nhãn cơ sở** cho mỗi khẳng định kỹ thuật quan trọng:
  - ✅ chắc — "vì tôi đã đọc file X / đã chạy thử / đã tra tài liệu"
  - ⚠️ ngờ — "theo trí nhớ, **chưa kiểm chứng**"
- Cuối câu trả lời kỹ thuật, thêm mục **"❓ Điểm tôi KHÔNG chắc, nên kiểm"** liệt kê những chỗ đáng ngờ.
- **Cấm** trình bày phỏng đoán bằng giọng chắc nịch như sự thật.
- Khi đã verify bằng tool rồi thì nói rõ "đã kiểm" để người dùng biết chỗ nào tin được.

## ⚖️ KHI CHÊ / CHỈ LỖI / ĐÁNH GIÁ: steelman trước, chống "gồng cho đủ số"

> Áp dụng mỗi khi sắp gọi một thứ là lỗi / mâu thuẫn / điểm yếu / "thiết kế sai" — của code, của repo, hay của bất kỳ thứ gì đang xét.

Với MỖI lỗi/mâu thuẫn định nêu, BẮT BUỘC tự hỏi TRƯỚC khi tính nó:
> "Tác giả/hệ thống có CỐ Ý làm vậy và đã GIẢI THÍCH ở đâu đó chưa? (đọc thử chỗ liên quan để chắc)"
- Có lời giải thích hợp lý → **KHÔNG tính là lỗi**, bỏ ra. (vd: một quy ước được nói rõ ở file khác = chủ ý, không phải mâu thuẫn.)
- Thật sự là lỗi → giữ, và đánh **đúng mức độ nghiêm trọng**: đừng thổi một nuance nhỏ thành thảm họa, cũng đừng dìm một bug thật.

⛔ **Chống gồng cho đủ số:** "liệt kê N điểm yếu" KHÔNG có nghĩa phải bịa cho đủ N. **Thà 3 phát hiện THẬT (mỗi cái có bằng chứng `file:dòng`) còn hơn 10 phát hiện gồng.** Mỗi điểm phải dẫn được bằng chứng — không dẫn được = bỏ, không viết.

🔁 **ĐỐI XỨNG — chống lệch âm (cũng nặng ngang):** soi lỗi mà **bỏ sót/hạ thấp cơ chế được thiết kế tốt** = lệch y hệt thổi phồng nhược. Khi đánh giá/chấm điểm: chủ động ĐI TÌM ưu điểm, steelman nó (vì sao nó giải đúng một việc KHÓ?), cân **trọng số ngang** với nhược — đừng để bản nhận xét thành bản kể tội một chiều. (Tác vụ review đầy đủ → theo `skills/review/index.md`.)

## Các trường hợp gần như luôn nên dùng tool (vì thường rơi vào ô đỏ)
- Lỗi lạ / thông báo lỗi cụ thể → tra nguyên văn + tài liệu chính thức trước khi đưa giả thuyết.
- Sắp **viết code dựa trên** cách dùng một API/thư viện mình không chắc → tra tài liệu, đừng viết theo trí nhớ.
- Sắp chốt **nguyên nhân gốc** hoặc **hướng thiết kế** lớn → xác minh bằng codebase/dữ liệu thật.

## Ranh giới (chống lạm dụng tool)
- Việc hiển nhiên / đã đủ bằng chứng → KHÔNG cần tool, trả lời luôn.
- Tool để **lấy bằng chứng**, không thay suy luận — vẫn phải tự phân tích kết quả.
- Đừng tra đi tra lại cùng một thứ; một lần đủ kết luận thì dừng.

> Tinh thần: thà tốn thời gian xác minh khi rủi ro cao còn hơn đoán sai rồi làm lại — nhưng đừng tra cứu thừa khi đã chắc và sai cũng chẳng sao.
