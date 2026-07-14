# Douyin Creative Crawl Test Cases

Tài liệu này lưu trữ danh sách và ma trận test cases cho tính năng Douyin Creative Crawl.

## 1. Test case matrix (Creative Normalize & Storage)

| ID | Tier | Type | Default? | Tên case | Expected chính |
|---|---|---|---|---|---|
| TC_DY_CREATIVE_001 | P0 | contract | Yes | Map aweme video detail thành `crawled_posts` row | `platform=douyin`, `platform_id=aweme_id`, caption/title/source_url/media fields/statistics hợp lệ. |
| TC_DY_CREATIVE_002 | P0 | contract | Yes | Map aweme image/carousel detail | `media_type=image` hoặc `carousel`, media_status/source hợp lệ, không ép thành video. |
| TC_DY_CREATIVE_003 | P0 | contract | Yes | Tạo canonical/source URL từ aweme id | `source_url` trỏ về Douyin aweme/video, không null khi có id. |
| TC_DY_CREATIVE_004 | P0 | contract | Yes | Upsert idempotent theo `platform + platform_id` | Chạy cùng aweme 2 lần không tạo duplicate post. |
| TC_DY_CREATIVE_005 | P1 | contract | Yes | Stats normalize | view/like/comment/share được map về number, missing stats về 0/null theo contract. |
| TC_DY_CREATIVE_006 | P1 | contract | Yes | Author normalize | upsert author có `platform_uid`, nickname/avatar/raw; post link dùng author uuid. |
| TC_DY_CREATIVE_007 | P1 | contract | Yes | Tags/language metadata propagate | Task metadata `tags`, `language` đi vào `crawled_posts.tags/language`. |
| TC_DY_CREATIVE_008 | P1 | contract | Yes | Media thiếu thì re-fetch detail | Search/creator item thiếu media gọi detail endpoint, post cuối có media hoặc media_status classified. |
| TC_DY_CREATIVE_009 | P1 | contract | Yes | Aweme detail invalid shape | Thiếu `aweme_id`/video malformed bị reject có error rõ. |
| TC_DY_CREATIVE_010 | P1 | contract | Yes | Hyphen/hash tag cleanup trong title | Caption có tag/mention không làm hỏng title/caption normalized. |

## 2. Session/bootstrap test cases

| ID | Tier | Type | Default? | Tên case | Expected chính |
|---|---|---|---|---|---|
| TC_DY_SESSION_001 | P0 | contract | Yes | Cookie raw string tạo được `DouyinSession` | Session có cookie/header/signing input cần thiết, không log secret. |
| TC_DY_SESSION_002 | P0 | contract | Yes | Cookie JSON object/array tạo được session | Normalize đúng `name=value; ...`. |
| TC_DY_SESSION_003 | P0 | contract | Yes | Diagnostic OK cho session hợp lệ | `ensureLogin` chấp nhận account, checkin success sau run. |
| TC_DY_SESSION_004 | P0 | contract | Yes | Diagnostic login-required | Account bị checkin failure, crawler xoay account tiếp theo. |
| TC_DY_SESSION_005 | P1 | contract | Yes | Diagnostic captcha/soft block | Error được classify là captcha/soft-block, không báo completed rỗng. |
| TC_DY_SESSION_006 | P1 | contract | Yes | Hết account pool thì fallback local session | Nếu local session OK thì run tiếp; nếu không có thì fail-fast có message rõ. |
| TC_DY_SESSION_007 | P1 | security | Yes | Log redaction cookie/session | Log không in `cookie_data`, token, raw cookie. |
| TC_DY_SESSION_008 | P2 | live-smoke | No | Browser bootstrap hydrates raw cookie | Khi opt-in, Playwright persistent context hydrate session và diagnostic pass. |

## 3. Search creative test cases

| ID | Tier | Type | Default? | Tên case | Expected chính |
|---|---|---|---|---|---|
| TC_DY_SEARCH_001 | P0 | contract | Yes | Search response page có data | Extract được aweme id từ `aweme_info` hoặc `aweme_mix_info.mix_items[0]`. |
| TC_DY_SEARCH_002 | P0 | contract | Yes | Search maxCount stop đúng | `maxCount=3` chỉ persist tối đa 3 posts. |
| TC_DY_SEARCH_003 | P0 | contract | Yes | Search page 1 empty | Throw/classify "0 results page 1", task result_state `empty`. |
| TC_DY_SEARCH_004 | P1 | contract | Yes | Search multi-page cursor/searchId | Page sau dùng offset/searchId, không lặp vô hạn. |
| TC_DY_SEARCH_005 | P1 | contract | Yes | Search item invalid bị skip | Item thiếu aweme id không crash cả task. |
| TC_DY_SEARCH_006 | P1 | contract | Yes | Detail fail từng item vẫn tiếp tục | Lỗi 1 aweme không làm mất các aweme còn lại. |
| TC_DY_SEARCH_007 | P1 | contract | Yes | Batch upsert sau mỗi page | Page có posts thì gọi upsertPosts theo batch, không upsert từng item quá nhiều. |
| TC_DY_SEARCH_008 | P2 | live-smoke | No | Live keyword crawl nhỏ | `DOUYIN_TEST_KEYWORD`, `maxCount<=3`, kết quả full/partial/empty được classify rõ. |

## 4. Creator creative test cases

| ID | Tier | Type | Default? | Tên case | Expected chính |
|---|---|---|---|---|---|
| TC_DY_CREATOR_001 | P0 | contract | Yes | Extract `sec_user_id` từ URL đầy đủ | URL `/user/<sec_uid>` trả sec_uid. |
| TC_DY_CREATOR_002 | P0 | contract | Yes | Extract `sec_user_id` từ short URL | Short URL được resolve rồi parse đúng. |
| TC_DY_CREATOR_003 | P0 | contract | Yes | Creator profile valid | Validate có `user.sec_uid`, upsert author đúng platform_uid. |
| TC_DY_CREATOR_004 | P0 | contract | Yes | Creator max posts limit | `CREATOR_MAX_POSTS` hoặc maxCount giới hạn tổng post. |
| TC_DY_CREATOR_005 | P1 | contract | Yes | Creator pagination has_more/max_cursor | Chạy qua nhiều page đến khi hết hoặc đủ limit. |
| TC_DY_CREATOR_006 | P1 | contract | Yes | Creator post thiếu media re-fetch detail | Detail refetch khi item thiếu `video.play_addr` và images. |
| TC_DY_CREATOR_007 | P1 | contract | Yes | Creator page empty stop sạch | Không throw nếu hết page sau khi đã có data. |
| TC_DY_CREATOR_008 | P2 | live-smoke | No | Live creator crawl nhỏ | `DOUYIN_TEST_CREATOR_SEC_UID`, max 3, persist/partial/empty được classify rõ. |

## 5. Single creative/detail test cases

| ID | Tier | Type | Default? | Tên case | Expected chính |
|---|---|---|---|---|---|
| TC_DY_DETAIL_001 | P0 | contract | Yes | Extract aweme id từ numeric id | Numeric id trả về chính nó. |
| TC_DY_DETAIL_002 | P0 | contract | Yes | Extract aweme id từ `/video/<id>` | URL video parse đúng id. |
| TC_DY_DETAIL_003 | P0 | contract | Yes | Extract aweme id từ `modal_id` | URL có query `modal_id` parse đúng id. |
| TC_DY_DETAIL_004 | P0 | contract | Yes | Invalid URL fail rõ | Error message "không thể trích xuất ID". |
| TC_DY_DETAIL_005 | P0 | contract | Yes | Detail persist one post | `crawlVideo` gọi detail, validate, upsert post. |
| TC_DY_DETAIL_006 | P1 | contract | Yes | Detail author missing fallback | Missing author nickname/avatar vẫn persist được với fallback safe. |
| TC_DY_DETAIL_007 | P1 | contract | Yes | Detail media unavailable | Missing media được classify, không crash dashboard detail. |
| TC_DY_DETAIL_008 | P2 | live-smoke | No | Live one aweme crawl | Env aweme id/url, persist 1 row hoặc auth/captcha error rõ. |

## 6. Comments test cases

| ID | Tier | Type | Default? | Tên case | Expected chính |
|---|---|---|---|---|---|
| TC_DY_COMMENT_001 | P0 | contract | Yes | Crawl first-level comments | Map comment row có aweme id/post uuid/content/user/stat. |
| TC_DY_COMMENT_002 | P0 | contract | Yes | `maxCount` comments limit | Chỉ persist tối đa maxCount comment cấp 1. |
| TC_DY_COMMENT_003 | P1 | contract | Yes | Cursor/has_more stop đúng | Loop dừng khi hết comments hoặc đủ limit. |
| TC_DY_COMMENT_004 | P1 | contract | Yes | With replies off | `crawl_sub_comments=false` không gọi reply endpoint. |
| TC_DY_COMMENT_005 | P1 | contract | Yes | With replies on | Comment có `reply_comment_total>0` gọi reply endpoint và map parent id. |
| TC_DY_COMMENT_006 | P1 | contract | Yes | Post uuid missing | Nếu aweme chưa có post uuid, error/classification rõ. |
| TC_DY_COMMENT_007 | P2 | live-smoke | No | Live comments nhỏ | `DOUYIN_TEST_AWEME_ID`, max 5, classify empty/partial/full. |

## 7. Queue/task lifecycle test cases

| ID | Tier | Type | Default? | Tên case | Expected chính |
|---|---|---|---|---|---|
| TC_DY_TASK_001 | P0 | contract | Yes | Task search sets running metadata | `progress.current=0`, `target=maxCount`, `phase=collecting_posts`, `result_state=running`. |
| TC_DY_TASK_002 | P0 | contract | Yes | Task completed full | Status `completed`, metadata `result_state=full`, progress current>=target. |
| TC_DY_TASK_003 | P0 | contract | Yes | Task completed partial | Status `completed` với warning message partial, không fail cả task. |
| TC_DY_TASK_004 | P0 | contract | Yes | Task completed empty | Status `completed` hoặc warning có `result_state=empty`, error_message rõ. |
| TC_DY_TASK_005 | P1 | contract | Yes | Task timeout partial | Timeout ghi `failed`, error message có đã lưu `current/target`. |
| TC_DY_TASK_006 | P1 | contract | Yes | Metadata crawl_comments false | Search/creator không cào comments sau khi persist posts. |
| TC_DY_TASK_007 | P1 | contract | Yes | Metadata crawl_sub_comments false | Comments không cào reply comments. |
| TC_DY_TASK_008 | P1 | contract | Yes | Metadata headless override | `CONFIG.headless` override trong task và restore trong finally. |
| TC_DY_TASK_009 | P1 | contract | Yes | CURRENT_TASK env cleanup | Sau task xong, env `CURRENT_TASK_*` bị xóa. |

## 8. Creative Hub read-path test cases

| ID | Tier | Type | Default? | Tên case | Expected chính |
|---|---|---|---|---|---|
| TC_DY_HUB_001 | P0 | backend | Yes | Search Creative Hub filter platform douyin | `searchAds({ platform: douyin })` chỉ trả Douyin posts. |
| TC_DY_HUB_002 | P0 | backend | Yes | Creative detail đọc được post Douyin mới crawl | Detail có caption/media/source/stat/author. |
| TC_DY_HUB_003 | P1 | backend | Yes | Trending sort theo views | Douyin posts được order theo play/view count đúng. |
| TC_DY_HUB_004 | P1 | backend | Yes | New creatives sort theo crawled_at/published_at | Creative mới crawl hiện trong `/dash/creative/new`. |
| TC_DY_HUB_005 | P1 | backend | Yes | Advertiser aggregate | Author Douyin có creative_count/total_views/total_likes đúng. |
| TC_DY_HUB_006 | P1 | backend | Yes | Growth snapshots | `post_metric_snapshots` có thể tính growth thực tế cho post Douyin. |
| TC_DY_HUB_007 | P2 | UI | No | Creative card opens detail modal | UI `/dash/creative/search?platform=douyin` mở modal detail không reload list. |
| TC_DY_HUB_008 | P2 | UI | No | Media fallback display | Post Douyin thiếu media hiện fallback/source link, không crash card/detail. |

## 9. Fault/security/rate-limit test cases

| ID | Tier | Type | Default? | Tên case | Expected chính |
|---|---|---|---|---|---|
| TC_DY_FAULT_001 | P0 | security | Yes | Cookie/session không leak vào log | Log redaction ẩn tất cả secret pattern. |
| TC_DY_FAULT_002 | P0 | contract | Yes | Login required response | Classify session/login error, account failure_count tăng. |
| TC_DY_FAULT_003 | P0 | contract | Yes | Captcha/verify response | Classify captcha/soft block, không mark full success. |
| TC_DY_FAULT_004 | P1 | contract | Yes | Network timeout detail endpoint | Item fail được log, page tiếp tục nếu còn item. |
| TC_DY_FAULT_005 | P1 | contract | Yes | Rate limit response | Retry/backoff hoặc fail classified; không loop vô hạn. |
| TC_DY_FAULT_006 | P1 | contract | Yes | Duplicate task same target | Upsert idempotent, task không tạo duplicate post. |
| TC_DY_FAULT_007 | P1 | contract | Yes | Malformed DB row rejected | Storage layer không insert row thiếu platform/platform_id. |
| TC_DY_FAULT_008 | P2 | live-smoke | No | Live soft-block smoke | Khi Douyin chặn, runner hiện error rõ thay vì empty xanh giả. |
