import fs from 'fs';
import path from 'path';

function parseEnv(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return Object.fromEntries(
      content.split('\n').filter(line => line.trim() && !line.startsWith('#'))
      .map(line => {
        const idx = line.indexOf('=');
        if (idx === -1) return [line.trim(), ''];
        let key = line.slice(0, idx).trim();
        let val = line.slice(idx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        return [key, val];
      })
    );
  } catch { return {}; }
}

const env = { ...parseEnv('../.env'), ...parseEnv('../supabase/.env.local'), ...process.env };

const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

async function setup() {
  const adminEmail = env.TEST_ADMIN_EMAIL;
  const userEmail = env.TEST_USER_EMAIL;
  const pass = env.TEST_ADMIN_PASSWORD;
  
  if (!adminEmail || !userEmail || !pass) {
    console.error("Thiếu TEST_ADMIN_EMAIL, TEST_USER_EMAIL, hoặc TEST_ADMIN_PASSWORD");
    process.exit(1);
  }

  console.log("1. Creating accounts...");
  
  const res1 = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST", headers: { "apikey": anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: pass })
  });
  const data1 = await res1.json();
  const adminId = data1.user?.id || data1.id;

  const res2 = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST", headers: { "apikey": anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: userEmail, password: pass })
  });
  const data2 = await res2.json();
  const userId = data2.user?.id || data2.id;
  
  console.log("2. Granting team_members role...");
  if (adminId) {
    await fetch(`${supabaseUrl}/rest/v1/team_members?user_id=eq.${adminId}`, {
      method: "PATCH", headers: { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ role_id: "admin" })
    });
    console.log("Admin OK:", adminId);
  } else {
    console.log("No Admin ID:", data1);
  }
  
  if (userId) {
    await fetch(`${supabaseUrl}/rest/v1/team_members?user_id=eq.${userId}`, {
      method: "PATCH", headers: { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ role_id: "user" })
    });
    console.log("User OK:", userId);
  } else {
    console.log("No User ID:", data2);
  }
}
setup();
