# 🗺️ MAP — Web UI Implementation Details (Phase 2)

Cây phân tích "à, nghĩa là..." cho việc nâng cấp giao diện Web trong Phase 2:

## 1. Thành phần `TagInput` Component
*   **Mục đích**: Nhập nhãn dưới dạng chip trực quan, hỗ trợ nhập liệu nhanh bằng cách paste chuỗi.
*   **À, nghĩa là...**
    *   Cần tạo một React component độc lập tại `dashboard/components/dashboard/TagInput.tsx`.
    *   👉 **Props**:
        *   `tags: string[]`: Danh sách tag hiện tại.
        *   `onChange: (tags: string[]) => void`: Hàm callback khi tag thay đổi.
        *   `placeholder?: string`: Chuỗi gợi ý khi ô trống.
    *   👉 **Xử lý phím (Keyboard Interaction)**:
        *   Khi gõ phím `Enter` hoặc `,` (dấu phẩy): Lấy chuỗi hiện tại ở input, cắt tỉa khoảng trắng (`trim`), kiểm tra trùng lặp. Nếu hợp lệ, thêm vào danh sách và xóa sạch text trong input.
        *   Ngăn chặn hành vi mặc định của phím `Enter` (không cho submit form cha).
    *   👉 **Xử lý Paste (Paste Event)**:
        *   Lắng nghe sự kiện `onPaste`.
        *   Tách chuỗi paste bằng regex `[\s,;]+` (dấu phẩy, dấu chấm phẩy, khoảng trắng).
        *   Lọc bỏ phần tử rỗng và trùng lặp.
        *   Thêm trực tiếp vào danh sách chip hiện tại, xóa sạch input.
    *   👉 **Xử lý Xóa (Remove Chip)**:
        *   Mỗi chip hiển thị có nút `x` (Lucide Icon `X` hoặc text).
        *   Nhấp vào nút `x` sẽ xóa tag đó ra khỏi mảng.
    *   👉 **Giao diện & Style**:
        *   Đường viền, nền và màu sắc đồng bộ với Tailwind CSS của Dashboard.
        *   Responsive: Các tag tự động xuống dòng (`flex flex-wrap gap-1.5`) khi ô nhập chật.

## 2. Modal Tạo Nhiệm Vụ Mới
*   **Mục đích**: Tích hợp trường nhập nâng cao và truyền cấu hình vào payload.
*   **À, nghĩa là...**
    *   Cần thêm các state cục bộ tại `dashboard/app/(main)/dash/tasks/page.tsx`:
        *   `newTags: string[]` (Mặc định: `[]`)
        *   `newLanguage: string` (Mặc định: `"Auto"`)
        *   `crawlComments: boolean` (Mặc định: `true`)
        *   `crawlSubComments: boolean` (Mặc định: `true`)
        *   `headlessMode: boolean` (Mặc định: `true`)
        *   `uploadR2: boolean` (Mặc định: `true`)
    *   👉 **Giao diện**:
        *   Thêm trường `Tags` và `Language` nằm song song hoặc xếp lớp trong nhóm cấu hình đầu ra.
        *   Thêm nhóm các checkbox tùy chọn chạy (Headless, Crawl Comments, Crawl Sub-comments, Upload R2).
        *   Chỉ hiển thị Checkbox cào bình luận phụ nếu cào bình luận chính được chọn.
    *   👉 **Xử lý Submit**:
        *   Khi submit, chuyển `newLanguage` qua mã tương ứng (`zh`, `en`, `vi`, `auto`).
        *   Ghép toàn bộ cấu hình vào object `metadata` và gửi cùng `createTasksBulk` lên database qua RPC.
        *   Khi tạo thành công: reset toàn bộ state phụ về giá trị mặc định ban đầu.

## 3. Bảng Danh Sách Task
*   **Mục đích**: Hiển thị trực quan cấu hình và tags của task.
*   **À, nghĩa là...**
    *   Thêm một cột `Cấu hình & Nhãn` vào bảng table:
        *   Thêm tiêu đề cột vào `thead`.
        *   Thêm ô `td` tương ứng hiển thị danh sách các badge cấu hình (`headless`/`headful`, `comments`, `lang: xx`) và các tags dưới dạng `#tag`.
        *   Tối ưu hóa responsive để tags tự động xuống dòng và không làm méo mó cột khác.
