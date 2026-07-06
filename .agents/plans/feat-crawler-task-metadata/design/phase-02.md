# 🎨 DESIGN — Phase 2: Nâng cấp Giao diện Web (Frontend Modal & Task UI)

Tài liệu thiết kế chi tiết cho việc tích hợp cấu hình metadata và tags vào giao diện Dashboard.

## 1. Thiết kế Giao diện

### A. Component `TagInput` (`dashboard/components/dashboard/TagInput.tsx`)
```tsx
import React, { useState, KeyboardEvent, ClipboardEvent } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ tags, onChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTags = (newTagsStr: string) => {
    // Tách bằng dấu phẩy, chấm phẩy hoặc khoảng trắng
    const splitTags = newTagsStr
      .split(/[\s,;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !tags.includes(t));

    if (splitTags.length > 0) {
      onChange([...tags, ...splitTags]);
    }
    setInputValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTags(inputValue);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    addTags(pastedText);
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1.5 w-full border border-border rounded-lg bg-background min-h-[38px] focus-within:border-primary transition-colors">
      {tags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md text-xs bg-muted text-card-foreground border border-border"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="hover:bg-muted-foreground/10 rounded-full p-0.5 transition-colors cursor-pointer"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 bg-transparent px-2 py-0.5 text-xs text-foreground placeholder:text-muted-foreground outline-none border-none min-w-[120px]"
      />
    </div>
  );
}
```

### B. Thay đổi Modal trong `TasksPage`
*   Thay thế input tags thông thường bằng `<TagInput tags={newTags} onChange={setNewTags} placeholder="Ví dụ: tin_tuc, hot, giải_trí" />`.
*   Tích hợp dropdown ngôn ngữ:
    ```tsx
    const LANGUAGE_MAP: Record<string, string> = {
      "Auto": "auto",
      "Trung Quốc (zh)": "zh",
      "Tiếng Anh (en)": "en",
      "Tiếng Việt (vi)": "vi"
    };
    ```
*   Thêm UI cho các checkbox cào bình luận, cào bình luận phụ, chạy headless, tải media R2.

### C. Thay đổi Bảng danh sách Task
*   Thêm tiêu đề cột `<th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Cấu hình & Nhãn</th>`.
*   Hiển thị thông tin cột tương ứng cho từng dòng `td`:
    *   Các nhãn cấu hình chạy: `headless`/`headful`, `comments`, `lang: zh`.
    *   Các nhãn tags bài đăng: `#tag1`, `#tag2`...

---

## 2. Luồng dữ liệu (Data Flow)
1. Người dùng cấu hình các trường nâng cao và nhấn **Tạo nhiệm vụ**.
2. Frontend gộp các tham số cấu hình chạy và tags thành object:
   ```json
   {
     "tags": ["tin_tuc", "kinh_te"],
     "language": "zh",
     "crawl_comments": true,
     "crawl_sub_comments": false,
     "headless": true,
     "upload_r2": true
   }
   ```
3. Payload này được lưu vào trường `metadata` của từng task trong mảng nhiệm vụ gửi qua RPC `create_crawler_tasks`.
4. Cơ sở dữ liệu Supabase thực thi RPC, trích xuất và lưu cột `metadata` dạng JSONB.
5. Danh sách Task tự động được cập nhật qua Supabase Realtime, render dữ liệu `metadata` lên giao diện bảng.
