/**
 * # Crawler chính cho Kuaishou (快手) — điều phối search, detail, creator, comments
 */

import { KuaishouClient } from "./client.js";
import { KuaishouExtractor } from "./extractor.js";
import {
  upsertAuthor,
  upsertPost,
  upsertComments,
  getPostUuid,
  checkoutAccount,
  checkinAccount,
} from "../../store/index.js";
import type { ICrawler } from "../../base/base_crawler.js";
import { CONFIG } from "../../config.js";
import { parseCookieString } from "../../utils/crawler.js";
import { join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";

async function persistAuthor(rawCreator: any): Promise<string> {
  const authorRow = KuaishouExtractor.extractAuthor(rawCreator);
  return await upsertAuthor(authorRow);
}

async function persistPost(videoItem: any, authorUuid?: string): Promise<string> {
  const postRow = KuaishouExtractor.extractPost(videoItem, authorUuid);

  // 1. Xác định media type và original URLs
  const isVideo = !!KuaishouExtractor.extractVideoPlayUrl(videoItem);
  const mediaType = isVideo ? "video" : (postRow.media_urls && postRow.media_urls.length > 1 ? "carousel" : "image");
  
  const originalMediaUrls = [...(postRow.media_urls || [])];
  const originalCoverUrl = postRow.cover_url || "";

  // 2. Sử dụng original URLs
  const mediaUrls: string[] = [...originalMediaUrls];
  let coverUrl = originalCoverUrl;

  let mediaSource = "original";
  let mediaStatus = "original_only";
  let mediaError: string | null = null;
  let mediaCachedAt: string | null = null;

  if (originalMediaUrls.length === 0 && !originalCoverUrl) {
    mediaSource = "none";
    mediaStatus = "unavailable";
  } else {
    mediaSource = "original";
    mediaStatus = "original_only";
  }

  // Cập nhật postRow với dữ liệu mới
  postRow.media_type = mediaType;
  postRow.media_urls = mediaUrls;
  postRow.cover_url = coverUrl || undefined;
  postRow.original_media_urls = originalMediaUrls;
  postRow.original_cover_url = originalCoverUrl || undefined;
  postRow.media_status = mediaStatus;
  postRow.media_source = mediaSource;
  postRow.media_error = mediaError;
  postRow.media_cached_at = mediaCachedAt || undefined;

  await upsertPost(postRow);
  const uuid = await getPostUuid("kuaishou", postRow.platform_id);
  if (!uuid) {
    throw new Error(`Không thể lấy UUID của bài đăng vừa chèn: ${postRow.platform_id}`);
  }
  return uuid;
}

function parsePhotoId(target: string): string {
  if (!target.includes("http") && !target.includes("kuaishou.com")) {
    return target.trim();
  }
  const match = target.match(/\/short-video\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return match[1];
  }
  throw new Error(`Không thể phân tích ID video từ URL Kuaishou: ${target}`);
}

function parseUserId(target: string): string {
  if (!target.includes("http") && !target.includes("kuaishou.com")) {
    return target.trim();
  }
  const match = target.match(/\/profile\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return match[1];
  }
  throw new Error(`Không thể phân tích ID user từ URL Kuaishou: ${target}`);
}

export class KuaishouCrawler implements ICrawler {
  private client: KuaishouClient;
  private currentAccountId: string | null = null;

  constructor() {
    this.client = new KuaishouClient();
  }

  async ensureLogin(): Promise<void> {
    throw new Error("browser mode removed, provide valid cookie/session");
  }

  async releaseAccount(isSuccessful: boolean): Promise<void> {
    if (this.currentAccountId) {
      await checkinAccount(this.currentAccountId, isSuccessful);
      this.currentAccountId = null;
    }
  }

  /**
   * # Thực hiện cào chi tiết video Kuaishou
   */
  async crawl(target: string): Promise<void> {
    let success = false;
    try {
      const photoId = parsePhotoId(target);
      await this.ensureLogin();

      const detailRes = await this.client.getVideoInfo(photoId);
      const detail = detailRes?.visionVideoDetail;
      if (!detail || !detail.photo) {
        throw new Error(`Không tìm thấy thông tin chi tiết cho video Kuaishou: ${photoId}`);
      }

      let authorUuid: string | undefined;
      if (detail.author) {
        authorUuid = await persistAuthor(detail);
      }

      const postUuid = await persistPost(detail, authorUuid);

      // Cào bình luận nếu được cấu hình
      if (process.env.ENABLE_GET_COMMENTS !== "false") {
        await this.client.getVideoAllComments(
          photoId,
          1.0,
          async (_, comments) => {
            const commentRows = comments.map(c => KuaishouExtractor.extractComment(c, photoId, postUuid));
            await upsertComments(commentRows);
          },
          50
        );
      }
      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }

  /**
   * # Thực hiện cào profile creator và video của họ trên Kuaishou
   */
  async creator(target: string): Promise<void> {
    let success = false;
    try {
      const userId = parseUserId(target);
      await this.ensureLogin();

      // Lấy thông tin tác giả
      const creatorInfo = await this.client.getCreatorInfo(userId);
      if (!creatorInfo) {
        throw new Error(`Không lấy được thông tin creator Kuaishou: ${userId}`);
      }

      const authorUuid = await persistAuthor(creatorInfo);

      // Lấy danh sách video của creator
      const allFeeds = await this.client.getAllVideosByCreator(
        userId,
        2.0,
        async (feeds) => {
          for (const feed of feeds) {
            const photoId = feed.photo?.id;
            if (!photoId) continue;

            let detailedItem = feed;
            try {
              const detailRes = await this.client.getVideoInfo(photoId);
              if (detailRes?.visionVideoDetail) {
                detailedItem = detailRes.visionVideoDetail;
              }
            } catch (err) {
              console.warn(`[KuaishouCrawler] Không lấy được chi tiết cho video ${photoId}, sử dụng dữ liệu từ feed.`);
            }

            const postUuid = await persistPost(detailedItem, authorUuid);

            // Cào bình luận cho từng video của creator
            if (process.env.ENABLE_GET_COMMENTS !== "false") {
              await this.client.getVideoAllComments(
                photoId,
                1.0,
                async (_, comments) => {
                  const commentRows = comments.map(c => KuaishouExtractor.extractComment(c, photoId, postUuid));
                  await upsertComments(commentRows);
                },
                20 // giới hạn bình luận của creator để tránh rate limit
              );
            }
          }
        }
      );

      console.log(`Đã hoàn thành cào ${allFeeds.length} video của Creator: ${userId}`);
      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }

  /**
   * # Tìm kiếm video Kuaishou theo từ khóa
   */
  async search(keyword: string, maxCount?: number): Promise<void> {
    let success = false;
    try {
      const limit = maxCount || 20;
      await this.ensureLogin();

      let page = 1;
      let crawledCount = 0;
      let hasMore = true;
      let searchSessionId = "";

      while (hasMore && crawledCount < limit) {
        console.log(`Đang tìm kiếm từ khóa "${keyword}" trên Kuaishou, trang ${page}...`);
        const searchRes = await this.client.searchInfoByKeyword(keyword, String(page), searchSessionId);
        const searchPhoto = searchRes?.visionSearchPhoto;

        if (!searchPhoto || searchPhoto.result !== 1) {
          console.warn(`[KuaishouCrawler] Lỗi hoặc không có kết quả tìm kiếm cho từ khóa: ${keyword}`);
          break;
        }

        searchSessionId = searchPhoto.searchSessionId || "";
        const feeds = searchPhoto.feeds || [];

        if (feeds.length === 0) {
          hasMore = false;
          break;
        }

        for (const feed of feeds) {
          if (crawledCount >= limit) {
            break;
          }

          const photoId = feed.photo?.id;
          if (!photoId) continue;

          let authorUuid: string | undefined;
          if (feed.author) {
            authorUuid = await persistAuthor({
              profile: {
                user_id: feed.author.id,
                user_name: feed.author.name,
                headurl: feed.author.headerUrl,
              }
            });
          }

          let detailedItem = feed;
          try {
            const detailRes = await this.client.getVideoInfo(photoId);
            if (detailRes?.visionVideoDetail) {
              detailedItem = detailRes.visionVideoDetail;
            }
          } catch (err) {
            console.warn(`[KuaishouCrawler] Không lấy được chi tiết cho video tìm kiếm ${photoId}.`);
          }

          const postUuid = await persistPost(detailedItem, authorUuid);

          // Cào bình luận
          if (process.env.ENABLE_GET_COMMENTS !== "false") {
            await this.client.getVideoAllComments(
              photoId,
              1.0,
              async (_, comments) => {
                const commentRows = comments.map(c => KuaishouExtractor.extractComment(c, photoId, postUuid));
                await upsertComments(commentRows);
              },
              10
            );
          }

          crawledCount++;
        }

        page++;
        await new Promise(r => setTimeout(r, 2000));
      }

      console.log(`Đã hoàn thành tìm kiếm cho từ khóa "${keyword}" với ${crawledCount} kết quả.`);
      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }

  /**
   * # Cào bình luận của video Kuaishou
   */
  async comments(target: string, maxCount?: number): Promise<void> {
    let success = false;
    try {
      const photoId = parsePhotoId(target);
      const limit = maxCount || 50;
      await this.ensureLogin();

      const postUuid = await getPostUuid("kuaishou", photoId);
      if (!postUuid) {
        throw new Error(`Chưa cào bài đăng này, hãy cào bài đăng trước khi cào comment: ${photoId}`);
      }

      await this.client.getVideoAllComments(
        photoId,
        1.0,
        async (_, comments) => {
          const commentRows = comments.map(c => KuaishouExtractor.extractComment(c, photoId, postUuid));
          await upsertComments(commentRows);
        },
        limit
      );

      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }
}
