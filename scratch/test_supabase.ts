/**
 * # Script kiểm thử kết nối Supabase
 */
import "../crawler-pipeline/src/config.js";
import { CONFIG } from "../crawler-pipeline/src/config.js";

async function testConnection() {
  console.log("=== BẮT ĐẦU KIỂM TRA KẾT NỐI SUPABASE ===");
  console.log(`URL: ${CONFIG.supabase.url}`);
  console.log(`Service Role Key: ${CONFIG.supabase.serviceRoleKey ? "Đã cấu hình" : "CHƯA CẤU HÌNH"}`);
  
  const headers: Record<string, string> = {
    "apikey": CONFIG.supabase.serviceRoleKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
    "Authorization": `Bearer ${CONFIG.supabase.serviceRoleKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ""}`,
  };

  try {
    const response = await fetch(`${CONFIG.supabase.url}/rest/v1/crawler_accounts?select=*&limit=1`, {
      method: "GET",
      headers,
    });
    console.log(`Mã trạng thái HTTP: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log("Kết nối thành công! Kết quả trả về:");
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.error("Kết nối thất bại!");
      console.error(`Chi tiết lỗi: ${errorText}`);
    }
  } catch (err) {
    console.error("Gặp lỗi trong quá trình kết nối:", (err as Error).message);
  }
}

testConnection();
