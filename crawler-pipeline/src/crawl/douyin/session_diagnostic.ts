import { getSelfProfile, searchAweme, getAwemeDetail } from "./api.js";
import { DouyinSession } from "./session.js";

/**
 * # Chạy kiểm tra chuẩn đoán chất lượng/trạng thái hoạt động của session
 * Thực hiện tuần tự 3 checkpoint đọc không tác dụng phụ (no side effects)
 */
export async function runSessionDiagnostic(session: DouyinSession): Promise<boolean> {
  try {
    console.log("[Diagnostic] Checkpoint 0: Kiểm tra sự hiện diện của các tham số định danh trình duyệt...");
    if (!session.webid) {
      console.warn("[Diagnostic] Checkpoint 0 thất bại: Thiếu webid (__ac_webid hoặc dy_did) hợp lệ trong session.");
      return false;
    }
    if (!session.cookieString) {
      console.warn("[Diagnostic] Checkpoint 0 thất bại: Thiếu cookieString trong session.");
      return false;
    }
    if (!session.userAgent) {
      console.warn("[Diagnostic] Checkpoint 0 thất bại: Thiếu userAgent trong session.");
      return false;
    }
    console.log("[Diagnostic] Checkpoint 0 thành công. Đầy đủ tham số định danh.");

    console.log("[Diagnostic] Checkpoint 1: Gọi getSelfProfile để kiểm tra thông tin cá nhân...");
    const selfRes = await getSelfProfile(session);
    if (!selfRes || !selfRes.user || !selfRes.user.nickname || !selfRes.user.sec_uid) {
      console.warn("[Diagnostic] Checkpoint 1 thất bại: Phản hồi getSelfProfile thiếu thông tin user.");
      return false;
    }
    console.log(`[Diagnostic] Checkpoint 1 thành công. Nickname: ${selfRes.user.nickname}`);

    console.log("[Diagnostic] Checkpoint 2: Gọi searchAweme với từ khóa 'marketing'...");
    const searchRes = await searchAweme(session, "marketing", 0);
    const data = searchRes?.data || [];
    if (data.length === 0) {
      console.warn("[Diagnostic] Checkpoint 2 thất bại: searchAweme không trả về kết quả nào.");
      return false;
    }
    console.log(`[Diagnostic] Checkpoint 2 thành công. Tìm thấy ${data.length} kết quả tìm kiếm.`);

    // Lấy aweme_id đầu tiên để chạy thử Checkpoint 3
    let firstAwemeId = "";
    for (const item of data) {
      const info = item.aweme_info ?? item.aweme_mix_info?.mix_items?.[0];
      if (info?.aweme_id) {
        firstAwemeId = info.aweme_id;
        break;
      }
    }

    if (!firstAwemeId) {
      console.warn("[Diagnostic] Checkpoint 2 thành công nhưng không tìm thấy aweme_id hợp lệ nào để chạy tiếp Checkpoint 3.");
      return false;
    }

    console.log(`[Diagnostic] Checkpoint 3: Gọi getAwemeDetail cho video ID: ${firstAwemeId}...`);
    const detailRes = await getAwemeDetail(session, firstAwemeId);
    if (!detailRes || !detailRes.aweme_detail || detailRes.aweme_detail.aweme_id !== firstAwemeId) {
      console.warn("[Diagnostic] Checkpoint 3 thất bại: Phản hồi getAwemeDetail không hợp lệ hoặc sai ID.");
      return false;
    }
    console.log("[Diagnostic] Checkpoint 3 thành công.");
    console.log("[Diagnostic] Kết luận: Phiên đăng nhập hoạt động tốt (PASS).");
    return true;
  } catch (err) {
    console.error("[Diagnostic] Lỗi trong quá trình chuẩn đoán phiên:", (err as Error).message);
    return false;
  }
}
