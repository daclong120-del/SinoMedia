# Design — Phase 2: Dọn dẹp Edge Function và cấu hình Supabase Backend

Kế hoạch chi tiết để dọn dẹp các Edge Function và cấu hình của OpenAI bên phía Supabase.

## Proposed Changes

### 1. Delete Edge Function Files
- **Action**: Delete directory `supabase/functions/openai/`
- **Rationale**: Thư mục này chứa code chạy của OpenAI API.

### 2. Update config.toml
- **Modify**: [config.toml](file:///D:/Python/expo-supabase-ai-template/supabase/config.toml)
- **Changes**:
  - Gỡ dòng: `openai_api_key = "env(OPENAI_API_KEY)"`
  - Gỡ block:
    ```toml
    [functions.openai]
    enabled = true
    verify_jwt = true
    import_map = "./functions/openai/deno.json"
    entrypoint = "./functions/openai/index.ts"
    ```

### 3. Update Environment Files
- **Modify**: [supabase/.env.local](file:///D:/Python/expo-supabase-ai-template/supabase/.env.local) và [supabase/.env.local.example](file:///D:/Python/expo-supabase-ai-template/supabase/.env.local.example)
- **Change**: Xóa dòng `OPENAI_API_KEY` tương ứng để dọn sạch biến môi trường.

### 4. Update Client code comment
- **Modify**: [supabase.ts](file:///D:/Python/expo-supabase-ai-template/lib/supabase.ts)
- **Change**: Cập nhật comment ví dụ cho Edge Function sang tên hàm `hello`.

## Verification Plan

- Đảm bảo cấu hình trong `config.toml` hợp lệ.
