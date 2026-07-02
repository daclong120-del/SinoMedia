# Design — Phase 1: Gỡ bỏ giao diện và định tuyến của AI Assistant

Kế hoạch chi tiết để loại bỏ phần giao diện và định tuyến liên quan đến OpenAI khỏi ứng dụng Expo.

## Proposed Changes

### 1. Delete Screen File
- **Action**: Delete file [openai.tsx](file:///D:/Python/expo-supabase-ai-template/src/app/(tabs)/openai.tsx)
- **Rationale**: File này chứa màn hình chat OpenAI. Xóa vì không dùng nữa.

### 2. Update Layout
- **Modify**: [_layout.tsx](file:///D:/Python/expo-supabase-ai-template/src/app/(tabs)/_layout.tsx)
- **Change**: Loại bỏ phần định nghĩa screen `openai` trong `<Tabs>` để tab này không còn hiển thị và điều hướng trên thanh điều hướng dưới.

### 3. Update Navigation Types
- **Modify**: [navigation.ts](file:///D:/Python/expo-supabase-ai-template/src/types/navigation.ts)
- **Change**: Xóa thuộc tính `openai: undefined;` khỏi kiểu dữ liệu `TabParamList`.

### 4. Update Home Dashboard
- **Modify**: [index.tsx](file:///D:/Python/expo-supabase-ai-template/src/app/(tabs)/index.tsx)
- **Change**:
  - Gỡ block action link dẫn đến màn hình `openai`.
  - Gỡ dòng giới thiệu checklist "AI assistant powered by OpenAI" trong danh sách tính năng.

## Verification Plan

- Đảm bảo ứng dụng vẫn biên dịch được và không bị lỗi kiểu dữ liệu (TypeScript) khi thiếu Route `openai`.
- Đảm bảo không còn bất kỳ tab hay liên kết nào dẫn tới `/openai` trên thiết bị/trình giả lập.
