# Phase B — Cào theo từ khóa (search)

> Port `search_info_by_keyword` (client.py) + `search()` (core.py) sang TS.
> Dùng cho "discovery feed". **⚠️ Search KHÔNG ký `a_bogus`.**

## Endpoint (chi tiết: `maps/douyin-api-reference.md` mục 4)
- `GET /aweme/v1/web/general/search/single/`
- params chính: `search_channel=aweme_general, enable_history=1, keyword, search_source=tab_search, query_correct_type=1, is_filter_search=0, from_group_id=7378810571505847586, offset, count=15, need_filter_settings=1, list_type=multi, search_id`
- header `Referer = encodeURI("https://www.douyin.com/search/<keyword>?aid=f594bbd9-a0e2-4651-9319-ebe3cb6298c1&type=general")`
- Response: `{ data: [...], extra: { logid } }`

## Cần implement (trong `src/crawl/douyin.ts`)

### `crawlSearch(keyword, maxCount = 30)`
```
let page = 0, searchId = "", collected = 0;
const LIMIT = 10;                     // dy_limit_count gốc
while (collected < maxCount) {
  const offset = page * LIMIT;        // gốc: page*10 - 10 với page bắt đầu 1; ở đây page bắt đầu 0 → offset = page*10
  const referer = encodeURI(`https://www.douyin.com/search/${keyword}?aid=f594bbd9-a0e2-4651-9319-ebe3cb6298c1&type=general`);
  const res = await douyinGet("/aweme/v1/web/general/search/single/", {
    search_channel:"aweme_general", enable_history:"1", keyword,
    search_source:"tab_search", query_correct_type:"1", is_filter_search:"0",
    from_group_id:"7378810571505847586", offset:String(offset), count:"15",
    need_filter_settings:"1", list_type:"multi", search_id:searchId,
  }, { sign:false, referer });                 // sign:false → không thêm a_bogus (douyinGet cũng tự bỏ vì uri chứa /general/search)

  const data = res.data ?? [];
  if (data.length === 0) break;                // hết kết quả / bị风控
  searchId = res.extra?.logid ?? "";
  for (const item of data) {
    const info = item.aweme_info ?? item.aweme_mix_info?.mix_items?.[0];
    if (!info?.aweme_id) continue;
    try {
      const detail = (await douyinGet("/aweme/v1/web/aweme/detail/", { aweme_id: info.aweme_id })).aweme_detail ?? info;
      await persistAweme(detail);
      collected++;
    } catch (e) { /* log, bỏ qua */ }
    if (collected >= maxCount) break;
    await sleep(CRAWL_SLEEP_MS);
  }
  page++;
  await sleep(CRAWL_SLEEP_MS);
}
```
- **Re-fetch detail:** item search thường **thiếu field media** → nên re-fetch `aweme/detail/` cho từng `aweme_id` (đường detail CÓ ký a_bogus) trước khi `persistAweme`. Đây là điểm khác Phase A.

### CLI
`src/index.ts`: `search <keyword> [maxCount]` → `crawlSearch(...)`. Script: `"search": "tsx src/index.ts search"`.

## Tiêu chí hoàn thành
- `npm run search "<từ khóa>" 20` thu ≥ vài chục video, phân trang bằng `search_id`.
- Dữ liệu đầy đủ media (nhờ re-fetch detail), không trùng.

## ⚠️ Bẫy
- **KHÔNG ký a_bogus cho `/general/search`** — nếu ký, Douyin trả rỗng/lỗi.
- `search_id` bắt buộc lấy từ `extra.logid` trang trước, thiếu → phân trang sai/lặp trang 1.
- `data` có thể trộn nhiều loại card; chỉ lấy phần có `aweme_info`/`aweme_mix_info`.
