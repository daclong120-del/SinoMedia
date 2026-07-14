# Plan: Douyin Creative Crawl Test Cases

Ngay lap: 2026-07-14
Trang thai: Planned
Pham vi: `crawler-pipeline`, queue worker, Supabase crawler storage, Creative Hub read path, automation-test live smoke/contract tests

Plan nay liet ke bo test case xoay quanh viec cao creative trong Douyin. Muc tieu khong phai viet code ngay, ma khoa lai coverage can co de AI sau trien khai automation theo module nho, tranh sua source dashboard/crawler de lam test xanh gia.

## 0. Context hien tai

- Douyin crawler runtime dang di theo huong HTTP-first: `DouyinSession -> signed HTTP request -> normalized storage`.
- Playwright/browser chi dung cho bootstrap/hydrate session va diagnostic, khong phai crawler runtime mac dinh.
- Luong core dang co trong `crawler-pipeline/src/crawl/douyin/core.ts`:
  - `crawl(target)` de cao chi tiet mot aweme/video.
  - `creator(target)` de cao creator profile va danh sach video.
  - `search(keyword, maxCount)` de cao creative theo tu khoa.
  - `comments(target, maxCount)` de cao binh luan cua aweme.
- Queue worker doc metadata:
  - `tags`
  - `language`
  - `crawl_comments`
  - `crawl_sub_comments`
  - `headless`
- Creative Hub doc du lieu chinh tu `crawled_posts`, `crawled_authors`, `post_metric_snapshots` va service `dashboard/lib/services/creative.service.ts`.

## 1. Nguyen tac test

- Default automation khong duoc goi live Douyin neu thieu flag env.
- Live Douyin test phai gan tag `@live-douyin` va chi chay khi `RUN_LIVE_DOUYIN_CREATIVE=1`.
- Credential/cookie/profile doc tu env hoac account pool test, khong hardcode cookie that.
- Khong assert noi dung creative co dinh vi Douyin thay doi theo region/session/ranking.
- Assert theo contract on dinh: id pattern, shape, normalized DB row, task status, media contract, error classification.
- Khong sua source dashboard/crawler production chi de test pass.
- Neu Douyin tra captcha/login/soft block, test phai verify classify dung thay vi fail mo ho.
- Moi test title khi implement can co ID dau dong, vi du `TC_DY_CREATIVE_001 - ...`.

## 2. Module de xuat trong automation-test

```text
automation-test/tests/douyin-creative/
|-- module.json
|-- douyin-creative-contract.spec.ts
|-- douyin-creative-live.spec.ts
`-- douyin-creative-cases.md
```

`module.json` de xuat:

```json
{
  "id": "douyin-creative",
  "name": "Douyin Creative Crawl",
  "description": "Kiem thu cao creative Douyin tu session, search, creator, detail, comments den Creative Hub.",
  "type": ["backend"],
  "specs": [
    "tests/douyin-creative/douyin-creative-contract.spec.ts",
    "tests/douyin-creative/douyin-creative-live.spec.ts"
  ],
  "tags": ["@douyin", "@creative", "@crawler", "@backend"],
  "requiresAuth": false,
  "enabled": true,
  "parallelSafe": false,
  "recommendedWorkers": 1,
  "maxWorkers": 1
}
```

## 3. Env/fixture can co

```env
RUN_LIVE_DOUYIN_CREATIVE=0
DOUYIN_TEST_KEYWORD=AI
DOUYIN_TEST_AWEME_ID=
DOUYIN_TEST_VIDEO_URL=
DOUYIN_TEST_CREATOR_SEC_UID=
DOUYIN_TEST_CREATOR_URL=
DOUYIN_TEST_MAX_COUNT=3
```

Fixture contract nen co:

```text
automation-test/fixtures/douyin/
|-- aweme-detail-video.json
|-- aweme-detail-image.json
|-- search-page.json
|-- creator-profile.json
|-- creator-posts-page.json
|-- comments-page.json
|-- session-diagnostic-ok.json
|-- session-diagnostic-login-required.json
`-- session-diagnostic-captcha.json
```

## 4. Test case matrix

| ID | Tier | Type | Default? | Ten case | Expected chinh |
|---|---|---|---|---|---|
| TC_DY_CREATIVE_001 | P0 | contract | Yes | Map aweme video detail thanh `crawled_posts` row | `platform=douyin`, `platform_id=aweme_id`, caption/title/source_url/media fields/statistics hop le. |
| TC_DY_CREATIVE_002 | P0 | contract | Yes | Map aweme image/carousel detail | `media_type=image` hoac `carousel`, media_status/source hop le, khong ep thanh video. |
| TC_DY_CREATIVE_003 | P0 | contract | Yes | Tao canonical/source URL tu aweme id | `source_url` tro ve Douyin aweme/video, khong null khi co id. |
| TC_DY_CREATIVE_004 | P0 | contract | Yes | Upsert idempotent theo `platform + platform_id` | Chay cung aweme 2 lan khong tao duplicate post. |
| TC_DY_CREATIVE_005 | P1 | contract | Yes | Stats normalize | view/like/comment/share duoc map ve number, missing stats ve 0/null theo contract. |
| TC_DY_CREATIVE_006 | P1 | contract | Yes | Author normalize | upsert author co `platform_uid`, nickname/avatar/raw; post link dung author uuid. |
| TC_DY_CREATIVE_007 | P1 | contract | Yes | Tags/language metadata propagate | Task metadata `tags`, `language` di vao `crawled_posts.tags/language`. |
| TC_DY_CREATIVE_008 | P1 | contract | Yes | Media thieu thi re-fetch detail | Search/creator item thieu media goi detail endpoint, post cuoi co media hoac media_status classified. |
| TC_DY_CREATIVE_009 | P1 | contract | Yes | Aweme detail invalid shape | Thieu `aweme_id`/video malformed bi reject co error ro. |
| TC_DY_CREATIVE_010 | P1 | contract | Yes | Hyphen/hash tag cleanup trong title | Caption co tag/mention khong lam hong title/caption normalized. |

## 5. Session/bootstrap test cases

| ID | Tier | Type | Default? | Ten case | Expected chinh |
|---|---|---|---|---|---|
| TC_DY_SESSION_001 | P0 | contract | Yes | Cookie raw string tao duoc `DouyinSession` | Session co cookie/header/signing input can thiet, khong log secret. |
| TC_DY_SESSION_002 | P0 | contract | Yes | Cookie JSON object/array tao duoc session | Normalize dung `name=value; ...`. |
| TC_DY_SESSION_003 | P0 | contract | Yes | Diagnostic OK cho session hop le | `ensureLogin` chap nhan account, checkin success sau run. |
| TC_DY_SESSION_004 | P0 | contract | Yes | Diagnostic login-required | Account bi checkin failure, crawler xoay account tiep theo. |
| TC_DY_SESSION_005 | P1 | contract | Yes | Diagnostic captcha/soft block | Error duoc classify la captcha/soft-block, khong bao completed rong. |
| TC_DY_SESSION_006 | P1 | contract | Yes | Het account pool thi fallback local session | Neu local session OK thi run tiep; neu khong co thi fail-fast co message ro. |
| TC_DY_SESSION_007 | P1 | security | Yes | Log redaction cookie/session | Log khong in `cookie_data`, token, raw cookie. |
| TC_DY_SESSION_008 | P2 | live-smoke | No | Browser bootstrap hydrates raw cookie | Khi opt-in, Playwright persistent context hydrate session va diagnostic pass. |

## 6. Search creative test cases

| ID | Tier | Type | Default? | Ten case | Expected chinh |
|---|---|---|---|---|---|
| TC_DY_SEARCH_001 | P0 | contract | Yes | Search response page co data | Extract duoc aweme id tu `aweme_info` hoac `aweme_mix_info.mix_items[0]`. |
| TC_DY_SEARCH_002 | P0 | contract | Yes | Search maxCount stop dung | `maxCount=3` chi persist toi da 3 posts. |
| TC_DY_SEARCH_003 | P0 | contract | Yes | Search page 1 empty | Throw/classify "0 results page 1", task result_state `empty`. |
| TC_DY_SEARCH_004 | P1 | contract | Yes | Search multi-page cursor/searchId | Page sau dung offset/searchId, khong lap vo han. |
| TC_DY_SEARCH_005 | P1 | contract | Yes | Search item invalid bi skip | Item thieu aweme id khong crash ca task. |
| TC_DY_SEARCH_006 | P1 | contract | Yes | Detail fail tung item van tiep tuc | Loi 1 aweme khong lam mat cac aweme con lai. |
| TC_DY_SEARCH_007 | P1 | contract | Yes | Batch upsert sau moi page | Page co posts thi goi upsertPosts theo batch, khong upsert tung item qua nhieu. |
| TC_DY_SEARCH_008 | P2 | live-smoke | No | Live keyword crawl nho | `DOUYIN_TEST_KEYWORD`, `maxCount<=3`, ket qua full/partial/empty duoc classify ro. |

## 7. Creator creative test cases

| ID | Tier | Type | Default? | Ten case | Expected chinh |
|---|---|---|---|---|---|
| TC_DY_CREATOR_001 | P0 | contract | Yes | Extract `sec_user_id` tu URL day du | URL `/user/<sec_uid>` tra sec_uid. |
| TC_DY_CREATOR_002 | P0 | contract | Yes | Extract `sec_user_id` tu short URL | Short URL duoc resolve roi parse dung. |
| TC_DY_CREATOR_003 | P0 | contract | Yes | Creator profile valid | Validate co `user.sec_uid`, upsert author dung platform_uid. |
| TC_DY_CREATOR_004 | P0 | contract | Yes | Creator max posts limit | `CREATOR_MAX_POSTS` hoac maxCount gioi han tong post. |
| TC_DY_CREATOR_005 | P1 | contract | Yes | Creator pagination has_more/max_cursor | Chay qua nhieu page den khi het hoac du limit. |
| TC_DY_CREATOR_006 | P1 | contract | Yes | Creator post thieu media re-fetch detail | Detail refetch khi item thieu `video.play_addr` va images. |
| TC_DY_CREATOR_007 | P1 | contract | Yes | Creator page empty stop sach | Khong throw neu het page sau khi da co data. |
| TC_DY_CREATOR_008 | P2 | live-smoke | No | Live creator crawl nho | `DOUYIN_TEST_CREATOR_SEC_UID`, max 3, persist/partial/empty duoc classify ro. |

## 8. Single creative/detail test cases

| ID | Tier | Type | Default? | Ten case | Expected chinh |
|---|---|---|---|---|---|
| TC_DY_DETAIL_001 | P0 | contract | Yes | Extract aweme id tu numeric id | Numeric id tra ve chinh no. |
| TC_DY_DETAIL_002 | P0 | contract | Yes | Extract aweme id tu `/video/<id>` | URL video parse dung id. |
| TC_DY_DETAIL_003 | P0 | contract | Yes | Extract aweme id tu `modal_id` | URL co query `modal_id` parse dung id. |
| TC_DY_DETAIL_004 | P0 | contract | Yes | Invalid URL fail ro | Error message "khong the trich xuat ID". |
| TC_DY_DETAIL_005 | P0 | contract | Yes | Detail persist one post | `crawlVideo` goi detail, validate, upsert post. |
| TC_DY_DETAIL_006 | P1 | contract | Yes | Detail author missing fallback | Missing author nickname/avatar van persist duoc voi fallback safe. |
| TC_DY_DETAIL_007 | P1 | contract | Yes | Detail media unavailable | Missing media duoc classify, khong crash dashboard detail. |
| TC_DY_DETAIL_008 | P2 | live-smoke | No | Live one aweme crawl | Env aweme id/url, persist 1 row hoac auth/captcha error ro. |

## 9. Comments test cases

| ID | Tier | Type | Default? | Ten case | Expected chinh |
|---|---|---|---|---|---|
| TC_DY_COMMENT_001 | P0 | contract | Yes | Crawl first-level comments | Map comment row co aweme id/post uuid/content/user/stat. |
| TC_DY_COMMENT_002 | P0 | contract | Yes | `maxCount` comments limit | Chi persist toi da maxCount comment cap 1. |
| TC_DY_COMMENT_003 | P1 | contract | Yes | Cursor/has_more stop dung | Loop dung khi het comments hoac du limit. |
| TC_DY_COMMENT_004 | P1 | contract | Yes | With replies off | `crawl_sub_comments=false` khong goi reply endpoint. |
| TC_DY_COMMENT_005 | P1 | contract | Yes | With replies on | Comment co `reply_comment_total>0` goi reply endpoint va map parent id. |
| TC_DY_COMMENT_006 | P1 | contract | Yes | Post uuid missing | Neu aweme chua co post uuid, error/classification ro. |
| TC_DY_COMMENT_007 | P2 | live-smoke | No | Live comments nho | `DOUYIN_TEST_AWEME_ID`, max 5, classify empty/partial/full. |

## 10. Queue/task lifecycle test cases

| ID | Tier | Type | Default? | Ten case | Expected chinh |
|---|---|---|---|---|---|
| TC_DY_TASK_001 | P0 | contract | Yes | Task search sets running metadata | `progress.current=0`, `target=maxCount`, `phase=collecting_posts`, `result_state=running`. |
| TC_DY_TASK_002 | P0 | contract | Yes | Task completed full | Status `completed`, metadata `result_state=full`, progress current>=target. |
| TC_DY_TASK_003 | P0 | contract | Yes | Task completed partial | Status `completed` voi warning message partial, khong fail ca task. |
| TC_DY_TASK_004 | P0 | contract | Yes | Task completed empty | Status `completed` hoac warning co `result_state=empty`, error_message ro. |
| TC_DY_TASK_005 | P1 | contract | Yes | Task timeout partial | Timeout ghi `failed`, error message co da luu `current/target`. |
| TC_DY_TASK_006 | P1 | contract | Yes | Metadata crawl_comments false | Search/creator khong cao comments sau khi persist posts. |
| TC_DY_TASK_007 | P1 | contract | Yes | Metadata crawl_sub_comments false | Comments khong cao reply comments. |
| TC_DY_TASK_008 | P1 | contract | Yes | Metadata headless override | `CONFIG.headless` override trong task va restore trong finally. |
| TC_DY_TASK_009 | P1 | contract | Yes | CURRENT_TASK env cleanup | Sau task xong, env `CURRENT_TASK_*` bi xoa. |

## 11. Creative Hub read-path test cases

| ID | Tier | Type | Default? | Ten case | Expected chinh |
|---|---|---|---|---|---|
| TC_DY_HUB_001 | P0 | backend | Yes | Search Creative Hub filter platform douyin | `searchAds({ platform: douyin })` chi tra Douyin posts. |
| TC_DY_HUB_002 | P0 | backend | Yes | Creative detail doc duoc post Douyin moi crawl | Detail co caption/media/source/stat/author. |
| TC_DY_HUB_003 | P1 | backend | Yes | Trending sort theo views | Douyin posts duoc order theo play/view count dung. |
| TC_DY_HUB_004 | P1 | backend | Yes | New creatives sort theo crawled_at/published_at | Creative moi crawl hien trong `/dash/creative/new`. |
| TC_DY_HUB_005 | P1 | backend | Yes | Advertiser aggregate | Author Douyin co creative_count/total_views/total_likes dung. |
| TC_DY_HUB_006 | P1 | backend | Yes | Growth snapshots | `post_metric_snapshots` co the tinh growth thuc te cho post Douyin. |
| TC_DY_HUB_007 | P2 | UI | No | Creative card opens detail modal | UI `/dash/creative/search?platform=douyin` mo modal detail khong reload list. |
| TC_DY_HUB_008 | P2 | UI | No | Media fallback display | Post Douyin thieu media hien fallback/source link, khong crash card/detail. |

## 12. Fault/security/rate-limit test cases

| ID | Tier | Type | Default? | Ten case | Expected chinh |
|---|---|---|---|---|---|
| TC_DY_FAULT_001 | P0 | security | Yes | Cookie/session khong leak vao log | Log redaction bat tat ca secret pattern. |
| TC_DY_FAULT_002 | P0 | contract | Yes | Login required response | Classify session/login error, account failure_count tang. |
| TC_DY_FAULT_003 | P0 | contract | Yes | Captcha/verify response | Classify captcha/soft block, khong mark full success. |
| TC_DY_FAULT_004 | P1 | contract | Yes | Network timeout detail endpoint | Item fail duoc log, page tiep tuc neu con item. |
| TC_DY_FAULT_005 | P1 | contract | Yes | Rate limit response | Retry/backoff hoac fail classified; khong loop vo han. |
| TC_DY_FAULT_006 | P1 | contract | Yes | Duplicate task same target | Upsert idempotent, task khong tao duplicate post. |
| TC_DY_FAULT_007 | P1 | contract | Yes | Malformed DB row rejected | Storage layer khong insert row thieu platform/platform_id. |
| TC_DY_FAULT_008 | P2 | live-smoke | No | Live soft-block smoke | Khi Douyin chan, runner hien error ro thay vi empty xanh gia. |

## 13. Automation priority

### Phase A - Contract fixtures

- Tao fixtures Douyin response.
- Viet tests cho mapper/detail/search/creator/comments bang mock/fixture.
- Khong goi live network.

### Phase B - Queue task contract

- Mock `CrawlerFactory`, `supabaseRest`, task metadata.
- Test status/progress/result_state/error_message.
- Dam bao env cleanup va timeout partial.

### Phase C - Storage/Creative Hub backend

- Dung test DB hoac repository mock.
- Seed Douyin crawled_posts/authors/snapshots.
- Test creative service read path: search/new/trending/detail/advertiser/growth.

### Phase D - Live Douyin smoke opt-in

- Chi chay khi `RUN_LIVE_DOUYIN_CREATIVE=1`.
- Limit rat nho: `maxCount <= 3`, comments <= 5.
- Ket qua hop le gom: `full`, `partial`, `empty-classified`, `auth/captcha-classified`.
- Khong dua vao default Run All neu chua co session test on dinh.

## 14. Definition of Done

- Co module `douyin-creative` trong automation-test registry.
- `npm run test:module -- douyin-creative -- --list` list du cases contract.
- Default contract tests khong can live Douyin va pass on dinh.
- Live smoke co guard env; thieu env thi skip ro rang.
- Moi failure noi ro la mapper/storage/session/auth/captcha/rate-limit/DB/UI read path.
- Test artifact khong log cookie/token/session raw.
- Creative Hub sau crawl co the doc duoc post Douyin moi qua service/backend test.

## 15. Khong lam trong plan nay

- Khong them crawler feature moi.
- Khong thay Douyin HTTP API crawler bang Firecrawl.
- Khong dua Playwright browser vao hot path crawler runtime.
- Khong tai video ve local/R2 nhu downloader service.
- Khong sua source dashboard production de lam live Douyin smoke xanh.
