# Plan: Automation Test Scaling

Ngay lap: 2026-07-14
Trang thai: Planned / Partial
Pham vi: `automation-test`

Plan nay dung de mo rong test case/test module so luong lon cho SinoMedia. Du an co nhieu chuc nang, nen huong dung la them coverage theo module nhu gan manh ghep: them thu muc test + spec + `module.json` + test data contract, khong sua lan truyen runner/dashboard production.

## 0. Muc tieu

- Mot nut `Run All` tren runner dashboard co the chay toan bo suite tu A den Z va hien pass/fail theo tung test case.
- Moi module test duoc dang ky bang `automation-test/tests/<module>/module.json`.
- Them module moi bang thu muc + spec + registry metadata; khong hardcode module vao `runner/index.html`.
- Test suite phan lop ro de co the chay nhanh P0 smoke, P1 critical regression, hoac P2 full regression.
- Bao ve source app: task "bo sung/chay test" khong duoc sua dashboard production de lam test xanh.

## 1. Nguyen tac bat buoc

- Module-first: moi chuc nang lon co mot module rieng trong `automation-test/tests/<module>/`.
- Test case nao cung co ID o dau title, vi du `TC_TASK_001 - ...`.
- Test case nao cung co tag ro: `@ui`, `@backend`, `@api`, `@security`, `@smoke`, `@critical`, va tag module nhu `@tasks`.
- Setup auth/storage state nam trong `tests/_setup/` va khong tinh la test case nghiep vu.
- Test data, credential, base URL doc tu env; khong hardcode account that vao spec.
- Khi fail vi unauthorized, uu tien sua test user/quyen/seed data; khong sua source dashboard trong test-only mode.
- Khong lam test xanh bang cach xoa assertion, relax assertion qua muc, hoac skip case ma khong ghi ly do.
- Artifact runtime nhu `playwright-report/`, `test-results/`, `reports/results.json`, HTML dump khong duoc commit.

## 2. Test tiers

| Tier | Muc dich | Nen chay khi nao | Vi du |
|---|---|---|---|
| P0 Smoke | Xac nhan he thong song va flow quan trong nhat chay duoc | Moi ngay, truoc khi merge, sau khi sua core auth/dashboard | Login, dashboard load, task list, settings read, role backend guard |
| P1 Critical Regression | Bao ve chuc nang co rui ro cao/duong tien quan trong | Khi sua module lien quan, truoc release nho | Role/member/task/account/proxy/settings mutations, worker API guard |
| P2 Full Regression | Phu rong UI/data/edge cases | Truoc release lon hoac khi can audit coverage | Filters, sorting, pagination, empty/error state, creative/data detail pages |
| P3 Exploratory | Khao sat DOM/debug/de-risk truoc khi viet test chinh | Khi chua biet selector/flow on dinh | Script trong `automation-test/explore/`, khong nam trong default suite |

## 3. Module contract

Moi module moi can cau truc toi thieu:

```text
automation-test/tests/<moduleId>/
|-- module.json
|-- <moduleId>.spec.ts
`-- <moduleId>-cases.md        # optional, khi module nhieu case
```

Neu module can Page Object:

```text
automation-test/src/pages/<module-name>.page.ts
```

`module.json` can khai bao:

```json
{
  "id": "tasks",
  "name": "Tasks",
  "description": "Kiem thu task lifecycle.",
  "type": ["ui", "backend"],
  "specs": ["tests/tasks/tasks.spec.ts"],
  "tags": ["@tasks", "@ui", "@backend"],
  "requiresAuth": true,
  "enabled": true
}
```

Quy tac dat ten:

- `moduleId`: lowercase-kebab hoac lowercase ngan gon, vi du `creative-search`, `worker-api`, `tasks`.
- Spec chinh: `<moduleId>.spec.ts` hoac ten ro nghia nhu `role_management.spec.ts` neu da co san.
- Case doc optional: `<moduleId>-cases.md` de chia nho khi module co nhieu test case.
- Tag module phai trung voi module: `@tasks`, `@roles`, `@worker-api`.

## 4. ID prefix

| Khu vuc | Prefix de dung |
|---|---|
| Auth/Login | `TC_AUTH_*` |
| Role Management | `TC_ROLE_*` |
| Member Management | `TC_MEMBER_*` |
| API Tokens | `TC_TOKEN_*` |
| Tasks | `TC_TASK_*` |
| Accounts | `TC_ACCOUNT_*` |
| Proxies | `TC_PROXY_*` |
| Settings | `TC_SETTINGS_*` |
| Audit Logs | `TC_AUDIT_*` |
| Data Posts | `TC_DATA_POST_*` |
| Data Authors | `TC_DATA_AUTHOR_*` |
| Data Management | `TC_DATA_MGMT_*` |
| Creative Search | `TC_CREATIVE_SEARCH_*` |
| Creative New | `TC_CREATIVE_NEW_*` |
| Creative Trending | `TC_CREATIVE_TREND_*` |
| Creative Growth | `TC_CREATIVE_GROWTH_*` |
| Creative Calendar | `TC_CREATIVE_CAL_*` |
| Creative Advertisers | `TC_ADVERTISER_*` |
| Creative Detail | `TC_CREATIVE_DETAIL_*` |
| Worker API | `TC_WORKER_API_*` |
| Video Proxy | `TC_VIDEO_PROXY_*` |
| Security | `TC_SECURITY_*` |

## 5. Coverage backlog

| Module | Tier uu tien | Scope can co |
|---|---|---|
| `auth` | P0 | Login success/fail, logout, unauth redirect, captcha config check neu bat |
| `navigation` | P0/P1 | Sidebar/header, route admin, active state, unauthorized route behavior |
| `roles` | P0/P1 | Role CRUD, default role delete guard, permission matrix, UI + backend guard |
| `members` | P1 | Invite/add member, assign role, filters, permission guard |
| `api-tokens` | P1 | Create/revoke token, expiry, scopes, worker runtime guard |
| `tasks` | P0/P1 | Create task, bulk create, cancel, retry, status/logs realtime, empty/error state |
| `accounts` | P1 | Import/normalize cookie, health status, delete/unban guarded by admin |
| `proxies` | P1 | Create/update/delete, health state, CSRF/admin guard |
| `settings` | P0/P1 | Masked secrets, save encrypted settings, CSRF/admin guard |
| `audit-logs` | P1/P2 | Admin read, filter, no sensitive leakage |
| `data-posts` | P2 | List/detail/filter/export, text-only/media status, empty/error state |
| `data-authors` | P2 | List/detail/filter, metric display, source URL |
| `data-management` | P2 | Metrics, cleanup warnings, export behavior |
| `creative-search` | P2 | Search filters, cards, detail link, empty/error state |
| `creative-new` | P2 | New content list, filters, detail link |
| `creative-trending` | P2 | Trending list, rank/order, filters |
| `creative-growth` | P2 | Growth metrics, history snapshot, sorting |
| `creative-calendar` | P2 | Calendar render, date filters, detail navigation |
| `creative-advertisers` | P2 | Advertiser list/detail, filters, source link |
| `creative-detail` | P2 | Bilibili iframe by BVID, direct media fallback rules, no forced R2 path |
| `worker-api` | P1 | Token required, deny wildcard, allowlist paths, strict PATCH, required env |
| `video-proxy` | P1 | Auth, HTTPS only, domain allowlist, private IP/SSRF block, size/content-type guard |
| `crawler-worker-smoke` | P1/P2 | Claim task, write log, complete/fail lifecycle, safe platform smoke |
| `desktop-runtime-smoke` | P2 | Package health-check, port/PID smoke, optional local runtime checks |

## 6. Rollout phases

### Phase A - Inventory and contracts

- Chot module list, ID prefix, tag convention, required env/test data.
- Xac dinh module nao la P0/P1/P2/P3.
- Tao backlog case doc cho module lon truoc khi viet spec hang loat.

### Phase B - P0 smoke suite

- Auth, dashboard load/navigation, settings read, tasks list/basic create, role backend guard.
- Muc tieu: `Run All` co the cho biet he thong co song khong trong thoi gian ngan.

### Phase C - P1 admin/security regression

- Roles, members, API tokens, accounts, proxies, settings mutations, worker API, video proxy.
- Muc tieu: bao ve cac flow co quyen admin, token, cookie, proxy, secret.

### Phase D - P2 data and creative coverage

- Data pages, Creative Hub pages, detail pages, filters/sorting/pagination/empty state.
- Muc tieu: tang coverage UI rong ma khong lam P0/P1 cham.

### Phase E - Worker/crawler integration smoke

- Task claim/write log/complete/fail, platform smoke neu moi truong an toan.
- Muc tieu: xac nhan dashboard control plane noi duoc worker.

### Phase F - Report and flaky policy

- Runner dashboard hien module/case/result ro.
- Dinh nghia retry, timeout, quarantine tag cho flaky test co ly do.

## 7. Test data and env contract

Toi thieu can co:

```env
BASE_URL=http://127.0.0.1:3000
TEST_USER_EMAIL=...
TEST_USER_PASSWORD=...
TEST_ADMIN_EMAIL=...
TEST_ADMIN_PASSWORD=...
PARALLEL_WORKERS=1
HEADLESS=true
```

Neu module can data rieng, ghi trong `<moduleId>-cases.md`:

- user role nao can dung;
- seed data nao can ton tai;
- mutation co destructive hay khong;
- case nao chi duoc chay local/staging, khong chay production;
- env flag nao can bat.

## 8. Quality gate cho moi module

Truoc khi coi module moi la hop le:

```powershell
cd D:\Python\SinoMedia\automation-test
npm run typecheck
npm run test:module -- <moduleId> -- --list
npm run test:module -- <moduleId>
npm run dashboard
```

Can xac minh:

- `/api/modules` co module moi.
- Runner dashboard co nut/module moi ma khong sua hardcode UI.
- Result JSON/HTML report sinh ra dung.
- Test fail thi fail vi bug/test data that, khong fail vi thieu env khong duoc ghi.
- Khong co artifact runtime bi dua vao commit.

## 9. Quality gate cho PR

- P0 smoke pass.
- P1 cua module vua sua pass.
- `npm run typecheck` trong `automation-test` pass.
- Neu chi sua docs/test, khong sua source app de lam test xanh.
- `git diff --check` sach.
- Neu commit co sua code symbol, chay GitNexus `detect_changes()` truoc commit theo rule cua repo.

## 10. Do not do

- Khong sua dashboard production source khi task chi la viet/chay automation test.
- Khong them module moi bang cach sua nhieu script runner neu `module.json` da dap ung.
- Khong de exploratory script trong `automation-test/tests/`.
- Khong commit `.env`, screenshots/video traces/report runtime mac dinh.
- Khong danh dau module Done chi vi `--list` thay case; phai co lan run that hoac ghi ro chua run.
- Khong skip hang loat case de co mau xanh gia.
