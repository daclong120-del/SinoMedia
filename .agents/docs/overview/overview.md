# 🗺️ Overview — SinoMedia System

**SinoMedia** là hệ thống cào dữ liệu lai (Hybrid Crawler) và phân tích dữ liệu truyền thông mạng xã hội Trung Quốc quy mô lớn. Hệ thống hỗ trợ thu thập, lưu trữ, quản lý tác vụ và hiển thị trực quan thông tin từ các nền tảng lớn như Douyin, Xiaohongshu (XHS), Weibo, Zhihu, Bilibili, Kuaishou và Baidu Tieba.

---

## 🏗️ 1. Dự án là gì?

SinoMedia là một giải pháp hoàn chỉnh từ đầu cuối (End-to-End) bao gồm ba phân hệ chính hoạt động phối hợp chặt chẽ:

1. **`crawler-pipeline` (Tầng Thu Thập)**:
   * Engine cào dữ liệu viết bằng **TypeScript/Node.js**, chạy dưới dạng một Queue Worker liên tục quét các tác vụ trong hàng đợi.
   * Sử dụng **Kiến trúc cào dữ liệu lai (Hybrid Crawler Architecture)**:
     * **Sign Service**: Chạy trình duyệt ẩn danh giả lập vân tay nâng cao (`CloakBrowser` dựa trên Playwright) để vượt các cơ chế chống bot (Cloudflare, CAPTCHA) nhằm đăng nhập và lấy cookie/chữ ký động (`a_bogus` của Douyin, `w_rid/wts` của Bilibili).
     * **Crawl Workers**: Sử dụng HTTP Client siêu nhẹ (`impit` hỗ trợ giả lập TLS/JA3 Fingerprint của Chrome) để gửi trực tiếp request cào hàng loạt dữ liệu hiệu năng cao dựa trên chữ ký đã lấy từ Sign Service.
   * Dữ liệu đa phương tiện (hình ảnh, video) được tải lên và lưu trữ tại **Cloudflare R2** thông qua cơ chế Presigned URL nhằm tối ưu hóa chi phí băng thông ($0 Egress Fee).

2. **`dashboard` (Tầng Quản Trị & Vận Hành)**:
   * Ứng dụng web được xây dựng bằng framework **Next.js**, giao tiếp trực tiếp với **Supabase JS SDK** ở chế độ client-side.
   * Cung cấp giao diện quản lý danh sách nhiệm vụ cào (Task list), in log chạy thời gian thực từ worker qua kết nối WebSocket (Supabase Realtime), cấu hình xoay vòng tài khoản mạng xã hội (Account Pool), quản lý Proxy Pool và trực quan hóa các chỉ số thu thập.

3. **`Client App` (Tầng Người Dùng Cuối)**:
   * Ứng dụng di động đa nền tảng (iOS, Android, Web) được xây dựng bằng **Expo (React Native)** kết hợp với **NativeWind (Tailwind CSS)**.
   * Cho phép người dùng tra cứu, tìm kiếm bài đăng, thông tin tác giả và phân tích xu hướng sáng tạo nội dung dựa trên nguồn dữ liệu tập trung.

---

## 🎯 2. Mục Tiêu

* **Thu thập dữ liệu ổn định & liên tục**: Vượt qua các cơ chế chống bot cực kỳ nghiêm ngặt của các nền tảng mạng xã hội Trung Quốc mà không bị khóa tài khoản hoặc chặn IP.
* **Tự động hóa & Tối ưu hóa vận hành**: Quản lý tập trung hàng trăm tài khoản crawl (Account Pool) và danh sách proxy (Proxy Pool), tự động xoay vòng tài khoản khi bị hạn chế (rate limit) hoặc hết hạn cookie.
* **Kiểm soát trùng lặp nguyên tử**: Sử dụng hàm RPC trên database (`create_crawler_tasks`) để đảm bảo không tạo trùng lặp các tác vụ đang chạy hoặc đang chờ xử lý.
* **Đồng bộ hóa thời gian thực**: Cập nhật tức thời trạng thái crawler và in log thời gian thực lên Dashboard giúp quản trị viên dễ dàng theo dõi và xử lý sự cố.

---

## 🚫 3. Phạm Vi & Non-Goals

### 🟢 Thuộc phạm vi (In-Scope)
* Thu thập dữ liệu từ **7 nền tảng**: Douyin, Bilibili, Xiaohongshu, Weibo, Kuaishou, Zhihu, Baidu Tieba.
* Thu thập dữ liệu chi tiết của:
  * **Tác giả (Authors)**: Tên hiển thị, lượt follow/following, giới tính, tiểu sử, vị trí IP, avatar.
  * **Bài viết (Posts/Notes)**: Tiêu đề, mô tả, ngày đăng, lượt tương tác (like, view, comment) và tệp tin hình ảnh/video đi kèm.
  * **Bình luận (Comments)**: Nội dung bình luận, lượt thích bình luận, bao gồm cả bình luận cấp 1 (Parent) và bình luận cấp 2 (Replies).
* Quản lý trạng thái và cấu hình crawler từ Dashboard (bật/tắt chế độ headless, cấu hình cào bình luận, gắn tag phân loại, ngôn ngữ).

### 🔴 Không thuộc phạm vi (Non-Goals)
* Không xây dựng các tính năng tương tác tự động như tự động đăng bài (auto-post), tự động thích/theo dõi (auto-like/follow), hoặc bình luận rác (spam comment) lên các nền tảng nguồn.
* Không tự xây dựng hạ tầng máy chủ Proxy riêng (chỉ tiếp nhận cấu hình và sử dụng Proxy Pool từ nhà cung cấp ngoài).

---

## 👥 4. Người Dùng Mục Tiêu

1. **Nhà sáng tạo nội dung (Content Creators) & Marketers**:
   * Theo dõi và phân tích các nội dung đang thịnh hành (trends) tại Trung Quốc để tìm kiếm ý tưởng sáng tạo hoặc khảo sát thị trường trước khi thực hiện các chiến dịch marketing tại Đông Nam Á.
2. **Nhà phân tích dữ liệu (Data Analysts)**:
   * Thu thập dữ liệu truyền thông quy mô lớn phục vụ cho các nghiên cứu thị trường, phân tích hành vi người dùng và khảo sát ý kiến cộng đồng.
3. **Đội ngũ vận hành (Operators)**:
   * Giám sát tình trạng hoạt động của hệ thống crawler, cập nhật thông tin cookie tài khoản, theo dõi sức khỏe proxy và xử lý các lỗi phát sinh trong quá trình cào dữ liệu.