import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { bootstrapDouyinSession } from "../src/crawl/douyin/session_bootstrap.js";
import { runSessionDiagnostic } from "../src/crawl/douyin/session_diagnostic.js";

async function main() {
  console.log("=============================================================");
  console.log("🚀 BOOTSTRAP & ENRICH DOUYIN SESSION (PLAYWRIGHT)");
  console.log("=============================================================\n");

  const rawCookiePath = join(process.cwd(), "scratch", "cookie_doyin.json");
  let rawCookies: any[] = [];
  let rawWebId = "";
  let rawMsToken = "";
  let rawVerifyFp = "";

  if (existsSync(rawCookiePath)) {
    console.log(`Loading raw cookies from: ${rawCookiePath}`);
    try {
      const content = readFileSync(rawCookiePath, "utf8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        rawCookies = parsed;
      } else if (parsed && typeof parsed === "object") {
        rawCookies = parsed.cookies || [];
        rawWebId = parsed.webid || "";
        rawMsToken = parsed.msToken || "";
        rawVerifyFp = parsed.verifyFp || "";
      }
      console.log(`Loaded ${rawCookies.length} raw cookies. WebId fallback: ${rawWebId || "(none)"}`);
    } catch (err: any) {
      console.warn(`Warning: Failed to parse cookie_doyin.json: ${err.message}. Starting clean.`);
    }
  } else {
    console.log("No raw cookies file found at scratch/cookie_doyin.json. Starting with a clean session.");
  }

  // Determine if headless mode should be used (default to false on local machine so user can interact)
  const isHeadless = process.env.HEADLESS_BOOTSTRAP === "true";

  console.log("Running Playwright bootstrap flow...");
  const enrichedSession = await bootstrapDouyinSession({
    rawCookies,
    rawWebId,
    rawMsToken,
    rawVerifyFp,
    headless: isHeadless,
    timeoutMs: 60000 // 60 seconds timeout
  });

  const enrichedPath = join(process.cwd(), "scratch", "douyin_enriched_session.json");
  console.log(`Saving enriched session to: ${enrichedPath}`);
  writeFileSync(enrichedPath, JSON.stringify(enrichedSession, null, 2), "utf8");

  // Sync to root scratch folder as well
  try {
    const rootEnrichedPath = join(process.cwd(), "..", "scratch", "douyin_enriched_session.json");
    writeFileSync(rootEnrichedPath, JSON.stringify(enrichedSession, null, 2), "utf8");
    console.log(`Synced enriched session to: ${rootEnrichedPath}`);
  } catch {}

  console.log("\nRunning Session Diagnostic Gate on the enriched session...");
  const isHealthy = await runSessionDiagnostic(enrichedSession);

  console.log("\n=============================================================");
  if (isHealthy) {
    console.log("🎉 SUCCESS: Enriched session is 100% HEALTHY & ALIVE!");
    console.log(`Ready for cào thật! Saved at: ${enrichedPath}`);
  } else {
    console.log("❌ WARNING: Enriched session failed diagnostic checks.");
    console.log("Please inspect the logs above to check which checkpoint failed.");
  }
  console.log("=============================================================");
}

main().catch(console.error);
