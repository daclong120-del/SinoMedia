# SinoMedia

Tài liệu dự án nằm trong [docs/](docs/README.md). Nếu bạn là người hoặc AI agent mới vào repo, đọc các file này trước:

1. [Project Status](docs/project-status.md) — đã làm gì, trang nào hoạt động, trang nào còn phác thảo.
2. [Roadmap](docs/roadmap.md) — hướng crawler worker, desktop app và video downloader service.
3. [Agent Handbook](docs/agent-handbook.md) — luật làm việc, ràng buộc kiến trúc và bẫy đã biết.
4. [Unified Architecture](docs/architecture/architecture.md) — kiến trúc hệ thống đã khóa.
5. [Decision Log](docs/decisions.md) — lịch sử quyết định kỹ thuật.

Định hướng hiện tại: Dashboard là control plane, `crawler-pipeline` là worker độc lập, Supabase là data/control plane, media ưu tiên external embed/link gốc khi platform hỗ trợ, R2 chỉ là archive/cache tùy chọn. Desktop app được đóng gói bằng Pake trước và sau này có thể kích hoạt thêm local/remote worker hoặc video downloader service.
