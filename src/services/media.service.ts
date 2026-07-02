/**
 * # Service media — tương tác với Cloudflare R2 qua presigned URL
 */

import { supabase } from "../../lib/supabase";

const R2_PUBLIC_URL = process.env.EXPO_PUBLIC_R2_PUBLIC_URL || "";

/**
 * # Sinh URL công khai cho media đã upload trên R2
 */
export function getMediaUrl(r2Key: string): string {
  if (!r2Key) return "";
  if (r2Key.startsWith("http")) return r2Key;
  return `${R2_PUBLIC_URL}/${r2Key}`;
}

/**
 * # Sinh presigned URL để upload file trực tiếp lên R2 (qua Edge Function)
 */
export async function getUploadUrl(filename: string, contentType: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("presign-upload", {
    body: { filename, contentType },
  });

  if (error) throw error;
  return data.uploadUrl;
}

/**
 * # Upload file lên R2 sử dụng presigned URL
 */
export async function uploadToR2(uploadUrl: string, file: Blob, contentType: string): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Tải lên thất bại: HTTP ${response.status}`);
  }
}
