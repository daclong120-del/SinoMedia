# Thiết kế Phase 1: Tối ưu hóa Crawler (Mục 3, 6, 7)

## 1. Mục 3: Chặn tài nguyên thừa (Tiết kiệm băng thông & RAM)

### Vị trí sửa đổi:
* File: `d:\Python\expo-supabase-ai-template\crawler-pipeline\src\crawl\client.ts`
* Hàm: `getBrowserPage()`

### Chi tiết thay đổi:
Thêm chặn các resource `image`, `media`, `font`, `stylesheet` sau khi khởi tạo `browserPage`:
```typescript
  browserPage = pages[0] || (await browserContext.newPage());
  
  // Chặn tài nguyên thừa để tối ưu hóa băng thông proxy và RAM của trình duyệt
  await browserPage.route("**/*", (route: any) => {
    const resourceType = route.request().resourceType();
    if (["image", "media", "font", "stylesheet"].includes(resourceType)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  browserPage.on("console", (msg: any) => console.log("PAGE LOG:", msg.text()));
```

---

## 2. Mục 6: Tránh tải trùng lặp trên R2 (Deduplication)

### Vị trí sửa đổi 1:
* File: `d:\Python\expo-supabase-ai-template\crawler-pipeline\src\store\r2_uploader.ts`

### Chi tiết thay đổi 1:
Xuất thêm hàm `checkMediaExistsInR2` để kiểm tra sự tồn tại của file trước khi download và upload:
```typescript
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

// ...

/**
 * # Kiểm tra xem tệp tin Media đã tồn tại trên Cloudflare R2 chưa
 */
export async function checkMediaExistsInR2(
  platform: string,
  platformId: string,
  filename: string
): Promise<boolean> {
  const key = `${platform}/${platformId}/${filename}`;
  try {
    const command = new HeadObjectCommand({
      Bucket: CONFIG.r2.bucketName,
      Key: key,
    });
    await s3.send(command);
    return true;
  } catch (err: any) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    return false;
  }
}
```

### Vị trí sửa đổi 2:
* File: `d:\Python\expo-supabase-ai-template\crawler-pipeline\src\crawl\douyin.ts`

### Chi tiết thay đổi 2:
Import `checkMediaExistsInR2` từ `../store/r2_uploader.js` và áp dụng kiểm tra trước khi download/upload trong hàm `persistAweme`:
```typescript
import { uploadMediaToR2, checkMediaExistsInR2 } from "../store/r2_uploader.js";

// ... Trong persistAweme:
  const awemeId = detail.aweme_id;
  const authorData = detail.author;
  let avatarUrlR2 = "";
  if (authorData) {
    const rawAvatarUrl = authorData.avatar_thumb?.url_list?.[0] || authorData.avatar_larger?.url_list?.[0];
    if (rawAvatarUrl) {
      const avatarFilename = "avatar.jpg";
      const avatarKey = `douyin/${authorData.sec_uid || "unknown"}/${avatarFilename}`;
      try {
        const exists = await checkMediaExistsInR2("douyin", authorData.sec_uid || "unknown", avatarFilename);
        if (exists) {
          avatarUrlR2 = avatarKey;
        } else {
          const avatarBuf = await downloadMedia(rawAvatarUrl);
          avatarUrlR2 = await uploadMediaToR2("douyin", authorData.sec_uid || "unknown", avatarFilename, avatarBuf, "image/jpeg");
        }
      } catch {}
    }
  }
```
*(Làm tương tự cho video, cover, và list images)*.

---

## 3. Mục 7: Thêm lớp Validate dữ liệu (Zod-like Validation)

### Vị trí sửa đổi:
* File: `d:\Python\expo-supabase-ai-template\crawler-pipeline\src\crawl\douyin.ts`

### Chi tiết thay đổi:
Thêm các hàm kiểm tra kiểu dữ liệu của `aweme_detail` và `user_profile` nhằm phát hiện sớm lỗi thay đổi cấu trúc API:
```typescript
function validateAwemeDetail(detail: any): DouyinAweme {
  if (!detail || typeof detail !== "object") {
    throw new Error("Dữ liệu chi tiết video không hợp lệ (không phải object)");
  }
  if (!detail.aweme_id || typeof detail.aweme_id !== "string") {
    throw new Error("Dữ liệu chi tiết video thiếu aweme_id hoặc aweme_id không phải string");
  }
  if (detail.video && typeof detail.video !== "object") {
    throw new Error(`Video ${detail.aweme_id} chứa trường video không hợp lệ`);
  }
  if (detail.statistics && typeof detail.statistics !== "object") {
    throw new Error(`Video ${detail.aweme_id} chứa trường statistics không hợp lệ`);
  }
  return detail as DouyinAweme;
}

function validateUserProfile(res: any): void {
  if (!res || typeof res !== "object") {
    throw new Error("Dữ liệu profile creator không hợp lệ");
  }
  if (!res.user || typeof res.user !== "object") {
    throw new Error("Dữ liệu profile creator thiếu thông tin user");
  }
  if (!res.user.sec_uid || typeof res.user.sec_uid !== "string") {
    throw new Error("Dữ liệu profile creator thiếu sec_uid hợp lệ");
  }
}
```
Và bọc các kết quả gọi API thông qua các hàm này trong `crawlVideo`, `crawlCreator`, `crawlSearch`.
