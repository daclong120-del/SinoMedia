# Design — Phase 3: Cập nhật tài liệu và meta của dự án

Kế hoạch chi tiết để loại bỏ toàn bộ các ghi chép về OpenAI trong tài liệu kỹ thuật của dự án.

## Proposed Changes

### 1. package.json Description
- **Modify**: [package.json](file:///D:/Python/expo-supabase-ai-template/package.json)
- **Change**: Xóa phần OpenAI trong trường `description`.

### 2. README.md
- **Modify**: [README.md](file:///D:/Python/expo-supabase-ai-template/README.md)
- **Changes**:
  - Đổi tiêu đề chính từ `🚀 Expo + Supabase + OpenAI Template` thành `🚀 Expo + Supabase Template`.
  - Mô tả ngắn gọn: Gỡ bỏ cụm từ ", and OpenAI integration".
  - Phần Features: Xóa toàn bộ phần `🤖 AI Integration`.
  - Phần Project Structure: Xóa dòng `├── openai.tsx     # AI assistant` và `├── functions/openai/      # Edge Function for OpenAI integration`.
  - Phần Tech Stack: Xóa dòng `| **AI**        | OpenAI GPT-3.5-turbo                   |`.
  - Phần Quick Start: Xóa yêu cầu `OpenAI API Key` và hướng dẫn chạy lệnh `supabase functions serve openai`.
  - Phần App Features: Xóa toàn bộ phần `🤖 AI Assistant`.
  - Phần Deployment: Xóa bước `supabase functions deploy openai` và thiết lập secret `OPENAI_API_KEY`.
  - Phần Acknowledgments: Xóa dòng `- AI by [OpenAI](https://openai.com/)`.

### 3. DATABASE.md
- **Modify**: [DATABASE.md](file:///D:/Python/expo-supabase-ai-template/DATABASE.md)
- **Change**: Loại bỏ phần khai báo môi trường `OPENAI_API_KEY` trong mục `🔑 Environment Variables`.

## Verification Plan

- Đọc lại nội dung các file sau khi thay đổi để đảm bảo không còn sót từ khóa "OpenAI" nào.
