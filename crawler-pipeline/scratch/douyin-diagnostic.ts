import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createSessionFromRaw } from "../src/crawl/douyin/session.js";
import { runSessionDiagnostic } from "../src/crawl/douyin/session_diagnostic.js";

async function main() {
  console.log("=============================================================");
  console.log("🔍 RUNNING READ-ONLY DIAGNOSTIC ON ENRICHED SESSION");
  console.log("=============================================================\n");

  const enrichedPath = join(process.cwd(), "scratch", "douyin_enriched_session.json");
  if (!existsSync(enrichedPath)) {
    console.error(`❌ ERROR: Enriched session file not found: ${enrichedPath}`);
    console.log("Please run the bootstrap script first:\n  npx tsx scratch/bootstrap-douyin-session.ts");
    process.exit(1);
  }

  console.log(`Loading enriched session from: ${enrichedPath}`);
  const content = readFileSync(enrichedPath, "utf8");
  const raw = JSON.parse(content);
  const session = createSessionFromRaw(raw, "enriched-diagnostic");

  console.log("Executing chẩn đoán phiên...");
  const isHealthy = await runSessionDiagnostic(session);

  console.log("\n=============================================================");
  if (isHealthy) {
    console.log("🎉 DIAGNOSTIC RESULT: SUCCESS (Session is 100% HEALTHY & ALIVE!)");
  } else {
    console.log("❌ DIAGNOSTIC RESULT: FAILED (Session is UNHEALTHY or BLOCKED)");
  }
  console.log("=============================================================");

  process.exit(isHealthy ? 0 : 1);
}

main().catch(console.error);
