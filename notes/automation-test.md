# Automation Test & One-Click Runner

Cập nhật: 2026-07-14
Mục tiêu: chuẩn hóa hướng triển khai automation test cho SinoMedia theo mô hình "nhấn một cái chạy hết A-Z", có dashboard local hiển thị pass/fail cho từng test case.

## 1. Trạng thái hiện tại

| Hạng mục | Trạng thái | Bằng chứng / ghi chú |
|---|---|---|
| Antigravity workflow | Partial | Workflow đã được chuyển sang `.agent/workflow/` với 6 workflow chính. |
| Antigravity skill | Partial | Skill đã có ở `.agent/skill/`. Nếu `.agents/skills/tester` vẫn còn được repo khác dùng thì không xóa vội. |
| Playwright framework | Partial | `automation-test/package.json`, `playwright.config.ts`, `src/pages/*`, `src/utils/ConfigReader.ts`, `tests/role_management.spec.ts`. |
| Test suite chính | Partial | `automation-test/tests/` chỉ nên chứa test chính. File khảo sát DOM nằm ở `automation-test/explore/`. |
| One-click dashboard | Partial | Đã có `automation-test/runner/server.js` và `automation-test/runner/index.html`; cần verify end-to-end bằng `npm run dashboard`. |
| Report | Partial | Playwright HTML report và JSON report đã cấu hình, nhưng artifact phải được ignore và không commit. |
| Coverage A-Z | Planned | Mới có Role Management. Chưa có đủ suite cho từng service/module. |

## 2. Kiến trúc đúng

HTML tĩnh không được tự chạy lệnh shell. Vì vậy one-click runner bắt buộc phải có Node server local đứng giữa:

```text
Browser dashboard
  -> automation-test/runner/server.js
    -> npm run test:all / test:ui / test:backend / test:role
      -> Playwright
        -> reports/results.json
        -> playwright-report/index.html
```

Các thành phần:

| Thành phần | Vai trò |
|---|---|
| `.agent/workflow/` | Workflow AI/Antigravity để sinh framework, requirement, manual test, automation script, road module, flaky analysis. |
| `.agent/skill/` | Skill được workflow gọi trong quá trình phân tích/sinh test. |
| `automation-test/tests/` | Chỉ chứa test case chính được chạy bởi `npm test`. |
| `automation-test/explore/` | Script khảo sát DOM/debug, không chạy trong suite chính. |
| `automation-test/src/pages/` | Page Object Model: locator/action của từng trang. |
| `automation-test/src/utils/` | Config reader/helper dùng chung. |
| `automation-test/runner/` | Local dashboard + Node server để bấm chạy test. |
| `automation-test/reports/` | JSON result/summary đọc bởi dashboard. |
| `automation-test/playwright-report/` | HTML report sinh bởi Playwright, không commit. |

## 3. Commands chuẩn

Chạy trong `automation-test/`:

```powershell
npm run typecheck
npm run test:role
npm run test:ui
npm run test:backend
npm run test:all
npm run dashboard
```

Dashboard local hiện chạy qua:

```powershell
npm run dashboard
```

Mặc định mở:

```text
http://localhost:3005
```

Nếu đổi port, dùng:

```powershell
$env:DASHBOARD_PORT='9324'; npm run dashboard
```

## 4. Quy ước test case

Mọi test case phải có ID ở đầu title:

```ts
test('TC_ROLE_001 - Chặn xóa vai trò mặc định "admin" trên UI', async ({ page }) => {
  // ...
});
```

Quy ước ID:

| Prefix | Module |
|---|---|
| `TC_ROLE_*` | Role Management |
| `TC_LOGIN_*` | Login/Auth |
| `TC_MEMBER_*` | Member Management |
| `TC_API_*` | API |
| `TC_SERVICE_*` | Backend service |

Quy ước tag:

| Tag | Ý nghĩa |
|---|---|
| `@ui` | Test cần browser/UI. |
| `@backend` | Test service/backend không cần browser. |
| `@role` | Test thuộc Role Management. |

Các script `test:ui`, `test:backend`, `test:role` phải grep theo tag hoặc chạy đúng file tương ứng.

## 5. Environment

Test chính không được hardcode credential. Bắt buộc đọc từ `automation-test/.env` hoặc environment của máy chạy:

```env
BASE_URL=http://localhost:3000
PARALLEL_WORKERS=4
HEADLESS=true
TEST_USER_EMAIL=...
TEST_USER_PASSWORD=...
```

`ConfigReader` phải fail rõ nếu thiếu `TEST_USER_EMAIL` hoặc `TEST_USER_PASSWORD`; không fallback sang tài khoản thật trong test chính.

## 6. Artifact và git hygiene

Các artifact không được commit:

```text
automation-test/playwright-report/
automation-test/test-results/
automation-test/tests/*.html
automation-test/evident_requirements/
```

`automation-test/.gitignore` tối thiểu:

```gitignore
node_modules/
playwright-report/
test-results/
.env
tests/*.html
evident_requirements/
```

Nếu artifact đã tracked từ trước, phải gỡ khỏi index bằng `git rm --cached <file>` hoặc `git rm --cached -r <folder>` đúng phạm vi. Không xóa nhầm source.

## 7. Evidence path chuẩn

Không dùng tên cũ `evident_requirements`.

Đường dẫn chuẩn:

```text
automation-test/evidence/requirements/
```

Áp dụng cho workflow, script explore, và mọi tài liệu mới.

## 8. Definition of Done cho one-click runner

Chỉ coi one-click automation test runner là Done khi đủ các điều kiện:

- `npm run typecheck` pass.
- `npm run test:role` chạy được.
- `npm run dashboard` mở dashboard local.
- Bấm `Run Role Management` trên dashboard chạy test thật.
- Dashboard hiển thị total/passed/failed/skipped và từng test case.
- Có link mở Playwright HTML report.
- `automation-test/explore/` không bị chạy trong `npm test`.
- Không còn reference `evident_requirements` trong workflow chính.
- `playwright-report`, `test-results`, HTML dump và evidence cũ không còn tracked trong git.

## 9. Hướng mở rộng A-Z

Sau khi runner ổn, mở rộng coverage theo thứ tự:

1. Auth/Login.
2. Role Management.
3. Member Management.
4. Tasks lifecycle.
5. Accounts.
6. Proxies.
7. Settings.
8. Data pages.
9. Creative Hub.
10. Worker/API/service regression.

Mỗi module phải có:

- manual test case hoặc requirement trace;
- automation spec trong `automation-test/tests/`;
- tag rõ ràng;
- test data/env rõ ràng;
- pass/fail hiển thị được trên runner dashboard.
