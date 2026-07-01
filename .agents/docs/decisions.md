# Decision Log — expo-supabase-ai-template

## 2026-07-01 — Chuẩn hóa và Phân tách biến môi trường (Client & Serverless)  [initiative: refactor-env-config]
- **Bối cảnh:** Các file cấu hình môi trường `.env` và `.env.example` bị lẫn cấu hình của dự án Crawler cũ (MySQL, Redis, Proxy...). Cần làm sạch và đảm bảo an toàn bảo mật cho Client.
- **Phương án đã cân nhắc:**
  - **Phương án A:** Tách riêng root `.env` cho Expo Client (chỉ gồm `EXPO_PUBLIC_` variables) và `supabase/.env.local` cho Edge Functions (gồm OpenAI, Cloudflare R2).
  - **Phương án B:** Gộp chung toàn bộ cấu hình sạch ở root `.env`.
  - **Phương án C:** Trả về trạng thái mặc định ban đầu chỉ có Supabase URL & Anon Key ở root.
- **Chọn Phương án A vì:** Giúp phân tách rõ ràng trách nhiệm của Client (Expo) và Serverless Backend (Edge Functions). Client chỉ tải các biến công khai cần thiết, tránh rò rỉ mã bảo mật R2/OpenAI vốn chỉ cần thực thi ở server-side.