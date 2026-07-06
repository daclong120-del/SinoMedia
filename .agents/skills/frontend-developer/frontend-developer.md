# 🎨 FRONTEND DEVELOPER — Kiến thức chuyên ngành cho việc xây/sửa giao diện

> **Đọc kèm `skills/brainstorm/common.md` (luật dùng chung) + `hooks/tool-gate.md` (nền bằng chứng + one-shot) + `skills/workspace.md` (tài liệu/trạng thái).**
>
> Đây **KHÔNG phải** skill thay thế brainstorm. Đây là **LỚP CHUYÊN NGÀNH** chồng lên luồng `plan.md`/`phase.md`: khi việc thuộc về frontend, bạn vẫn đi đúng các bước brainstorm/phase — skill này bơm vào đó **câu hỏi đúng, nguồn grounding đúng, cây chi tiết đúng và checklist nghiệm thu đúng** cho UI.

## Khi nào dùng skill này
- Việc thuộc về **xây / sửa / tối ưu giao diện**: dựng component React/Vue/Angular/Svelte, layout responsive, quản lý state (Redux/Zustand/Context…), animation, form, data-viz, tích hợp design system.
- Tín hiệu: "làm trang/màn hình X", "component này", "responsive vỡ trên mobile", "app load lờ đờ khi dữ liệu lớn", "dựng theo Figma".

> Đang **HỎNG/lỗi** giao diện đã chạy được → vẫn vào `skills/brainstorm/debug.md` (luồng D1–D7), dùng skill này làm tham chiếu domain. Việc **mới/lớn** → `plan.md` chia phase. Đang **giữa một phase** → `phase.md`. Skill này luôn đi *kèm* các skill đó, không đứng một mình.

---

## ⛔ LUẬT CỨNG (riêng cho frontend — cộng dồn với luật chung)

1. **CẤM đoán framework/version/API.** Trước khi đề xuất hay viết bất cứ gì: ĐỌC `package.json` (framework + version thật), file component có sẵn, file design token/theme, `<dự-án>/.agents/docs/conventions.md`. React 18 ≠ 19, Vue 2 ≠ 3, app router ≠ pages router — đoán sai là viết lại. (theo `hooks/tool-gate.md` mục 🎯 NỀN THẬT.)
2. **A11y và responsive là CỔNG NGHIỆM THU, không phải "nice-to-have".** Một UI thiếu trạng thái focus, không dùng được bằng bàn phím, hoặc vỡ ở mobile = **chưa xong**, không phải "bản đẹp để sau".
3. **Bám design system/convention CÓ SẴN trước khi tự chế.** Có token màu/spacing/component dùng chung → tái dùng. Tự đặt màu hard-code cạnh một theme đang có = lỗi nhất quán, phải nêu rõ vì sao lệch.
4. **One-shot bằng dry-run UI:** trước khi chốt, "chạy thử trong đầu" đủ trạng thái (loading / empty / error / nhiều dữ liệu / nội dung dài tràn) và đủ breakpoint — bắt lỗi TRƯỚC khi giao, không chờ mở browser test (theo `hooks/tool-gate.md`).

---

## Bơm vào luồng phase — làm gì ở từng bước

### Ở B1 (hiểu + use case) — câu hỏi LỚP 1 đặc thù frontend
Hỏi **mức người dùng nhìn thấy/trải nghiệm**, trắc nghiệm A/B/C/D (theo `common.md` — Lớp 1). Ví dụ đúng:
- "Màn hình này xong trông thế nào / ưu tiên gì? A. Gọn tối giản · B. Nhiều thông tin một chỗ · C. Theo đúng Figma đã có · D. Chưa rõ, gợi ý giúp tôi."
- Hỏi rõ **các trạng thái** người dùng quan tâm: lúc đang tải? lúc rỗng/chưa có dữ liệu? lúc lỗi? trên điện thoại?
- ❌ KHÔNG bắt người dùng chọn Zustand hay Redux ở đây — đó là Lớp 2.

### Ở B4 (khám phá hướng) — phương án LỚP 2, dẫn bằng 👉 khuyến nghị
Trình bày 2–3 hướng kèm ưu/nhược + khuyến nghị (theo `common.md` — Lớp 2 & QUY TẮC TRÌNH BÀY HƯỚNG ĐI). Các trục thường phải chốt:
- **State:** local state / Context / store ngoài (Zustand, Redux Toolkit, Jotai) — chọn theo phạm vi chia sẻ & tần suất đổi, KHÔNG mặc định store toàn cục.
- **Data fetching:** thư viện có sẵn trong repo trước (React Query/SWR/RTK Query…); cache, optimistic update, trạng thái lỗi.
- **Styling:** bám hệ đang dùng (Tailwind / CSS Modules / CSS-in-JS) — đọc repo để biết, đừng áp cái mình quen.
- **Rendering:** CSR / SSR / SSG / RSC — chỉ chọn SSR/SSG khi có lý do thật (SEO, TTFB), tránh phức tạp sớm (YAGNI).
- ⚠️ Tra best-practice/tài liệu chính thức bằng tool TRƯỚC khi chốt (theo `hooks/tool-gate.md`) — không đề xuất theo trí nhớ.

### Ở B5.5 (cây "à, nghĩa là…") — đào sâu BẮT BUỘC cho từng deliverable UI
Đây là cổng dễ bị lướt nhất. Với MỖI component/màn hình sẽ tạo, đào tới quyết định có chủ đích (ghi ra `maps/<feature>.md`):

- **Trạng thái:** default · hover · focus(-visible) · active · disabled · loading · empty · error · selected — mỗi cái trông ra sao?
- **Responsive:** breakpoint nào? layout đổi thế nào ở mobile? chữ/ảnh co giãn ra sao? chạm (touch target ≥ 44px)?
- **Dữ liệu biên:** danh sách 0 phần tử? 10.000 phần tử (cần virtualize?)? chuỗi dài tràn? ảnh lỗi?
- **A11y:** thẻ ngữ nghĩa đúng chưa? thao tác được bằng bàn phím? `aria-*`/label cho control? thứ tự focus & focus trap (modal)? tương phản màu đạt WCAG AA?
- **Composition:** props/khe (slot) nào để tái dùng? tách component ở đâu? key trong list có ổn định không?

> Mỗi nhánh còn "để default cũng được" = CHƯA xong (theo `phase.md` B5.5).

---

## ✅ Checklist nghiệm thu frontend (tự kiểm trước khi báo xong)
- [ ] Đủ trạng thái: loading / empty / error / dữ liệu lớn / nội dung dài — đã xử lý, không chỉ "happy path".
- [ ] Responsive: kiểm tối thiểu mobile + desktop; không vỡ layout, không scroll ngang ngoài ý muốn.
- [ ] A11y: bàn phím dùng được; focus thấy rõ; ngữ nghĩa/`aria` đúng; tương phản ≥ WCAG AA.
- [ ] Bám design system: dùng token/component sẵn có; mọi giá trị hard-code lệch chuẩn đều có lý do.
- [ ] Hiệu năng (mục tiêu tham khảo, không tối ưu sớm khi chưa cần): tránh re-render thừa (memo/callback đúng chỗ), list lớn → virtualize, ảnh tối ưu, lazy-load/code-split phần nặng; coi chừng CLS (layout nhảy).
- [ ] TypeScript: props/dữ liệu có kiểu rõ; không `any` trôi nổi.
- [ ] Đã grounding: framework/version/API lấy từ `package.json`/code thật, KHÔNG từ trí nhớ.

> ⚠️ Test bằng **dry-run trong đầu** là chính. CẤM TUYỆT ĐỐI browser-use để test (kể cả khi được hỏi — `rules/rule.md`). Muốn chạy nguyên app để test → HỎI người dùng trước (`hooks/tool-gate.md`). Chạy thử nhỏ có mục tiêu (1 hàm/1 component qua script) thì được.

---

## Nguồn grounding frontend (đọc TRƯỚC khi viết)
- `package.json` — framework + version + thư viện state/styling/data thật đang có.
- Component & util có sẵn — tái dùng pattern, không phát minh lại.
- File theme/design token, `tailwind.config`, hoặc design system.
- `<dự-án>/.agents/docs/conventions.md` & `architecture.md` — quy ước đặt tên/cấu trúc của dự án.

---

## Tự kiểm trước khi gửi
- Có đang **đoán** framework/version/API thay vì đọc `package.json`/code không?
- Đã hỏi Lớp 1 (người dùng muốn gì) tách khỏi Lớp 2 (kỹ thuật) chưa, hay trộn lẫn?
- Cây "à nghĩa là" (B5.5) đã phủ **trạng thái + responsive + a11y + dữ liệu biên** chưa?
- Checklist nghiệm thu ở trên có nhánh nào còn bỏ ngỏ không?
- Có định viết code khi CHƯA qua cổng xin phép (`common.md`) không?

> Skill này KHÔNG bỏ qua bất kỳ cổng nào của brainstorm/phase — nó chỉ làm cho từng cổng đó **đúng chất frontend**.
