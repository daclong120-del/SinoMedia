import { DownloadTask, DownloadResult, DownloaderOptions, ProgressCallback } from "./types.js";
import { ConcurrencyPool } from "./concurrency_pool.js";
import { LocalDestination } from "./destinations/local_destination.js";
import { R2Destination } from "./destinations/r2_destination.js";

/**
 * # Video Downloader Service
 * Dịch vụ cốt lõi quản lý tải video số lượng lớn, chịu tải cao trong crawler-pipeline
 */
export class DownloaderService {
  private readonly pool: ConcurrencyPool;
  private readonly localDest: LocalDestination;
  private readonly r2Dest: R2Destination;

  constructor(options: DownloaderOptions = {}) {
    const maxConcurrent = options.maxConcurrent || 4;
    this.pool = new ConcurrencyPool(maxConcurrent);
    this.localDest = new LocalDestination(options.downloadDir);
    this.r2Dest = new R2Destination(this.localDest);
  }

  /**
   * # Đưa task tải video vào hàng đợi và thực thi
   */
  async download(task: DownloadTask, onProgress?: ProgressCallback): Promise<DownloadResult> {
    const runner = async (t: DownloadTask, cb?: ProgressCallback): Promise<DownloadResult> => {
      const maxRetries = t.maxRetries ?? 2;
      let lastError: any = null;

      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
          if (attempt > 1) {
            const backoffMs = Math.pow(2, attempt) * 1000;
            console.log(`[DownloaderService] Thử lại task ${t.id} (Lần ${attempt}/${maxRetries + 1}) sau ${backoffMs}ms...`);
            await new Promise(r => setTimeout(r, backoffMs));
          }

          if (t.destination === "r2") {
            return await this.r2Dest.save(t, cb);
          } else {
            return await this.localDest.save(t, cb);
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[DownloaderService] Lỗi tải task ${t.id} (Lần ${attempt}): ${err.message || err}`);
        }
      }

      return {
        success: false,
        taskId: t.id,
        fileSize: 0,
        durationMs: 0,
        error: lastError?.message || String(lastError),
      };
    };

    return this.pool.execute(task, runner, onProgress);
  }

  getActiveCount(): number {
    return this.pool.getActiveCount();
  }

  getPendingCount(): number {
    return this.pool.getPendingCount();
  }
}
