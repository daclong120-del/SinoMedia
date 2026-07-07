import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
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
  const bucketName = CONFIG.r2.bucketName;
  const prefix = "bilibili/";

  console.log(`Checking objects in R2 bucket "${bucketName}" with prefix "${prefix}"...`);

  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });
    
    const listRes = await s3.send(listCommand);
    const objects = listRes.Contents || [];

    console.log(`Found ${objects.length} objects in R2:`);
    for (const obj of objects) {
      console.log(`- ${obj.Key} (Size: ${obj.Size} bytes)`);
    }
  } catch (err: any) {
    console.error("❌ R2 check failed:", err.message);
  }
}

main().catch(console.error);
