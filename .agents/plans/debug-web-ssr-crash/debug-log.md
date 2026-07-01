# 🐞 DEBUG LOG — debug-web-ssr-crash   (cập nhật: 2026-07-01)

## Triệu chứng (D1)
Khi chạy lệnh `npm run web` (expo start --web), Metro Bundler bắt đầu tiến trình đóng gói cho Web nhưng gặp lỗi crash trong quá trình bundle server-side rendering (SSR):
```
ReferenceError: window is not defined
    at getValue (AsyncStorage.js:63:52)
```

## Bằng chứng thu thập (D2)
- Server logs từ background process chỉ ra rằng khi SupabaseAuthClient khởi tạo, nó gọi `AsyncStorage.getItem`.
- Trong file `lib/supabase.ts`, `@react-native-async-storage/async-storage` được import và truyền thẳng vào tùy chọn `auth.storage` của `createClient`.
- Trên môi trường Node.js (SSR), đối tượng `window` không tồn tại, dẫn đến `ReferenceError: window is not defined` khi thư viện AsyncStorage cố gắng truy cập localStorage trên Web.

## Giả thuyết (D3)
- **Giả thuyết 1 (Khuyên dùng)**: Do `lib/supabase.ts` truyền trực tiếp `AsyncStorage` mà không phân biệt nền tảng. Khi chạy static rendering (SSR) trên web, Node.js cố đánh giá AsyncStorage dẫn đến crash. Cần dùng custom storage adapter để kiểm tra an toàn sự tồn tại của `window` và localStorage trước khi truy cập.
- **Giả thuyết 2**: Do Expo Router đang bật chế độ static rendering (`"output": "static"` trong `app.json`), khiến Metro Bundler chạy code trong môi trường Node.js. Nếu đổi về `"output": "single"`, app sẽ chạy dạng SPA thuần tùy và không gặp lỗi này.

## Nguyên nhân gốc đã xác minh (D4) — file:dòng + vì sao + bằng chứng
- **File**: [supabase.ts](file:///d:/Python/expo-supabase-ai-template/lib/supabase.ts) dòng 15-43.
- **Vì sao**: File `lib/supabase.ts` thiết lập `AsyncStorage` làm storage mặc định cho cả Web và Mobile. Khi Expo Router build SSR, nó chạy file này trên Node.js. Vì Node.js không có `window.localStorage`, AsyncStorage bị lỗi ReferenceError.
- **Bằng chứng**: Stack trace lỗi hiển thị rõ ràng:
  ```
  ReferenceError: window is not defined
      at getValue (AsyncStorage.js:63:52)
      at Object.getItem (AsyncStorage.js:63:12)
  ```

## Cách sửa (D5)
- Cập nhật [supabase.ts](file:///d:/Python/expo-supabase-ai-template/lib/supabase.ts) để sử dụng một Custom Storage wrapper an toàn cho cả môi trường web/SSR/mobile.
- Chuyển cấu hình `"output": "static"` thành `"output": "single"` trong `app.json` để chạy dạng SPA nếu người dùng không cần tĩnh, tăng độ tương thích.

## Verify (D6)
- Đã sửa code và chạy lại `npm run web`. Server Metro bundler đã chạy thành công, bundle thành công cho Web mà không gặp bất kỳ lỗi nào.
- Ứng dụng hoạt động tại `http://localhost:8081`.

## Bài học (D7)
- Luôn kiểm tra môi trường Node.js (SSR) khi viết thư viện/cấu hình có sử dụng Web API (`window`, `document`, `localStorage`).
- Phân biệt cấu hình lưu trữ giữa Web (dùng localStorage) và Native (dùng AsyncStorage).
