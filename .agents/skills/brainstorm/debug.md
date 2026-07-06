# Brainstorming Debug — Tìm Nguyên Nhân Gốc Trước Khi Sửa

> Debug là **một loại brainstorm** — cho tình huống "đang hỏng".
> **Đọc kèm phần LÕI của `skills/brainstorm/common.md`** (triết lý, phân vai 🧑/🤖, hỏi 2 lớp, trình bày hướng, tool-gate).
> KHÔNG áp dụng phần *luật chia phase + roadmap* của common — debug có luồng riêng D1–D7 dưới đây.
> NHƯNG **VẪN áp dụng `🛑 CỔNG XIN PHÉP` (trước khi sửa, D5) và `🛑 CỔNG ĐÓNG PHASE` (trước khi báo "đã sửa xong", D7)** — chỉ khác: debug ghi `debug-log.md` thay cho `roadmap.md`.

## Mục đích

Biến một **triệu chứng lỗi mơ hồ** thành **nguyên nhân gốc đã được xác minh**, rồi mới sửa — thông qua điều tra có cấu trúc.

Vì sao tôi viết skill này? Vì tôi muốn **trị gốc, không vá ngọn**. One shot = one kill: tìm đúng nguyên nhân thật sự, sửa một lần là hết, không sửa mò rồi lỗi quay lại ở chỗ khác. Tôi muốn tốn thời gian **suy luận và xác minh** thay vì thử-sai bừa bãi.

Skill này tồn tại để ngăn chặn:
- sửa khi chưa hiểu nguyên nhân (vá triệu chứng)
- đoán mò, thử lung tung "biết đâu được"
- sửa nhầm chỗ, sinh thêm lỗi mới
- tuyên bố "đã sửa xong" mà chưa kiểm chứng

---

## ⚠️ Khi nào dùng skill này (thay vì Brainstorming xây mới)

Dùng **Brainstorming Debug** khi: *"có cái gì đó đang HỎNG / chạy sai / không như mong đợi"*.
Tín hiệu: "bị lỗi", "không chạy", "báo lỗi X", "chạy sai", "trước chạy được giờ hỏng", "crash", "chậm bất thường", "ra kết quả sai".

Dùng **Brainstorming (xây mới)** khi: *"muốn làm thêm / xây mới / thay đổi tính năng"*.

> Nếu chưa rõ thuộc loại nào → hỏi người dùng một câu để xác định trước khi đi tiếp.

---

## Chế độ vận hành

Bạn là một **người điều tra (debugger) cấp cao**, không phải người vá vội.

- KHÔNG sửa code khi chưa xác minh được nguyên nhân gốc
- KHÔNG đoán mò rồi sửa "thử xem sao"
- KHÔNG bỏ qua bước tái hiện và bước verify
- Mỗi giả thuyết phải có **bằng chứng**, không phải cảm tính

Nguyên tắc vàng: **Bằng chứng trước, giả thuyết sau, sửa sau cùng.**

**Luật sửa code:**
- Trong giai đoạn điều tra (D1→D4): chỉ được **đọc code, thêm log/print tạm để quan sát** — KHÔNG sửa logic để "thử fix".
- Chỉ được sửa thật khi đã qua **cổng xác minh nguyên nhân gốc (D4)** và người dùng cho phép.

---

## 🔁 Đây là một VÒNG LẶP điều tra

Debug hiếm khi đi thẳng. Nếu giả thuyết bị bác bỏ ở D4, **quay lại D3** (hoặc D2) với hiểu biết mới. Lặp đến khi tìm ra nguyên nhân gốc chắc chắn.

```
NHẬN BÁO LỖI
   ▼
D1. TÁI HIỆN + nắm triệu chứng
   ▼
D2. THU THẬP BẰNG CHỨNG (log, stack trace, mốc thời gian, phạm vi)
   ▼
D3. ĐƯA GIẢ THUYẾT nguyên nhân (xếp theo khả năng)
   ▼
D4. 🚪 CÔ LẬP & XÁC MINH nguyên nhân gốc  ──(bác bỏ)──► 🔁 quay lại D3/D2
   │  (đã chắc chắn)
   ▼
D5. THIẾT KẾ CÁCH SỬA (phân tích phương án, phản biện, xin phép)
   ▼
D6. SỬA + VERIFY (lỗi hết? có sinh lỗi mới không?)
   ▼
D7. 🛑 Báo cáo + ghi nhận bài học
```

---

# D1 — TÁI HIỆN & NẮM TRIỆU CHỨNG

> **Lập hồ sơ initiative (nếu lỗi đáng kể):** tạo `<dự-án>/.agents/plans/debug-<slug>/debug-log.md` (slug đặt theo triệu chứng, vd `debug-login-crash`) + thêm dòng vào `plans/INDEX.md` (loại `debug`, 🔄 = đang active). Mọi bằng chứng/giả thuyết/kết luận D1–D7 ghi dần vào `debug-log.md` (chính nó là con trỏ trạng thái của initiative debug này). Lỗi vặt sửa một nốt → được bỏ qua bước này nhưng **nói rõ "bỏ lập hồ sơ vì lỗi nhỏ"**.

Trước khi điều tra bất cứ thứ gì, phải hiểu chính xác lỗi là gì.

Hỏi người dùng (từng câu một, ngắn gọn):
- **Triệu chứng cụ thể**: nhìn thấy gì? thông báo lỗi ra sao? (xin nguyên văn nếu có)
- **Mong đợi đúng ra phải thế nào** vs **thực tế xảy ra gì**
- **Các bước tái hiện**: làm gì thì lỗi xuất hiện?
- **Tần suất**: luôn luôn, hay thỉnh thoảng (intermittent)?
- **Mốc thay đổi**: "trước chạy được giờ hỏng" → gần đây đổi gì? (deploy, đổi config, update lib, sửa code nào)
- **Phạm vi**: chỉ máy bạn hay mọi người? chỉ 1 trường hợp hay tất cả?

**Mục tiêu D1: tự mình tái hiện được lỗi.** Nếu chưa tái hiện được, đó là việc số 1 — không đoán nguyên nhân khi chưa thấy lỗi tận mắt (trừ khi không thể tái hiện, thì nói rõ và dựa vào bằng chứng gián tiếp ở D2).

> ⚠️ **Chẩn đoán người dùng tự đưa ra = GIẢ THUYẾT, KHÔNG phải sự thật.** Người báo lỗi (kể cả dev giỏi) thường kèm sẵn "nguyên nhân là do X, sửa bằng Y". Ghi nhận để xét ở D3 — nhưng PHẢI kiểm chứng/bác bỏ bằng bằng chứng (D2–D4), TUYỆT ĐỐI không nhận luôn làm gốc rồi sửa theo. Rất nhiều vụ sa lầy nhiều vòng vì cắm đầu sửa theo chẩn đoán sai của chính người báo.

---

# D2 — THU THẬP BẰNG CHỨNG

Thu thập dữ kiện khách quan **trước khi** đưa giả thuyết. Không suy diễn vội.

- Đọc **thông báo lỗi / stack trace** đầy đủ — lần ngược tới dòng code đầu tiên thuộc về dự án
- Xem **log** quanh thời điểm lỗi
- Xác định **đường đi của dữ liệu/điều khiển** tới chỗ lỗi (đọc code liên quan)
- Kiểm tra **đầu vào thực tế** gây lỗi (giá trị gì, null, rỗng, sai định dạng?)
- So sánh **trường hợp chạy đúng vs chạy sai** — khác nhau ở đâu?
- Nếu cần, **thêm log/print tạm** để quan sát giá trị tại các điểm nghi ngờ (đây là quan sát, KHÔNG phải sửa logic)
- **Theo `hooks/tool-gate.md`: tra cứu nguyên văn thông báo lỗi + tài liệu chính thức bằng tool TRƯỚC khi đưa giả thuyết — không đoán mò.** Có công cụ phân tích codebase thì dùng để xác minh luồng chạy thật.

Trình bày bằng chứng thu được cho người dùng (ngắn gọn) trước khi sang D3.

---

## 🔬 KỸ THUẬT: ĐẶT MÁY ĐO (Diagnostic Probe)

Dùng khi: **suy luận tĩnh đã cạn** (đọc hết code/tài liệu vẫn chưa chỉ được đích danh thủ phạm), HOẶC **bạn không được tự chạy app** (theo `rules/rule.md`) nên phải nhờ người dùng chạy. Thay vì đoán tiếp → **chế một dụng cụ đo** để moi SỰ THẬT từ lần chạy của người dùng.

Mỗi lần nhờ người dùng chạy lại là **đắt** (mất công, mất thời gian, dễ nản) → một lần chạy phải ra **tối đa** thông tin. Quy tắc làm máy đo:

- **CHỈ ĐỌC, không sửa state.** Máy đo quan sát, KHÔNG đụng vào logic/đối tượng đang chạy. Đụng vào là biến thành vá mò, và làm hỏng luôn dữ liệu đang đo.
- **Trả lời ĐÚNG MỘT câu hỏi còn thiếu.** Đừng log tất cả — tự hỏi *"mình còn thiếu đúng dữ kiện gì để chốt D4?"* rồi đo đúng cái đó (vd: "object nào đang null?", "giá trị X tại thời điểm Y là bao nhiêu?").
- **Gắn NHÃN tìm kiếm được**, vd `[DIAG]`, `[DIAG-MAP]`. Để người dùng lọc/copy đúng dòng cần thay vì lội cả màn hình log. (Log tiếng Việt có dấu theo rule.)
- **Lặp máy đo nếu lần đo đầu chưa đủ.** Lần 1 chưa bắt được thì nâng cấp: nếu đối tượng đã biến mất lúc bắt được (vd object bị huỷ → mất tên) → đo thêm phần *danh tính lúc còn sống* (vd lập bản đồ `id → tên` khi còn sống rồi đối chiếu lúc nó chết). Máy đo ĐƯỢC tiến hoá qua nhiều vòng — vì nó **đo**, không **vá**.
- **Dọn sau khi xong** (D6): gỡ máy đo khỏi code.

> 🧭 **Phân biệt cốt tử: máy đo ≠ bản vá.** Máy đo sinh *bằng chứng* để qua cổng D4 — hợp lệ trong giai đoạn điều tra. "Sửa thử logic xem hết lỗi không" là *vá mò khi chưa qua D4* — bị cấm. Nếu thấy mình đang đổi hành vi chương trình chứ không phải quan sát nó → bạn đang vá, không phải đo.

---

# D3 — ĐƯA GIẢ THUYẾT

## 🛑 CỔNG KHOANH VÙNG BẰNG QUAN SÁT — đừng đoán nơi lỗi, ĐO ra nó (HARD STOP)

> Áp dụng ở ĐẦU D3, mỗi khi triệu chứng là một KẾT QUẢ CUỐI ("X không hiện", "giá trị
> sai", "không chạy", "chậm bất thường").
>
> ⚠️ Cái bẫy đã làm hỏng nhiều vụ: AI khoá vào giả thuyết đầu tiên nghĩ ra, kiểm đúng nó,
> thấy ổn → "code đúng rồi mà sao vẫn lỗi" rồi kẹt — thủ phạm nằm ở thứ nó CHƯA BAO GIỜ
> nghĩ tới để soi.

### 🎯 NGUYÊN TẮC GỐC: tính "đầy đủ" KHÔNG đến từ liệt kê, mà từ QUAN SÁT

Đừng cố đạt đầy đủ bằng cách liệt kê thêm nguyên nhân — **luôn còn một loại bạn chưa
tưởng tượng ra** (cố vá bằng "nhớ liệt kê cả tầng X" là regress vô tận, không bao giờ đủ).
Đầy đủ đến từ chỗ khác:

> Đi dọc **đường đi THẬT** của dữ liệu/điều khiển — từ đầu vào tới triệu chứng — và tìm
> **điểm ĐẦU TIÊN nơi trạng thái QUAN SÁT ĐƯỢC lệch khỏi trạng thái MONG ĐỢI.** Lỗi nằm
> giữa checkpoint "còn đúng" cuối cùng và checkpoint "đã sai" đầu tiên. **Bất kể nó ở tầng
> nào — code, framework, runtime, render, driver — bạn THẤY nó lệch ở đó mà KHÔNG cần
> đã-nghĩ-ra nó.** Đây là thứ tóm được cái bất ngờ; liệt kê thì không.

### Luật cứng
1. **Dựng đường đi thật code → kết quả, đặt checkpoint, ĐO actual vs expected, bisect tới
   điểm lệch đầu.** Code bạn viết chỉ là mắt xích ĐẦU; soi mỗi tầng cho tới tầng output.
   Mỗi checkpoint hỏi: "ở đây giá trị/trạng thái ĐÚNG như tôi nghĩ chứ?" — rồi ĐO để biết,
   không tự trả lời bằng niềm tin.
2. **Danh sách yếu tố chỉ là SEED rẻ tiền để chọn chỗ đặt checkpoint đầu — KHÔNG phải nơi
   gánh tính đầy đủ.** Liệt kê thiếu cũng không sao: quan sát sẽ bắt được cái ngoài danh sách.
   Nên đừng tốn sức "liệt kê cho đủ"; tốn sức đặt phép đo đúng chỗ.
3. **Ô nào suy luận/đọc code không khẳng định nổi → máy đo (🔬 ở D2).** Một lần chạy đo
   nhiều checkpoint dọc đường đi, để biết khúc nào còn đúng / khúc nào đã sai.
4. **"Chỗ tôi nghĩ là thủ phạm hoá ra ĐÚNG" = chưa xong, mới loại một khúc.** Tiếp tục
   bisect về phía output. CẤM nhảy tới "mọi thứ đều đúng / bó tay".

### Self-check BẮT BUỘC — trước khi nói "tôi nghi X" hoặc "tôi bí"
> "Tôi đã QUAN SÁT được điểm lệch đầu tiên trên đường đi thật chưa, hay đang đoán nơi lỗi
>  từ niềm tin 'chỗ này chắc đúng'? Khúc nào tôi đang coi là đúng mà CHƯA đo?"
- Chưa khoanh được điểm lệch bằng quan sát → **chưa được nghi/bí.** Đặt phép đo tiếp.
- "Bó tay" mà có khúc chưa đo = chưa bó tay, là lười đo.

### Nhận diện cái bẫy
Nếu trong đầu định viết *"Code đúng rồi mà", "Lạ thật, mọi thứ đều ổn", "Chắc do <thứ DUY
NHẤT tôi nghĩ tới>"* → đó là tín hiệu **bạn đang ĐOÁN nơi lỗi từ niềm tin, chưa ĐO.** Dừng,
đi tìm điểm lệch đầu tiên bằng quan sát.

---

Khi đã khoanh được vùng/khúc chứa điểm lệch — dựa trên **bằng chứng quan sát được** (không phải cảm tính), xếp hạng các nguyên nhân khả dĩ TRONG vùng đó thành giả thuyết:

- Nêu **2–4 giả thuyết**, xếp theo **khả năng cao → thấp**
- Mỗi giả thuyết: *nếu đúng thì giải thích được bằng chứng nào*, và *cách kiểm chứng nhanh nhất*
- Đánh dấu 👉 giả thuyết khả nghi nhất + lý do

> Vì người dùng là dev, được trình bày kỹ thuật rõ ràng: chỉ ra file/hàm/dòng nghi ngờ, luồng dữ liệu, điều kiện kích hoạt.

---

# D4 — 🚪 CÔ LẬP & XÁC MINH NGUYÊN NHÂN GỐC (Cổng chặn cứng)

Đây là bước quan trọng nhất. **KHÔNG được sang D5 (sửa) cho tới khi qua được cổng này.**

- Kiểm chứng từng giả thuyết bằng cách **thu hẹp phạm vi**: tắt/cô lập từng phần, kiểm tra giá trị tại điểm nghi ngờ, bisect thay đổi gần đây nếu cần
- Tìm **bằng chứng dứt điểm**: chỉ ra chính xác *dòng code / điều kiện / dữ liệu nào* gây ra lỗi và **vì sao**
- Phân biệt **nguyên nhân gốc** với **triệu chứng**: hỏi "vì sao điều đó xảy ra?" cho tới khi tới gốc (5 Whys)
- **Đối chiếu với "anh em chạy tốt".** Tìm một thứ TƯƠNG TỰ đang CHẠY ĐÚNG (cùng loại, cùng cấu hình) rồi so với thứ đang hỏng: điểm KHÁC nhau khoanh vùng nguyên nhân; điểm GIỐNG nhau **bác bỏ** các giả thuyết sai. (Vd: hai đối tượng serialize y hệt nhau mà một cái chạy tốt → khác biệt nằm chỗ khác, KHÔNG phải ở serialize → loại ngay giả thuyết "serialize hỏng".)
- Nếu cần dữ liệu runtime mà suy luận tĩnh không cho → **đặt máy đo** (xem mục 🔬 ở D2) để lấy bằng chứng đích danh, thay vì đoán tiếp.
- Nếu bằng chứng **bác bỏ** giả thuyết → 🔁 quay lại D3 (hoặc D2 thu thập thêm)

**Tiêu chí qua cổng:** Bạn phải nói được một câu chắc chắn:
> "Nguyên nhân gốc là ___ (ở file:dòng), gây ra ___ vì ___. Bằng chứng: ___."

Thêm hai điều kiện bắt buộc cho câu đó:
- Đã **khoanh được điểm lệch đầu tiên bằng quan sát** (CỔNG ở đầu D3): chỉ ra checkpoint
  "còn đúng" cuối và checkpoint "đã sai" đầu, lỗi nằm giữa hai mốc đó.
- Với triệu chứng bạn KHÔNG tự quan sát được, `Bằng chứng:` phải là thứ **máy đo QUAN SÁT in ra** — KHÔNG nhận "đọc code thấy đúng" làm bằng chứng gốc.

Nếu chưa nói được câu đó với độ chắc chắn cao → **chưa được sửa.** Nói rõ cho người dùng phần còn chưa chắc và tiếp tục điều tra.

---

# D5 — THIẾT KẾ CÁCH SỬA

Đã biết nguyên nhân gốc → mới bàn cách sửa. (Mượn tinh thần "trình bày hướng đi" của Brainstorming xây mới.)

- Đề xuất **cách sửa**, ưu tiên trị **gốc** chứ không che triệu chứng
- Nếu có nhiều cách: nêu 2–3 phương án kèm **ưu/nhược**, dẫn đầu bằng 👉 khuyến nghị + lý do
- **Phản biện**: cách sửa này có tác dụng phụ ở đâu không? có chỗ nào khác cùng nguyên nhân gốc cần sửa luôn không?
- Cân nhắc: sửa tối thiểu đủ trị gốc (tránh đập đi xây lại không cần thiết — YAGNI)
- 🛑 **Xin phép trước khi sửa — RỒI KẾT THÚC LƯỢT NGAY.** Theo mục **🛑🛑 CỔNG XIN PHÉP = KẾT THÚC LƯỢT NGAY** của `skills/brainstorm/common.md`: câu xin phép là nội dung CUỐI CÙNG của lượt; sau nó **CẤM gọi bất kỳ tool nào** (kể cả đọc). CẤM bước sang D6 trong cùng lượt. Chờ người dùng nhắn GO-AHEAD ở lượt SAU.

---

# D6 — SỬA & VERIFY (Bắt buộc)

> ⚠️ Bước này **không bao giờ** chung lượt với D5. Chỉ chạy ở một LƯỢT MỚI, sau khi người dùng đã nhắn cho phép rõ ràng (xem "GO-AHEAD hợp lệ" trong common.md).

Sau khi được phép:

1. Thực hiện sửa đúng theo phương án đã chốt ở D5
2. **VERIFY lỗi đã hết**: chạy lại đúng các bước tái hiện ở D1 → xác nhận triệu chứng biến mất
3. **Kiểm tra hồi quy**: thay đổi này có làm hỏng chỗ khác không? (test liên quan, các trường hợp gần đó)
4. Gỡ bỏ log/print tạm đã thêm khi điều tra
5. Nếu lỗi VẪN còn:
   - 🔁 **Lần đầu quay lại** → trở về D3/D4 với hiểu biết mới.
   - 🚨 **RECURRENCE GATE — lần thứ hai trở lên** cùng họ lỗi quay lại sau khi đã sửa:
     **CẤM** sửa tiếp theo cùng hướng cũ.
     **BẮT BUỘC** trước khi D3 mới phải có ít nhất một trong ba:
     (a) đọc source thật của framework/lib liên quan (ThirdParty),
     (b) đặt máy đo `[DIAG]` lấy bằng chứng runtime chưa từng có,
     (c) đối chiếu đích danh với "anh em chạy tốt" — chỉ ra điểm khác biệt.
     Ghi vào `debug-log.md`: lần tái phát thứ N, đã thử gì, bằng chứng mới là gì.

> KHÔNG tuyên bố "đã sửa xong" nếu chưa chạy lại và quan sát lỗi biến mất. Nếu không thể chạy verify, nói rõ điều đó.

---

# D7 — 🛑 BÁO CÁO & BÀI HỌC

> 🛑 **CỔNG ĐÓNG PHASE áp dụng tại đây** (theo `skills/brainstorm/common.md`): CẤM tuyên bố "đã sửa xong" khi CHƯA gọi tool ghi đủ — `debug-<slug>/debug-log.md` (hoàn tất D1–D7) + `plans/INDEX.md` (initiative này → ✅). Báo cáo phải kèm **biên nhận** trích đúng 2 đường dẫn đó.

1. Báo cáo: nguyên nhân gốc là gì, đã sửa thế nào, đã verify ra sao — **kèm biên nhận đã ghi 3 file** ở trên.
2. **Hoàn tất `debug-log.md`** (nếu đã lập hồ sơ ở D1): triệu chứng → bằng chứng → nguyên nhân gốc → cách sửa → cách verify → bài học. Để lần sau gặp lại nhận ra ngay.
3. Nêu **rủi ro còn lại / chỗ nên theo dõi** nếu có.
4. Nếu việc debug phát sinh ra các vấn đề lớn hơn cần xây mới → chuyển sang skill **Brainstorming (xây mới)** (tạo initiative `feat-`/`refactor-` riêng).

---

# 📌 NGUYÊN TẮC XUYÊN SUỐT

- **Bằng chứng > cảm tính.** Mọi giả thuyết phải dựa trên dữ kiện quan sát được.
- **Một thay đổi một lần khi kiểm chứng.** Đổi nhiều thứ cùng lúc thì không biết cái nào có tác dụng.
- **Trị gốc, không vá ngọn.** Luôn hỏi "vì sao điều này xảy ra?" tới tận gốc.
- **🚩 Leo thang bản vá = tín hiệu SAI GỐC.** Nếu mỗi lần "sửa" lại là một phiên bản MẠNH HƠN của cùng một cách vá (quét dày hơn, hook thêm sự kiện, vá thêm field/trường hợp) mà lỗi vẫn quay lại → DỪNG NGAY. Đó là dấu hiệu bạn đang trị triệu chứng, chưa chạm gốc. Quay về D4, đặt máy đo lấy bằng chứng đích danh — đừng vá tiếp.
- **🔄 Recurrence Gate — cùng lỗi tái phát ≥2 lần = nguyên nhân gốc sai.** Nhận dạng: cùng triệu chứng quay lại SAU KHI đã sửa ≥1 lần. Phản ứng bắt buộc: DỪNG hướng vá hiện tại. Thu thập bằng chứng MỚI từ source thật (đọc framework, đặt máy đo, so anh-em-tốt) — KHÔNG được bắt đầu D5 mới nếu không có bằng chứng chưa từng có trước đó. Xem chi tiết tại D6 bước 5.
- **Suy luận tĩnh cạn thì ĐO, đừng đoán.** Hết cách suy ra từ đọc code mà vẫn chưa chắc → chuyển sang lấy bằng chứng runtime (máy đo `[DIAG]`), KHÔNG được đoán liều rồi sửa.
- **Người dùng là dev** → trình bày kỹ thuật thẳng thắn (file, dòng, luồng, log), không né tránh. Nhưng vẫn **dẫn dắt bằng phân tích + khuyến nghị**, không quăng phỏng đoán trống.
- **Hỏi từng câu một**, ưu tiên câu giúp thu hẹp nguyên nhân nhanh nhất.
- **Cổng D4 là bất khả xâm phạm:** chưa chắc nguyên nhân gốc thì chưa được sửa.
