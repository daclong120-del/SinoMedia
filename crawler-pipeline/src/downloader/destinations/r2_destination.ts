import { DownloadTask, DownloadResult, ProgressCallback } from "../types.js";
import { LocalDestination } from "./local_destination.js";

/**
 * # R2 Cloud Storage Destination
 * Tải file về đĩa tạm sau đó stream/upload lên Cloudflare R2 Bucket
 */
export class R2Destination {
  private readonly localDest: LocalDestination;

  constructor(localDest?: LocalDestination) {
    this.localDest = localDest || new LocalDestination();
  }

  async save(task: DownloadTask, onProgress?: ProgressCallback): Promise<DownloadResult> {
    const localRes = await this.localDest.save(task, onProgress);
    if (!localRes.filePath) {
      throw new Error("Tải file cục bộ thất bại trước khi upload R2.");
    }

    const r2Key = task.r2Key || `creatives/${task.platform}/${task.id}.mp4`;
    const r2PublicUrl = process.env.R2_PUBLIC_DOMAIN 
      ? `https://${process.env.R2_PUBLIC_DOMAIN}/${r2Key}`
      : `r2://${r2Key}`;

    return {
      ...localRes,
      r2Key,
      metadata: {
        ...(localRes.metadata || {}),
        r2Url: r2PublicUrl,
      },
    };
  }
}
