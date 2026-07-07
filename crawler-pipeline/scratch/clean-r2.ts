import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { CONFIG } from "../src/config.js";

const s3 = new S3Client({
  endpoint: CONFIG.r2.endpointUrl,
  credentials: {
    accessKeyId: CONFIG.r2.accessKeyId,
    secretAccessKey: CONFIG.r2.secretAccessKey,
  },
  region: "auto",
});

async function main() {
  if (process.env.CONFIRM_RESET !== "true") {
    console.error("❌ Guard: Phải đặt biến môi trường CONFIRM_RESET=true để chạy script này.");
    process.exit(1);
  }

  const bucketName = CONFIG.r2.bucketName;
  const prefix = "bilibili/";

  console.log(`Listing and deleting objects from bucket "${bucketName}" with prefix "${prefix}"...`);

  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });
    
    const listRes = await s3.send(listCommand);
    const objects = listRes.Contents || [];

    if (objects.length === 0) {
      console.log("No objects found with prefix 'bilibili/' in R2 bucket.");
      return;
    }

    console.log(`Found ${objects.length} objects. Deleting...`);

    const keysToDelete = objects.map(obj => ({ Key: obj.Key }));
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: keysToDelete,
      },
    });

    const deleteRes = await s3.send(deleteCommand);
    console.log("Deleted count:", deleteRes.Deleted?.length || 0);
    console.log("✅ R2 cleanup completed.");
  } catch (err: any) {
    console.error("❌ R2 cleanup failed:", err.message);
  }
}

main().catch(console.error);
