import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { CONFIG } from "../config.js";

const s3 = new S3Client({
  endpoint: CONFIG.r2.endpointUrl,
  credentials: {
    accessKeyId: CONFIG.r2.accessKeyId,
    secretAccessKey: CONFIG.r2.secretAccessKey,
  },
  region: "auto",
});

/**
 * # Tải lên một tệp tin Media (Buffer) lên Cloudflare R2 và trả về key đường dẫn
 */
export async function uploadMediaToR2(
  platform: string,
  platformId: string,
  filename: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const key = `${platform}/${platformId}/${filename}`;

  const command = new PutObjectCommand({
    Bucket: CONFIG.r2.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3.send(command);
  return key;
}
