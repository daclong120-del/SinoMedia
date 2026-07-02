# Test Cases: Bilibili Crawler Platform

## Overview
- **Feature**: Bilibili Crawler Platform Migration
- **Requirements Source**: Porting of MediaCrawler (Python) to TS-based pipeline (`crawler-pipeline/src/crawl/bilibili`)
- **Test Coverage**: Functional, Edge Cases, Error Handling, and Browser Fallback mechanics for Bilibili video details, Creator Profiles, Comments, and Search.
- **Last Updated**: 2026-07-02

---

## Test Case Categories

### 1. Functional Tests (Happy Paths)

#### TC-F-001: Crawl Bilibili Video Detail (BV link)
- **Requirement**: Support crawling a specific Bilibili video page and extracting details (like_count, view_count, title, description, play_url).
- **Priority**: High
- **Preconditions**:
  - Valid Bilibili Video URL or BV ID (e.g., `https://www.bilibili.com/video/BV1134y1q77Z` or `BV1134y1q77Z`).
  - Active internet connection.
- **Test Steps**:
  1. Run `npm run crawl -- https://www.bilibili.com/video/BV1134y1q77Z`
  2. Verify command routes to `BilibiliCrawler`.
  3. Observe HTML fetch and fallback extraction.
  4. Verify the extracted output contains video title, description, stats, and download link.
- **Expected Results**:
  - Crawler successfully parses detail page.
  - Video content/images are queued for upload to R2 and metadata is written to Supabase.
- **Postconditions**: Video detail is persisted.

#### TC-F-002: Crawl Bilibili Comments
- **Requirement**: Support crawling root comments for a specific video.
- **Priority**: Medium
- **Preconditions**:
  - Target Video BV ID (e.g., `BV1134y1q77Z`).
- **Test Steps**:
  1. Run `npm run comments -- BV1134y1q77Z 20`
  2. Observe comments api route fetching.
  3. Verify pagination of comments up to 20.
- **Expected Results**:
  - Comments are correctly parsed (id, message, like_count, author name/mid).
  - Comments structure is correctly upserted to the database.
- **Postconditions**: Comments table gets populated.

#### TC-F-003: Crawl Bilibili Creator Channel
- **Requirement**: Crawl creator profile metadata and list of videos.
- **Priority**: High
- **Preconditions**:
  - Valid Bilibili Creator profile page (e.g., `https://space.bilibili.com/39665558`).
- **Test Steps**:
  1. Run `npm run creator -- https://space.bilibili.com/39665558`
  2. Verify creator profile extraction.
  3. Verify iteration over creator's videos list.
- **Expected Results**:
  - Creator name, avatar, and stats are saved.
  - Creator's list of videos is fetched and detail crawling is initiated for each video.
- **Postconditions**: Creator and their video inventory are synced.

#### TC-F-004: Crawl Bilibili Search
- **Requirement**: Crawl videos based on a search keyword.
- **Priority**: Medium
- **Preconditions**:
  - None.
- **Test Steps**:
  1. Run `npm run search -- "python" 5 -p bilibili`
  2. Observe search endpoint being hit.
  3. Verify extraction of top 5 videos.
- **Expected Results**:
  - Search returns the list of video items.
  - Video items details are parsed and logged.

---

### 2. Edge Case Tests

#### TC-E-001: Mobile Sharing URL Resolution
- **Requirement**: Handle redirects from short urls (e.g., `https://b23.tv/...`).
- **Priority**: Medium
- **Test Steps**:
  1. Pass a `b23.tv` short sharing URL to `npm run crawl`.
  2. Verify redirect resolution before invoking Bilibili client APIs.
- **Expected Results**:
  - Crawler extracts the canonical BV ID from redirect URL and processes it.

---

### 3. State & Browser Fallback Tests

#### TC-ST-001: Windows Browser Fallback
- **Requirement**: Automatically use `CloakBrowser` on Windows platform.
- **Priority**: High
- **Preconditions**:
  - Environment: Windows OS.
- **Test Steps**:
  1. Run `npm run crawl -- BV1134y1q77Z`
  2. Check logs for browser context initialization.
  3. Ensure it bypasses -412 request ban using `CloakBrowser` network context.
- **Expected Results**:
  - CloakBrowser launches, navigates to Bilibili, and successfully executes API queries.
