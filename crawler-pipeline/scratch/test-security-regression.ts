import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { CONFIG } from "../src/config.js";

// Utility for creating formatted terminal output
class TableReporter {
  private results: Array<{ test: string; layer: string; status: "PASS" | "FAIL"; details: string }> = [];

  add(test: string, layer: string, status: "PASS" | "FAIL", details: string) {
    this.results.push({ test, layer, status, details });
  }

  print() {
    console.log("\n==========================================================================================");
    console.log("                       SECURITY REGRESSION TEST REPORT                                     ");
    console.log("==========================================================================================");
    console.log(String("Test Case").padEnd(45) + " | " + String("Layer").padEnd(12) + " | " + String("Status").padEnd(6) + " | " + "Details");
    console.log("-".repeat(95));
    for (const r of this.results) {
      const statusStr = r.status === "PASS" ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
      console.log(r.test.padEnd(45) + " | " + r.layer.padEnd(12) + " | " + statusStr.padEnd(15) + " | " + r.details);
    }
    console.log("==========================================================================================\n");
  }

  hasFailed() {
    return this.results.some(r => r.status === "FAIL");
  }
}

async function runRegressionTests() {
  const reporter = new TableReporter();
  const supabaseUrl = CONFIG.supabase.url;
  const serviceRoleKey = CONFIG.supabase.serviceRoleKey;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const adminEmail = process.env.TEST_ADMIN_EMAIL;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;
  const userEmail = process.env.TEST_USER_EMAIL;
  const userPassword = process.env.TEST_USER_PASSWORD;

  // Next.js Dev/Prod server url to test the REST proxy
  // Fallback to localhost:3000 if not specified
  const proxyBaseUrl = process.env.INTERNAL_API_URL || "http://localhost:3000";

  console.log("Starting security regression tests...");
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Proxy URL: ${proxyBaseUrl}`);

  if (!anonKey || !serviceRoleKey) {
    console.error("Missing SUPABASE config variables!");
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // ==========================================
  // PART 1: DB Row Level Security (RLS) Tests
  // ==========================================
  
  // 1.1. Anon Key tests
  const tablesToTestAnon = ["crawler_accounts", "crawler_tasks", "api_tokens", "audit_logs"];
  for (const table of tablesToTestAnon) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}?limit=1`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403 || (body && (body as any).code === "42501")) {
        reporter.add(`Anon read blocked on ${table}`, "Database RLS", "PASS", `HTTP ${res.status}`);
      } else {
        reporter.add(`Anon read blocked on ${table}`, "Database RLS", "FAIL", `Allowed reading! HTTP ${res.status}`);
      }
    } catch (err: any) {
      reporter.add(`Anon read blocked on ${table}`, "Database RLS", "FAIL", `Error: ${err.message}`);
    }
  }

  // Login users to get JWTs for RLS Testing
  let adminJwt = "";
  let userJwt = "";

  if (adminEmail && adminPassword) {
    try {
      const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });
      if (authRes.ok) {
        const data = await authRes.json();
        adminJwt = data.access_token;
      }
    } catch (err) {
      console.warn("Failed to log in admin test account:", err);
    }
  }

  if (userEmail && userPassword) {
    try {
      const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: userPassword })
      });
      if (authRes.ok) {
        const data = await authRes.json();
        userJwt = data.access_token;
      }
    } catch (err) {
      console.warn("Failed to log in user test account:", err);
    }
  }

  // 1.2. Regular User RLS tests
  if (userJwt) {
    const sensitiveTables = ["api_tokens", "crawler_accounts", "audit_logs", "crawler_tasks"];
    for (const table of sensitiveTables) {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/${table}?limit=1`, {
          headers: { apikey: anonKey, Authorization: `Bearer ${userJwt}` }
        });
        const body = await res.json().catch(() => []);
        if (res.status === 401 || res.status === 403 || (Array.isArray(body) && body.length === 0)) {
          reporter.add(`User read restricted on ${table}`, "Database RLS", "PASS", `HTTP ${res.status}, Length: ${body.length || 0}`);
        } else {
          reporter.add(`User read restricted on ${table}`, "Database RLS", "FAIL", `Returned data! Length: ${body.length}`);
        }
      } catch (err: any) {
        reporter.add(`User read restricted on ${table}`, "Database RLS", "FAIL", `Error: ${err.message}`);
      }
    }
  } else {
    console.log("⚠️ Skipping User RLS tests (TEST_USER_EMAIL/PASSWORD not configured).");
  }

  // 1.3. Admin RLS tests
  if (adminJwt) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/crawler_tasks?limit=1`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${adminJwt}` }
      });
      if (res.status === 200) {
        reporter.add("Admin read allowed on crawler_tasks", "Database RLS", "PASS", "HTTP 200");
      } else {
        const body = await res.text();
        reporter.add("Admin read allowed on crawler_tasks", "Database RLS", "FAIL", `HTTP ${res.status}: ${body}`);
      }
    } catch (err: any) {
      reporter.add("Admin read allowed on crawler_tasks", "Database RLS", "FAIL", `Error: ${err.message}`);
    }
  } else {
    console.log("⚠️ Skipping Admin RLS tests (TEST_ADMIN_EMAIL/PASSWORD not configured).");
  }

  // ==========================================
  // PART 2: REST Proxy Hardening Tests
  // ==========================================

  // Setup mock tokens in Database for testing
  const testTokenPlain = "test_sec_token_" + crypto.randomBytes(16).toString("hex");
  const testTokenHash = crypto.createHash("sha256").update(testTokenPlain).digest("hex");
  
  const wildcardTokenPlain = "test_wildcard_" + crypto.randomBytes(16).toString("hex");
  const wildcardTokenHash = crypto.createHash("sha256").update(wildcardTokenPlain).digest("hex");

  try {
    // Insert test tokens
    await supabaseAdmin.from("api_tokens").insert([
      {
        name: "Security Test Scope Token",
        token_hash: testTokenHash,
        scopes: ["crawler:read_task", "crawler:update_task"],
        status: "active"
      },
      {
        name: "Security Test Wildcard Token",
        token_hash: wildcardTokenHash,
        scopes: ["*"],
        status: "active"
      }
    ]);
  } catch (err) {
    console.error("Failed to insert security test tokens into DB! Ensure DB is running. Error:", err);
    process.exit(1);
  }

  // Helper fetch function through REST Proxy
  const fetchProxy = (path: string, options: any = {}, token = testTokenPlain) => {
    const url = `${proxyBaseUrl}/api/worker/rest/v1/${path}`;
    const headers = {
      "x-api-key": token,
      "Content-Type": "application/json",
      ...options.headers
    };
    return fetch(url, { ...options, headers });
  };

  // 2.1. Test Scope Enforcement (sai scope)
  try {
    // testToken has scope 'crawler:read_task', but we try to read accounts ('crawler:read_accounts')
    const res = await fetchProxy("crawler_accounts?limit=1");
    if (res.status === 403) {
      reporter.add("Token insufficient scope blocked", "REST Proxy", "PASS", "HTTP 403 Forbidden");
    } else {
      reporter.add("Token insufficient scope blocked", "REST Proxy", "FAIL", `HTTP ${res.status}`);
    }
  } catch (err: any) {
    reporter.add("Token insufficient scope blocked", "REST Proxy", "FAIL", `Error: ${err.message}`);
  }

  // 2.2. Test Wildcard Block
  try {
    const res = await fetchProxy("crawler_tasks?limit=1", {}, wildcardTokenPlain);
    if (res.status === 403) {
      reporter.add("Wildcard (*) token blocked", "REST Proxy", "PASS", "HTTP 403 (Wildcard rejected)");
    } else {
      reporter.add("Wildcard (*) token blocked", "REST Proxy", "FAIL", `HTTP ${res.status}`);
    }
  } catch (err: any) {
    reporter.add("Wildcard (*) token blocked", "REST Proxy", "FAIL", `Error: ${err.message}`);
  }

  // 2.3. Test Wildcard Select Block (select=*)
  try {
    const res = await fetchProxy("crawler_tasks?select=*");
    if (res.status === 400) {
      reporter.add("Wildcard select (*) blocked", "REST Proxy", "PASS", "HTTP 400 Bad Request");
    } else {
      reporter.add("Wildcard select (*) blocked", "REST Proxy", "FAIL", `HTTP ${res.status}`);
    }
  } catch (err: any) {
    reporter.add("Wildcard select (*) blocked", "REST Proxy", "FAIL", `Error: ${err.message}`);
  }

  // 2.4. Test Disallowed Column Select
  try {
    const res = await fetchProxy("crawler_tasks?select=id,some_nonexistent_column");
    if (res.status === 400) {
      reporter.add("Disallowed column select blocked", "REST Proxy", "PASS", "HTTP 400 Bad Request");
    } else {
      reporter.add("Disallowed column select blocked", "REST Proxy", "FAIL", `HTTP ${res.status}`);
    }
  } catch (err: any) {
    reporter.add("Disallowed column select blocked", "REST Proxy", "FAIL", `Error: ${err.message}`);
  }

  // 2.5. Test Join/Alias Attempt Block
  try {
    const res = await fetchProxy("crawler_tasks?select=id,crawler_accounts(*)");
    if (res.status === 400) {
      reporter.add("Join query select blocked", "REST Proxy", "PASS", "HTTP 400 Bad Request");
    } else {
      reporter.add("Join query select blocked", "REST Proxy", "FAIL", `HTTP ${res.status}`);
    }
  } catch (err: any) {
    reporter.add("Join query select blocked", "REST Proxy", "FAIL", `Error: ${err.message}`);
  }

  // 2.6. Test Or/And filters block
  try {
    const res = await fetchProxy("crawler_tasks?or=(status.eq.pending,status.eq.running)");
    if (res.status === 400) {
      reporter.add("Complex 'or' filter blocked", "REST Proxy", "PASS", "HTTP 400 Bad Request");
    } else {
      reporter.add("Complex 'or' filter blocked", "REST Proxy", "FAIL", `HTTP ${res.status}`);
    }
  } catch (err: any) {
    reporter.add("Complex 'or' filter blocked", "REST Proxy", "FAIL", `Error: ${err.message}`);
  }

  // 2.7. Test Not filter block
  try {
    const res = await fetchProxy("crawler_tasks?status=not.eq.completed");
    if (res.status === 400) {
      reporter.add("'not' filter blocked", "REST Proxy", "PASS", "HTTP 400 Bad Request");
    } else {
      reporter.add("'not' filter blocked", "REST Proxy", "FAIL", `HTTP ${res.status}`);
    }
  } catch (err: any) {
    reporter.add("'not' filter blocked", "REST Proxy", "FAIL", `Error: ${err.message}`);
  }

  // 2.8. Test Limit Restriction
  try {
    const res = await fetchProxy("crawler_tasks?limit=101");
    if (res.status === 400) {
      reporter.add("Large limit (>100) blocked", "REST Proxy", "PASS", "HTTP 400 Bad Request");
    } else {
      reporter.add("Large limit (>100) blocked", "REST Proxy", "FAIL", `HTTP ${res.status}`);
    }
  } catch (err: any) {
    reporter.add("Large limit (>100) blocked", "REST Proxy", "FAIL", `Error: ${err.message}`);
  }

  // 2.9. Test Invalid Order Block
  try {
    const res = await fetchProxy("crawler_tasks?order=status.asc;drop table crawler_tasks");
    if (res.status === 400) {
      reporter.add("Invalid order format blocked", "REST Proxy", "PASS", "HTTP 400 Bad Request");
    } else {
      reporter.add("Invalid order format blocked", "REST Proxy", "FAIL", `HTTP ${res.status}`);
    }
  } catch (err: any) {
    reporter.add("Invalid order format blocked", "REST Proxy", "FAIL", `Error: ${err.message}`);
  }

  // 2.10. Test Valid GET Request with Auto-select whitelist columns
  try {
    const res = await fetchProxy("crawler_tasks?limit=1");
    if (res.status === 200) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const hasDisallowedField = data.some(item => {
          const keys = Object.keys(item);
          // If it contains fields not in the whitelist
          return keys.some(k => k === "created_by" || k === "raw_db_field_etc");
        });
        if (!hasDisallowedField) {
          reporter.add("Auto-gated select columns", "REST Proxy", "PASS", "Only whitelisted columns returned");
        } else {
          reporter.add("Auto-gated select columns", "REST Proxy", "FAIL", "Returned non-whitelisted columns");
        }
      } else {
        reporter.add("Auto-gated select columns", "REST Proxy", "PASS", "Empty task pool (HTTP 200)");
      }
    } else {
      reporter.add("Auto-gated select columns", "REST Proxy", "FAIL", `HTTP ${res.status}`);
    }
  } catch (err: any) {
    reporter.add("Auto-gated select columns", "REST Proxy", "FAIL", `Error: ${err.message}`);
  }

  // 2.11. Test Mutating Payload Whitelist (PATCH with invalid fields)
  try {
    const fakeUuid = "00000000-0000-0000-0000-000000000000";
    const res = await fetchProxy(`crawler_tasks?id=eq.${fakeUuid}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "completed",
        nonexistent_field_attacker: "malicious_payload"
      })
    });
    if (res.status === 400) {
      reporter.add("Disallowed fields in PATCH blocked", "REST Proxy", "PASS", "HTTP 400 Bad Request");
    } else {
      reporter.add("Disallowed fields in PATCH blocked", "REST Proxy", "FAIL", `HTTP ${res.status}`);
    }
  } catch (err: any) {
    reporter.add("Disallowed fields in PATCH blocked", "REST Proxy", "FAIL", `Error: ${err.message}`);
  }

  // ==========================================
  // Clean up mock tokens
  // ==========================================
  try {
    await supabaseAdmin.from("api_tokens").delete().in("token_hash", [testTokenHash, wildcardTokenHash]);
    console.log("Cleaned up security test tokens successfully.");
  } catch (err) {
    console.error("Failed to clean up security test tokens:", err);
  }

  // Print final results
  reporter.print();

  if (reporter.hasFailed()) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runRegressionTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
