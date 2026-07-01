import { CONFIG } from "../config.js";
import { loadSession } from "../sign/session_store.js";
import { signDetail } from "../sign/js_sign.js";
import { douyinRequest, downloadMedia } from "./client.js";
import { uploadMediaToR2 } from "../store/r2_uploader.js";
import { upsertAuthor, upsertPost } from "../store/supabase_writer.js";

const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * # Sinh webid ngẫu nhiên tương tự thuật toán của Douyin
 */
function getWebId(): string {
  function e(t: number | null): string {
    if (t !== null) {
      return String(t ^ (Math.floor(16 * Math.random()) >> Math.floor(t / 4)));
    } else {
      return [String(1e7), String(1e3), String(4e3), String(8e3), String(1e11)].join("-");
    }
  }
  const base = e(null);
  let result = "";
  for (let i = 0; i < base.length; i++) {
    const char = base[i];
    if (char === '0' || char === '1' || char === '8') {
      result += e(parseInt(char, 10));
    } else {
      result += char;
    }
  }
  return result.replace(/-/g, "").substring(0, 19);
}

/**
 * # Phân giải link ngắn v.douyin.com để lấy link đầy đủ chứa ID
 */
export async function resolveShortUrl(shortUrl: string): Promise<string> {
  if (!shortUrl.includes("v.douyin.com")) {
    return shortUrl;
  }
  try {
    const res = await fetch(shortUrl, { method: "GET", redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      return res.headers.get("location") || "";
    }
    return "";
  } catch (err) {
    throw new Error(`Lỗi phân giải short URL: ${(err as Error).message}`);
  }
}

/**
 * # Trích xuất aweme_id (ID video) từ URL Douyin bất kỳ
 */
export function extractAwemeId(url: string): string {
  if (/^\d+$/.test(url)) {
    return url;
  }
  const match = url.match(/\/video\/(\d+)/);
  if (match) {
    return match[1];
  }
  const modalMatch = url.match(/[?&]modal_id=(\d+)/);
  if (modalMatch) {
    return modalMatch[1];
  }
  throw new Error("Không thể trích xuất ID video từ URL cung cấp");
}

/**
 * # Cào chi tiết một video từ Douyin và thực hiện upload media + lưu DB
 */
export async function crawlVideo(urlOrId: string): Promise<void> {
  const session = await loadSession();
  if (!session) {
    throw new Error("Không tìm thấy session. Vui lòng chạy lệnh bootstrap session trước.");
  }

  const resolvedUrl = await resolveShortUrl(urlOrId);
  const awemeId = extractAwemeId(resolvedUrl || urlOrId);

  const webid = getWebId();
  const msToken = session.msToken;

  const params: Record<string, string> = {
    "device_platform": "webapp",
    "aid": "6383",
    "channel": "channel_pc_web",
    "version_code": "190600",
    "version_name": "19.6.0",
    "update_version_code": "170400",
    "pc_client_type": "1",
    "cookie_enabled": "true",
    "browser_language": "zh-CN",
    "browser_platform": "MacIntel",
    "browser_name": "Chrome",
    "browser_version": "125.0.0.0",
    "browser_online": "true",
    "engine_name": "Blink",
    "os_name": "Mac OS",
    "os_version": "10.15.7",
    "cpu_core_num": "8",
    "device_memory": "8",
    "engine_version": "109.0",
    "platform": "PC",
    "screen_width": "2560",
    "screen_height": "1440",
    "effective_type": "4g",
    "round_trip_time": "50",
    "webid": webid,
    "msToken": msToken,
    "aweme_id": awemeId,
  };

  const queryString = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const aBogus = signDetail(queryString, DEFAULT_USER_AGENT);
  const finalUrl = `https://www.douyin.com/aweme/v1/web/aweme/detail/?${queryString}&a_bogus=${aBogus}`;

  const res = await douyinRequest(finalUrl);
  const detail = res.aweme_detail;
  if (!detail) {
    throw new Error(`Không cào được thông tin chi tiết video cho ID ${awemeId}. Phản hồi: ${JSON.stringify(res)}`);
  }

  const authorData = detail.author;
  let avatarUrlR2 = "";
  if (authorData) {
    const rawAvatarUrl = authorData.avatar_thumb?.url_list?.[0] || authorData.avatar_larger?.url_list?.[0];
    if (rawAvatarUrl) {
      try {
        const avatarBuf = await downloadMedia(rawAvatarUrl);
        avatarUrlR2 = await uploadMediaToR2("douyin", authorData.sec_uid, "avatar.jpg", avatarBuf, "image/jpeg");
      } catch {}
    }
  }

  const authorUuid = await upsertAuthor({
    platform: "douyin",
    platform_uid: authorData?.sec_uid || "unknown",
    nickname: authorData?.nickname || "Người dùng Douyin",
    avatar_url: avatarUrlR2 || undefined,
    raw: authorData,
  });

  const mediaUrlsR2: string[] = [];
  let coverUrlR2 = "";

  if (detail.video) {
    const videoUrl = detail.video.play_addr?.url_list?.[0];
    if (videoUrl) {
      try {
        const videoBuf = await downloadMedia(videoUrl);
        const videoKey = await uploadMediaToR2("douyin", awemeId, "video.mp4", videoBuf, "video/mp4");
        mediaUrlsR2.push(videoKey);
      } catch {}
    }

    const coverUrl = detail.video.cover?.url_list?.[0];
    if (coverUrl) {
      try {
        const coverBuf = await downloadMedia(coverUrl);
        coverUrlR2 = await uploadMediaToR2("douyin", awemeId, "cover.jpg", coverBuf, "image/jpeg");
      } catch {}
    }
  }

  if (detail.images && Array.isArray(detail.images)) {
    for (let i = 0; i < detail.images.length; i++) {
      const imgUrl = detail.images[i].display_image_width_goods?.url_list?.[0] || detail.images[i].url_list?.[0];
      if (imgUrl) {
        try {
          const imgBuf = await downloadMedia(imgUrl);
          const imgKey = await uploadMediaToR2("douyin", awemeId, `image_${i}.jpg`, imgBuf, "image/jpeg");
          mediaUrlsR2.push(imgKey);
        } catch {}
      }
    }
  }

  const publishedAt = detail.create_time ? new Date(detail.create_time * 1000).toISOString() : new Date().toISOString();

  await upsertPost({
    platform: "douyin",
    platform_id: awemeId,
    author_id: authorUuid,
    caption: detail.desc || "",
    media_urls: mediaUrlsR2,
    cover_url: coverUrlR2 || undefined,
    stats: {
      digg_count: detail.statistics?.digg_count ?? 0,
      comment_count: detail.statistics?.comment_count ?? 0,
      share_count: detail.statistics?.share_count ?? 0,
      play_count: detail.statistics?.play_count ?? 0,
    },
    raw: detail,
    published_at: publishedAt,
  });
}
