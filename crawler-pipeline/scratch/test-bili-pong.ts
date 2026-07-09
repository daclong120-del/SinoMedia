import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { setBilibiliCookie, pong } from "../src/crawl/bilibili/client.js";
import { supabaseRest } from "../src/store/supabase_client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Fetching account from Supabase via REST Proxy...");
  const accounts = await supabaseRest("crawler_accounts", {
    method: "GET",
    params: {
      platform: "eq.bilibili",
      status: "eq.active",
      order: "last_used_at.asc.nullsfirst",
      limit: "1"
    }
  });

  if (!accounts || accounts.length === 0) {
    console.error("No active Bilibili account found in DB!");
    process.exit(1);
  }

  const account = accounts[0];
  console.log(`Setting Bilibili cookie for username: ${account.username}...`);
  setBilibiliCookie(account.cookie_data);

  console.log("Testing Bilibili login status (pong)...");
  const isActive = await pong();
  console.log("Result:", isActive);
}

main().catch(console.error);
