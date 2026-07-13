const crypto = require("crypto");

const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const SETTINGS_ENCRYPTION_KEY = "d7a8s9d0a1b2c3d4e5f6g7h8i9j0k1l2";

function decryptSettings(text) {
  if (!text) return text;
  const parts = text.split(":");
  if (parts.length !== 2) return text;
  try {
    const [ivHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const key = crypto.createHash("sha256").update(SETTINGS_ENCRYPTION_KEY).digest();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err.message);
    return text;
  }
}

async function main() {
  const url = `${SUPABASE_URL}/rest/v1/system_settings?id=eq.default`;
  console.log("Fetching system settings from:", url);
  
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }

  const data = await res.json();
  if (!data || data.length === 0) {
    console.log("No system settings found in DB.");
    return;
  }

  const settings = data[0];
  console.log("Found settings row in DB. Encrypted api_key:", settings.api_key);
  const decryptedKey = decryptSettings(settings.api_key);
  console.log("Decrypted 2Captcha API Key:", decryptedKey);
}

main().catch(console.error);
