# SinoMedia Docs

Trang này là cửa vào cho tài liệu hiện hành của SinoMedia. Nếu có mâu thuẫn giữa tài liệu cũ và tài liệu mới, ưu tiên đọc theo thứ tự dưới đây.

## Source of truth

1. [Project Status](project-status.md) — trạng thái tính năng, trang đã hoạt động, trang còn phác thảo, việc đang dang dở.
2. [Roadmap](roadmap.md) — hướng phát triển crawler worker, desktop app, local/remote worker và video downloader service.
3. [Agent Handbook](agent-handbook.md) — luật làm việc cho AI agent, ràng buộc kiến trúc, các bẫy đã biết.
4. [Unified Architecture](architecture/architecture.md) — kiến trúc hệ thống đã khóa.
5. [Decision Log](decisions.md) — lịch sử quyết định kỹ thuật.

## Architecture deep dives

- [Crawler Hybrid Architecture](architecture/crawler-hybrid-architecture.md)
- [Client Storage Strategy](architecture/client-storage-strategy.md)
- [Account Rotation Douyin Integration](architecture/account-rotation-douyin-integration.md)
- [Settings Redesign Structure](architecture/settings-redesign-structure.md)
- [Creative Media Refactor Plan](architecture/creative-media-refactor-plan.md)
- [Embedded Iframe Player Strategy](architecture/embedded-iframe-player-strategy.md)
- [Role Management Strategy](architecture/role-management.md)

## Workflows

- [Crawler order -> R2 workflow](workflows/kien-truc-crawl-order-r2.svg)
- [Dashboard -> Supabase workflow](workflows/kien-truc-moi-dashboard-supabase.svg)

## Maintenance rule

Khi một PR/phiên làm việc thay đổi hành vi dự án, cập nhật ít nhất một trong các file sau:

- `docs/project-status.md` nếu thay đổi trạng thái tính năng/trang.
- `docs/roadmap.md` nếu thay đổi hướng đi hoặc thứ tự ưu tiên.
- `docs/agent-handbook.md` nếu phát hiện bẫy/ràng buộc mới cho AI agent.
- `docs/decisions.md` nếu có quyết định kiến trúc đáng lưu lại.
