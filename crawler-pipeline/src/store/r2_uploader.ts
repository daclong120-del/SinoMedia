import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
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
