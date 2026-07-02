import { CONFIG } from "../config.js";
import { ProxyAgent } from "undici";

let dispatcher: ProxyAgent | undefined;
if (CONFIG.proxy) {
  dispatcher = new ProxyAgent(CONFIG.proxy);
}

async function supabaseRest(path: string, options: { method?: string; body?: any; params?: Record<string, string> } = {}): Promise<any> {
  const urlObj = new URL(`${CONFIG.supabase.url}/rest/v1/${path}`);
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      urlObj.searchParams.append(key, value);
    }
  }

  const headers: Record<string, string> = {
    "apikey": CONFIG.supabase.serviceRoleKey,
    "Authorization": `Bearer ${CONFIG.supabase.serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  if (options.method && ["POST", "PUT", "PATCH"].includes(options.method)) {
    headers["Prefer"] = "return=representation,resolution=merge-duplicates";
  }

  const fetchOptions: any = {
    method: options.method || "GET",
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  if (dispatcher) {
    fetchOptions.dispatcher = dispatcher;
  }

  const res = await fetch(urlObj.toString(), fetchOptions);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase REST error ${res.status}: ${errText}`);
  }

  return res.json();
}

/**
 * # Lấy một tài khoản hoạt động và cập nhật thời điểm sử dụng gần nhất
 */
export async function checkoutAccount(platform: string): Promise<{ id: string; username: string; cookie_data: string } | null> {
  try {
    const accounts = await supabaseRest("crawler_accounts", {
      method: "GET",
      params: {
        platform: `eq.${platform}`,
        status: "eq.active",
        order: "last_used_at.nullsfirst.asc",
        limit: "1",
      },
    });

    if (!accounts || accounts.length === 0) {
      return null;
    }

    const account = accounts[0];
    await supabaseRest("crawler_accounts", {
      method: "PATCH",
      params: { id: `eq.${account.id}` },
      body: { last_used_at: new Date().toISOString() },
    });

    return {
      id: account.id,
      username: account.username || "",
      cookie_data: account.cookie_data,
    };
  } catch (err) {
    console.log(`Lỗi khi lấy tài khoản từ pool: ${(err as Error).message}`);
    return null;
  }
}

/**
 * # Cập nhật kết quả sử dụng tài khoản và báo cáo lỗi nếu có
 */
export async function checkinAccount(accountId: string, isSuccess: boolean): Promise<void> {
  try {
    if (isSuccess) {
      await supabaseRest("crawler_accounts", {
        method: "PATCH",
        params: { id: `eq.${accountId}` },
        body: {
          failure_count: 0,
          status: "active",
          updated_at: new Date().toISOString(),
        },
      });
      return;
    }

    const accounts = await supabaseRest("crawler_accounts", {
      method: "GET",
      params: { id: `eq.${accountId}` },
    });

    if (!accounts || accounts.length === 0) {
      return;
    }

    const account = accounts[0];
    const newFailureCount = (account.failure_count || 0) + 1;
    const newStatus = newFailureCount >= 3 ? "banned" : "active";

    await supabaseRest("crawler_accounts", {
      method: "PATCH",
      params: { id: `eq.${accountId}` },
      body: {
        failure_count: newFailureCount,
        status: newStatus,
        updated_at: new Date().toISOString(),
      },
    });

    if (newStatus === "banned") {
      console.log(`Cảnh báo: Tài khoản ID ${accountId} bị vô hiệu hóa do lỗi liên tiếp 3 lần`);
    }
  } catch (err) {
    console.log(`Lỗi khi trả tài khoản vào pool: ${(err as Error).message}`);
  }
}

/**
 * # Thêm hoặc cập nhật tài khoản cào trong hệ thống
 */
export async function addOrUpdateAccount(platform: string, username: string, cookieData: string): Promise<void> {
  try {
    await supabaseRest("crawler_accounts", {
      method: "POST",
      params: { on_conflict: "platform,username" },
      body: {
        platform,
        username,
        cookie_data: cookieData,
        status: "active",
        failure_count: 0,
        last_used_at: null,
        updated_at: new Date().toISOString(),
      },
    });
    console.log(`Đã thêm/cập nhật tài khoản ${username} cho nền tảng ${platform}`);
  } catch (err) {
    console.log(`Lỗi khi lưu tài khoản vào database: ${(err as Error).message}`);
  }
}
