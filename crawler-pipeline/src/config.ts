import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv(path: string): void {
  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const index = trimmed.indexOf("=");
      if (index === -1) {
        continue;
      }
      const key = trimmed.substring(0, index).trim();
      let val = trimmed.substring(index + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {}
}

loadEnv(join(process.cwd(), "..", ".env"));
loadEnv(join(process.cwd(), "..", "supabase", ".env.local"));
loadEnv(join(process.cwd(), ".env"));
loadEnv(join(process.cwd(), ".env.local"));

function getEnv(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export const CONFIG = {
  supabase: {
    url: getEnv("SUPABASE_URL") ?? getEnv("EXPO_PUBLIC_SUPABASE_URL") ?? (() => { throw new Error("Thiếu biến SUPABASE_URL — vui lòng cấu hình trong file .env"); })(),
    serviceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY") ?? (() => { throw new Error("Thiếu biến SUPABASE_SERVICE_ROLE_KEY — vui lòng cấu hình trong file .env"); })(),
  },
  r2: {
    accessKeyId: getEnv("R2_ACCESS_KEY_ID") ?? "",
    secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY") ?? "",
    endpointUrl: getEnv("R2_ENDPOINT_URL") ?? "",
    bucketName: getEnv("R2_BUCKET_NAME") ?? "media-crawler-bucket",
  },
  proxy: getEnv("CRAWLER_PROXY") ?? "",
  headless: getEnv("CRAWLER_HEADLESS") !== "false",
};
