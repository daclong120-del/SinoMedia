/**
 * # Interfaces & Types cho Video Downloader Subsystem
 */

export type DownloadDestinationType = "local" | "r2" | "both";

export interface DownloadTask {
  id: string;
  url: string;
  platform: string;
  destination: DownloadDestinationType;
  outputPath?: string;
  r2Key?: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  timeoutMs?: number;
  metadata?: Record<string, any>;
}

export interface DownloadProgress {
  taskId: string;
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  percent: number;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

export interface DownloadResult {
  success: boolean;
  taskId: string;
  filePath?: string;
  r2Key?: string;
  fileSize: number;
  mimeType?: string;
  checksum?: string;
  durationMs: number;
  metadata?: Record<string, any>;
  error?: string;
}

export interface DownloaderOptions {
  maxConcurrent?: number;
  defaultTimeoutMs?: number;
  downloadDir?: string;
  userAgent?: string;
}
