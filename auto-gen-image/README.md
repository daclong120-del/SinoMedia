# Auto Gen Image - ChatGPT Hybrid Client & Open Responses Client

Tài liệu này hướng dẫn cách cấu hình và sử dụng bộ công cụ giao tiếp với ChatGPT qua cơ chế Hybrid Client (vừa giữ được tính bảo mật chống bot Cloudflare/Sentinel vừa chạy ngầm gọn nhẹ qua Terminal) và Open Responses Client.

---

## 1. ChatGPT Hybrid Client (Chạy trực tiếp với chatgpt.com)

Để vượt qua hệ thống bảo mật **Cloudflare Turnstile** và **Sentinel Proof-of-Work (PoW)** cực kỳ phức tạp trên ChatGPT Web, công cụ sử dụng cơ chế kết hợp trình duyệt ẩn (Playwright Stealth Mode) và tái sử dụng cookie/phiên đăng nhập.

### Bước 1: Khởi tạo và Đăng nhập (Chỉ cần làm một lần)

Khởi chạy trình duyệt Chromium có giao diện (headed) với Stealth Mode để thực hiện đăng nhập và lưu phiên làm việc:

```powershell
npm run browser:login
```

* **Cách thức hoạt động:** Trình duyệt sẽ mở ra trang chủ ChatGPT. Bạn hãy thực hiện đăng nhập bình thường. Khi đăng nhập thành công và trang chủ Chat hiển thị, script sẽ tự động chụp và trích xuất toàn bộ Cookies lưu vào `cookie.json` cùng với Access Token vào `session.json`, sau đó tự động đóng trình duyệt.

### Bước 2: Gửi tin nhắn ẩn danh (Chạy ngầm qua Terminal)

Khi đã lưu phiên thành công, bạn có thể trò chuyện trực tiếp từ Terminal mà không cần hiển thị giao diện trình duyệt:

```powershell
npm run browser:chat -- --message "Tin nhắn của bạn"
```

* **Tự động tải xuống ảnh từ DALL-E:** Nếu bạn yêu cầu ChatGPT tạo ảnh (ví dụ: *"Tạo một bức ảnh nghệ thuật bất kỳ tỷ lệ 1:1"*), script sẽ tự động phát hiện URL ảnh DALL-E được tạo ra, tải trực tiếp dữ liệu ảnh dưới dạng Base64 từ ngữ cảnh trình duyệt và lưu thành file PNG cục bộ trong thư mục `responses/`.
* **Cấu hình tùy chọn:**
  * `--message` hoặc `-m`: Nội dung tin nhắn gửi đi (Mặc định: `"hello"`).
  * `--headed`: Khởi chạy hiển thị trình duyệt nếu muốn theo dõi trực quan quá trình gõ chữ và phản hồi (Mặc định là chạy ngầm hoàn toàn - headless).
  * `--timeout`: Thời gian tối đa chờ phản hồi tính bằng mili-giây (Mặc định: `60000` - 60 giây).
  * `--cookies`: Đường dẫn tới file chứa cookies (Mặc định: `cookie.json`).

---

## 2. Open Responses Client (Gọi Mock API nội bộ)

Công cụ TypeScript gọi HTTP thuần túy tới máy chủ Open Responses nội bộ mà không cần Chromium hay cookie.

### Kiến trúc hoạt động

```text
auto-gen-image (Terminal)
  -> HTTP POST http://localhost:8080/responses
    -> open-responses local server
      -> Model Provider được cấu hình (OpenRouter, DeepSeek, v.v.)
        -> Phản hồi văn bản trả về Terminal
```

### Cách khởi chạy

1. Chạy Open Responses Server trước (Repo được clone tại `external/open-responses`):
   ```powershell
   cd D:\Python\SinoMedia\external\open-responses
   npx -y open-responses init
   npx -y open-responses start
   ```
2. Thực hiện gọi chat qua HTTP Call:
   ```powershell
   cd D:\Python\SinoMedia\auto-gen-image
   npm run responses:chat -- --message "hello"
   ```
3. Sử dụng DeepSeek hoặc model khác thông qua server:
   ```powershell
   npm run responses:chat -- --model "openrouter/deepseek/deepseek-r1" --message "hello"
   ```

---

## 3. Cấu trúc thư mục đầu ra (Output Files)

Tất cả các tài nguyên tải về hoặc lịch sử hội thoại sẽ được lưu trong thư mục `responses/`:
* `browser-chat-success-*.png`: Ảnh chụp màn hình khi gửi tin nhắn thành công (để debug/verify).
* `generated-image-*-1.png`: File ảnh gốc được DALL-E tạo ra và tải trực tiếp về máy.
* `error-screenshot-*.png`: Ảnh chụp màn hình tự động lưu lại khi xảy ra lỗi trong quá trình chạy ngầm.

---

## 4. Bảo mật và Lưu ý quan trọng

* **Tuyệt đối không commit:** `.env`, `cookie.json`, `session.json`, các file trong thư mục `responses/` và thư mục `browser-profile/` lên Git repository.
* **Thời hạn Cookie:** Phiên đăng nhập ChatGPT Web có thể hết hạn sau một khoảng thời gian (khoảng vài ngày đến vài tuần). Khi gặp lỗi đăng nhập hoặc không tìm thấy khung chat, hãy chạy lại lệnh `npm run browser:login` để cập nhật lại phiên mới.
