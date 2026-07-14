# Automation Test & One-Click Runner

Cap nhat: 2026-07-14

Tai lieu nay la source note cho he thong automation test cua SinoMedia. Tai lieu thao tac nhanh nam tai `automation-test/README.md`.

## Muc Tieu

Huong di dung la:

```text
1 dashboard local
  -> bam Run All / Run UI / Run Backend / Run Module
    -> Node runner server tao runId qua POST /api/runs
      -> dashboard doc log/event realtime qua GET /api/runs/:runId/events
        -> Playwright chay test theo module/spec/tag
          -> sinh reports/results.json va playwright-report/
            -> dashboard reconcile ket qua cuoi va hien pass/fail tung test case
```

HTML tinh khong duoc tu chay shell. `automation-test/runner/index.html` chi la UI va phai duoc serve boi `automation-test/runner/server.js`.

Neu mo truc tiep:

```text
file:///D:/Python/SinoMedia/automation-test/runner/index.html
```

thi cac API `/api/modules`, `/api/results`, `/api/runs`, `/api/runs/:runId/events` khong ton tai. Dashboard se giu gia tri mac dinh `0 test case` hoac khong stream duoc log. Day la loi cach mo dashboard, khong phai loi test registry.

## Trang Thai Hien Tai

| Hang muc | Trang thai | Bang chung / ghi chu |
|---|---|---|
| Playwright TS framework | Partial | `package.json`, `playwright.config.ts`, `tsconfig.json`; `npm run typecheck` pass ngay 2026-07-14. |
| Module registry/factory | Partial | `tests/<module>/module.json`, `src/utils/ModuleRegistry.js`, `ModuleRegistry.ts`, `runner/run-module.js`. Dashboard doc `/api/modules` de render module dong; review 2026-07-14 dang thay 9 module registry. |
| Runner dashboard | Partial | `runner/server.js` + `runner/index.html`; phai chay bang `npm run dashboard`, khong mo file HTML truc tiep. Da co skeleton realtime runner qua `POST /api/runs` va SSE `GET /api/runs/:runId/events`. |
| Realtime runner | Partial | Da co EventSource UI, SSE endpoint va `runner/realtime-reporter.cjs`. Chua Done vi can fix replay/snapshot de khong mat event, xoa stale `reports/results.json` truoc moi run, loai `_setup` khoi live counter, dung stable test key, va khong hardcode live type la `UI`. |
| Module hien co | Partial | 9 module: `accounts`, `api-tokens`, `auth`, `members`, `navigation`, `proxies`, `roles`, `settings`, `tasks`. Moi module co spec va `module.json`. |
| Role Management regression | Partial | Backend case pass; UI case dang fail do `TEST_USER_EMAIL=admin_test@sinomedia.vn` bi redirect `/dash/home?error=unauthorized` khi vao `/dash/manage-account/members`. Can fix quyen/test data, khong sua dashboard source trong test-only mode. |
| A-Z coverage | Partial | Da mo rong them smoke UI module cho accounts/api-tokens/members/navigation/proxies, nhung chua co du suite P1 cho Data, Creative Hub, worker/API/service regression, mutation va security. |
| Artifact hygiene | Partial | `.gitignore` da co, nhung artifact runtime nhu `reports/results.json`, `test-results`, `playwright-report` co the van dang nam trong worktree/tracked tu truoc. Khong commit artifact runtime khi chot automation-test. |

## Kien Truc Thu Muc

```text
automation-test/
├─ runner/
│  ├─ index.html
│  ├─ server.js
│  └─ run-module.js
├─ src/
│  ├─ pages/
│  └─ utils/
│     ├─ ConfigReader.ts
│     ├─ ModuleRegistry.js
│     └─ ModuleRegistry.ts
├─ tests/
│  ├─ _setup/
│  ├─ auth/
│  ├─ roles/
│  ├─ settings/
│  └─ tasks/
├─ explore/
├─ evidence/requirements/
├─ reports/
└─ playwright-report/
```

Quy tac:

- `tests/` chi chua test chinh.
- `tests/_setup/` chi chua setup auth/storage state; dashboard parser khong tinh setup la test case nghiep vu.
- `tests/<module>/module.json` la manh ghep dang ky module.
- `explore/` chi dung khao sat DOM/debug, khong de test chinh o day.
- `runner/` la dashboard local va server Node de goi Playwright.
- `evidence/requirements/` la noi luu bang chung requirement; khong dung ten cu `evident_requirements`.

Module registry hien tai co 9 module: `accounts`, `api-tokens`, `auth`, `members`, `navigation`, `proxies`, `roles`, `settings`, `tasks`.

## Module Registry Contract

Moi module can file:

```text
automation-test/tests/<moduleId>/module.json
```

Schema hien tai:

```json
{
  "id": "roles",
  "name": "Role Management",
  "description": "Kiem thu quan ly vai tro va bao ve vai tro he thong.",
  "type": ["ui", "backend"],
  "specs": ["tests/roles/role_management.spec.ts"],
  "tags": ["@role", "@ui", "@backend"],
  "requiresAuth": true,
  "enabled": true
}
```

`ModuleRegistry.js` validate:

- co `id`;
- co `name`;
- `specs` la array khong rong;
- moi spec ton tai trong `automation-test`;
- spec path khong duoc escape ra ngoai root `automation-test`.

## Commands Chuan

Chay trong `automation-test/`:

```powershell
npm run typecheck
npx.cmd playwright test --list
npm run test:ui -- --list
npm run test:backend -- --list
npm run test:module -- roles -- --list
npm run test:module -- roles
npm run dashboard
```

Dashboard local:

```powershell
npm run dashboard
```

Mo:

```text
http://localhost:3005
```

Neu port 3005 bi trung:

```powershell
$env:DASHBOARD_PORT='9324'
npm run dashboard
```

Runner dashboard APIs hien tai:

```text
GET  /api/modules
POST /api/runs
GET  /api/runs/:runId/events
GET  /api/runs/:runId
GET  /api/results
GET  /report/*
```

`/api/results` chi la final/recent JSON report. Log va event dang chay realtime phai di qua SSE endpoint `/api/runs/:runId/events`.

## Cach Them Test Case

Them case vao module co san:

1. Sua spec trong `tests/<module>/*.spec.ts`.
2. Dat ID o dau title: `TC_TASK_002 - ...`.
3. Gan tag vao title: `@tasks @ui`, `@role @backend`, ...
4. Chay:

```powershell
npm run test:module -- <moduleId> -- --list
```

Them module moi:

1. Tao `tests/<moduleId>/`.
2. Tao `<module>.spec.ts`.
3. Tao `module.json`.
4. Them Page Object trong `src/pages/` neu can.
5. Chay typecheck va list:

```powershell
npm run typecheck
npm run test:module -- <moduleId> -- --list
```

Khong can sua source dashboard production. Khong can sua `runner/index.html` neu module registry da dung.

## Environment

Test chinh khong hardcode credential. Bat buoc doc tu `.env` hoac environment:

```env
BASE_URL=http://127.0.0.1:3000
PARALLEL_WORKERS=1
HEADLESS=true
TEST_USER_EMAIL=...
TEST_USER_PASSWORD=...
```

Neu test UI can route admin, user test phai co quyen tuong ung. Vi du Role Management UI can vao:

```text
/dash/manage-account/members
```

Neu app redirect ve:

```text
/dash/home?error=unauthorized
```

thi can cap quyen member/admin cho test user hoac doi `TEST_USER_EMAIL`. Khong sua dashboard source chi de test xanh.

## Definition of Done

One-click runner chi duoc coi la Done khi:

- `npm run typecheck` pass.
- `npx.cmd playwright test --list` list dung suite.
- `npm run dashboard` mo duoc runner qua `http://localhost:<port>`.
- `/api/modules` tra dung danh sach module.
- Bam Run All/Run Module tren dashboard chay test that.
- Dashboard hien total/passed/failed va chi tiet tung test case.
- Dashboard append log/test event trong khi Playwright dang chay, khong doi chay xong moi do mot cuc log.
- Client reconnect/connect tre van nhan du state qua replay event buffer hoac snapshot, khong mat `run-begin`, `test-begin`, `run-finished`.
- Runner xoa `reports/results.json` truoc moi run de tranh stale result.
- Live counter loai `_setup`, dung stable test key thay vi chi dua vao `TC_ID`/`N/A`.
- Link Playwright HTML report hoat dong.
- Test user co quyen phu hop va cac UI regression khong fail vi unauthorized.
- Artifact runtime khong nam trong commit.

## Backlog Coverage A-Z

Thu tu mo rong:

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

Moi module moi phai co:

- `module.json`;
- spec Playwright co ID/tag;
- test data/env ro rang;
- neu can UI thi co Page Object;
- pass/fail hien duoc tren runner dashboard.
