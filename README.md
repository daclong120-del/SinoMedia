# SinoMedia

Hệ thống SinoMedia là nền tảng quản lý và thu thập dữ liệu truyền thông, bao gồm 4 khối chính:
1. **Dashboard** (Next.js App Router): Control plane để quản lý task, tài khoản, proxy, cấu hình và hiển thị dữ liệu.
2. **Crawler Pipeline** (TypeScript Worker): Worker độc lập xử lý hàng đợi (queue) crawl, chuẩn hóa dữ liệu và ghi nhận vào database.
3. **Supabase & Media Storage**: Control plane và kho lưu trữ dữ liệu chính. Hỗ trợ lưu trữ video/hình ảnh tùy chọn qua Cloudflare R2 (archive/cache).
4. **Desktop App**: Phiên bản đóng gói ứng dụng (hiện đang dùng Pake làm draft) hỗ trợ chạy dashboard cục bộ và tích hợp local/remote worker trong tương lai.

---

## 📚 Tài liệu dự án

Nếu bạn là nhà phát triển hoặc AI agent mới tham gia dự án, hãy đọc qua thư mục tài liệu chính thức tại [docs/README.md](docs/README.md). Dưới đây là các tài liệu quan trọng theo thứ tự ưu tiên:

1. 📌 **[Project Status](docs/project-status.md)** — Cập nhật chi tiết trạng thái của từng trang Dashboard, các tính năng của Crawler và Desktop App (Done / Partial / Draft / Planned).
2. 🗺️ **[Roadmap](docs/roadmap.md)** — Định hướng phát triển crawler, desktop app và video downloader service.
3. 🤖 **[Agent Handbook](docs/agent-handbook.md)** — Sổ tay hướng dẫn cho AI agent: các quy định làm việc, ràng buộc kiến trúc kỹ thuật và bẫy phát triển đã biết.
4. 🏗️ **[Unified Architecture](docs/architecture/architecture.md)** — Tài liệu kiến trúc hệ thống đã thống nhất.
5. 📝 **[Decision Log](docs/decisions.md)** — Nhật ký lưu trữ các quyết định kỹ thuật lớn của dự án.

---

## 🛠️ Nguyên tắc & Định hướng kỹ thuật cốt lõi

- **Dashboard là Control Plane:** Dashboard chịu trách nhiệm quản lý, điều khiển và giám sát. Không đóng vai trò là crawler runtime.
- **Worker độc lập:** `crawler-pipeline` tự động lấy (claim) task từ Supabase qua RPC và cập nhật kết quả.
- **Tối ưu hóa Media Playback:** Ưu tiên sử dụng iframe nhúng trực tiếp hoặc link gốc của nền tảng (ví dụ: Embedded Iframe Player cho Bilibili qua BVID), không tự động tải toàn bộ video lên Cloudflare R2 trừ khi có yêu cầu đặc biệt.
- **Video Downloader Service:** Sẽ là một dịch vụ độc lập trong tương lai để xử lý tải file binary, không tích hợp trực tiếp vào UI để tránh chặn luồng hiển thị.

