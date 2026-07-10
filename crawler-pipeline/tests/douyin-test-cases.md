# Test Cases: Douyin Crawler & Account Rotation

## Overview
- **Feature**: Douyin Crawler Platform & Account Rotation Pool Integration
- **Source Code**:
  - Main Core Crawler: [core.ts](file:///d:/Python/SinoMedia/crawler-pipeline/src/crawl/douyin/core.ts)
  - API Client & Sign: [client.ts](file:///d:/Python/SinoMedia/crawler-pipeline/src/crawl/douyin/client.ts)
  - Login Manager: [login.ts](file:///d:/Python/SinoMedia/crawler-pipeline/src/crawl/douyin/login.ts)
- **Requirements Source**: Porting of MediaCrawler (Python) to TS-based pipeline with Supabase-backed Account Rotation (`crawler-pipeline/src/crawl/douyin`)
- **Test Coverage**: Functional (Detail, Comments, Creator, Search), Edge Cases (Short URL resolution), and State/Rotation Tests (Checkout, Health verification, failure count updating, fallback to local/guest).
- **Last Updated**: 2026-07-06

---

## Test Case Categories

### 1. Functional Tests (Happy Paths)

#### TC-F-001: Crawl Douyin Video Detail
- **Requirement**: Support crawling a specific Douyin video page and extracting details (like_count, title, description, play_url, etc.).
- **Priority**: High
- **Preconditions**:
  - Valid Douyin Video URL or Aweme ID (e.g., `https://www.douyin.com/video/7123456789012345678` or `7123456789012345678`).
  - Active internet connection.
- **Test Steps**:
  1. Run `npm run crawl -- -p douyin https://www.douyin.com/video/7123456789012345678`
  2. Verify command routes to `DouyinCrawler`.
  3. Verify API endpoint `/aweme/v1/web/aweme/detail/` is requested successfully.
  4. Verify the extracted output contains video title, statistics, author metadata, and video files are queued for R2 upload.
- **Expected Results**:
  - Crawler successfully parses detail page.
  - Video content is stored in R2 and metadata is written to Supabase.
- **Postconditions**: Video detail is persisted.

#### TC-F-002: Crawl Douyin Comments
- **Requirement**: Support crawling comments of a specific Douyin video.
- **Priority**: Medium
- **Preconditions**:
  - Target Video ID (e.g., `7123456789012345678`).
- **Test Steps**:
  1. Run `npm run comments -- -p douyin 7123456789012345678 20`
  2. Observe comments api route `/aweme/v1/web/comment/list/` fetching.
  3. Verify pagination of comments up to 20.
- **Expected Results**:
  - Comments are correctly parsed (id, text, like_count, author name/uid).
  - Comments structure is correctly upserted to the database.
- **Postconditions**: Comments table gets populated.

#### TC-F-003: Crawl Douyin Creator Channel
- **Requirement**: Crawl creator profile metadata and list of videos.
- **Priority**: High
- **Preconditions**:
  - Valid Douyin Creator profile page (e.g., `https://www.douyin.com/user/MS4wLjABAAAA...`).
- **Test Steps**:
  1. Run `npm run creator -- -p douyin https://www.douyin.com/user/MS4wLjABAAAA...`
  2. Verify creator profile extraction.
  3. Verify iteration over creator's video list.
- **Expected Results**:
  - Creator name, avatar, and stats are saved.
  - Creator's list of videos is fetched and detail crawling is initiated.
- **Postconditions**: Creator and their video inventory are synced.

#### TC-F-004: Crawl Douyin Search
- **Requirement**: Crawl videos based on a search keyword.
- **Priority**: Medium
- **Preconditions**:
  - None.
- **Test Steps**:
  1. Run `npm run search -- -p douyin "funny cats" 5`
  2. Observe search endpoint `/aweme/v1/web/general/search/single/` being hit.
  3. Verify extraction of top 5 videos.
- **Expected Results**:
  - Search returns the list of video items.
  - Video items details are parsed, saved, and logged.

---

### 2. Edge Case Tests

#### TC-E-001: Mobile Short URL Resolution
- **Requirement**: Resolve short sharing URLs (e.g., `https://v.douyin.com/xxxxxx/`).
- **Priority**: High
- **Preconditions**:
  - Valid short URL from Douyin mobile app share menu.
- **Test Steps**:
  1. Pass the short URL to `npm run crawl` (e.g. `npm run crawl -- -p douyin https://v.douyin.com/xxxxxx/`).
  2. Verify redirect resolution to a full video page URL containing aweme_id.
- **Expected Results**:
  - The crawler correctly follows the HTTP redirect and extracts the actual video ID.

---

### 3. State & Account Rotation Tests

#### TC-ROT-001: DB Account Checkout and Validation
- **Requirement**: Checkout an active account from Supabase `crawler_accounts` table, set the session override, and verify if it's alive.
- **Priority**: High
- **Preconditions**:
  - Database contains at least one row in `crawler_accounts` with `platform = 'douyin'` and `status = 'active'`.
- **Test Steps**:
  1. Execute any crawl command (e.g., `npm run crawl -- -p douyin 7123456789012345678`).
  2. Verify log output indicates checking out account from pool.
  3. Ensure database `last_used_at` timestamp for that account is updated.
  4. Ensure client requests use the database session cookie.
- **Expected Results**:
  - The database account session is injected and preferred over the local `session.json`.

#### TC-ROT-002: Session Liveness and Failure Rotation
- **Requirement**: Rotate to the next account if the checked out account's session is dead.
- **Priority**: High
- **Preconditions**:
  - Database contains a mix of valid and invalid cookies under `status = 'active'`.
- **Test Steps**:
  1. Run a crawl task.
  2. Watch logs when an invalid account cookie is checked out.
  3. Verify `checkSessionAlive()` returns `false` (API call `/aweme/v1/web/user/profile/self/` fails/fails to verify).
  4. Verify the database updates the invalid account's failure count and rotates to checkout the next available active account.
- **Expected Results**:
  - Invalid accounts are reported, and the crawler successfully checks out the next account until it finds a working one.

#### TC-ROT-003: Account Banishment
- **Requirement**: Auto-ban an account if it fails 3 times consecutively.
- **Priority**: High
- **Preconditions**:
  - An account with `failure_count = 2` is checked out and fails session validation.
- **Test Steps**:
  1. Trigger a crawl task where the selected account fails.
  2. Verify that the failure count increases to 3.
  3. Verify that the account `status` is updated to `'banned'` in Supabase.
- **Expected Results**:
  - The account status changes to `'banned'` and is excluded from subsequent checkouts.

#### TC-ROT-004: Fallback to Local Session and Guest Mode
- **Requirement**: Fall back to local `session.json` or run Guest mode / Browser login if the Supabase pool is empty or has no working accounts.
- **Priority**: High
- **Preconditions**:
  - No active accounts in `crawler_accounts` for Douyin.
- **Test Steps**:
  1. Trigger a crawl task.
  2. Observe logs indicating no active accounts from DB pool.
  3. Verify the crawler resets the DB session override and falls back to using local `session.json`.
  4. If local session is dead, verify it fails fast with a browser mode removed error or continues in guest/anonymous mode.
- **Expected Results**:
  - The crawler handles the absence of DB accounts gracefully without crashing.

---

## Test Coverage Matrix

| Requirement ID | Test Cases | Coverage Status |
|---------------|------------|-----------------|
| REQ-DY-F-001  | TC-F-001   | ✓ Complete      |
| REQ-DY-F-002  | TC-F-002   | ✓ Complete      |
| REQ-DY-F-003  | TC-F-003   | ✓ Complete      |
| REQ-DY-F-004  | TC-F-004   | ✓ Complete      |
| REQ-DY-E-001  | TC-E-001   | ✓ Complete      |
| REQ-DY-R-001  | TC-ROT-001 | ✓ Complete      |
| REQ-DY-R-002  | TC-ROT-002 | ✓ Complete      |
| REQ-DY-R-003  | TC-ROT-003 | ✓ Complete      |
| REQ-DY-R-004  | TC-ROT-004 | ✓ Complete      |
