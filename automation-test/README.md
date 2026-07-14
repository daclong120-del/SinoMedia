# Automation Test

Cap nhat: 2026-07-14
Trang thai: Partial

`automation-test` la workspace Playwright rieng cho SinoMedia. Muc tieu la co mot runner local: bam mot nut tren dashboard test runner de chay test theo module hoac chay toan bo suite, sau do hien pass/fail theo tung test case.

## Doc Nhanh

Khong mo truc tiep file nay:

```text
automation-test/runner/index.html
```

Neu mo bang `file:///.../runner/index.html`, browser khong goi duoc API `/api/modules`, `/api/results`, `/api/runs`, `/api/runs/:runId/events`, nen man hinh se hien `0 test case` hoac khong stream duoc log realtime.

Phai chay Node runner server:

```powershell
cd D:\Python\SinoMedia\automation-test
npm run dashboard
```

Sau do mo:

```text
http://localhost:3005
```

Neu can doi port:

```powershell
$env:DASHBOARD_PORT='9324'
npm run dashboard
```

## Cau Truc Hien Tai

```text
automation-test/
├─ package.json
├─ playwright.config.ts
├─ tsconfig.json
├─ .env                         # local only, khong commit
├─ runner/
│  ├─ index.html                # dashboard UI, phai serve qua server.js
│  ├─ server.js                 # local API + Playwright process runner
│  └─ run-module.js             # CLI chay module theo module.json
├─ src/
│  ├─ pages/                    # Page Object Model
│  └─ utils/
│     ├─ ConfigReader.ts
│     ├─ ModuleRegistry.js      # runtime registry cho Node runner
│     └─ ModuleRegistry.ts      # TypeScript wrapper/type
├─ tests/
│  ├─ _setup/auth.setup.ts      # login setup, khong tinh la test case nghiep vu
│  ├─ auth/
│  │  ├─ module.json
│  │  └─ auth.spec.ts
│  ├─ roles/
│  │  ├─ module.json
│  │  ├─ role-management-cases.md
│  │  └─ role_management.spec.ts
│  ├─ settings/
│  │  ├─ module.json
│  │  └─ settings.spec.ts
│  └─ tasks/
│     ├─ module.json
│     └─ tasks.spec.ts
├─ explore/                     # script khao sat/debug DOM, khong nam trong test suite chinh
├─ evidence/requirements/       # anh/chung cu requirement
├─ reports/                     # JSON report sinh khi chay test, khong commit artifact runtime
└─ playwright-report/           # HTML report sinh boi Playwright, khong commit
```

Ghi chu trang thai hien tai: `runner/realtime-reporter.cjs` da duoc them de stream event realtime, va `tests/` hien co 9 module registry: `accounts`, `api-tokens`, `auth`, `members`, `navigation`, `proxies`, `roles`, `settings`, `tasks`.

## Module Registry

Moi module test la mot thu muc trong `tests/<module>/` va co file `module.json`.

Vi du:

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

Runner doc tat ca `module.json` bang `src/utils/ModuleRegistry.js`. Dashboard goi `/api/modules` de render nut chay module, nen them module moi khong can sua `runner/index.html`.

## Realtime Runner

Dashboard hien tai di theo huong realtime:

```text
POST /api/runs
GET  /api/runs/:runId/events
GET  /api/runs/:runId
GET  /api/results
```

`POST /api/runs` tao run va tra `runId` som. Browser dung `EventSource` de doc `/api/runs/:runId/events`, nhan log/test event trong khi Playwright dang chay. `/api/results` van chi la final/recent JSON report de reconcile ket qua cuoi.

Trang thai realtime runner van la Partial. Truoc khi coi la Done can fix cac diem: replay/snapshot de client connect tre khong mat event, xoa `reports/results.json` truoc moi run de tranh stale result, loai `_setup` khoi live business counter, dung stable test key thay vi chi dua vao `TC_ID`/`N/A`, va khong hardcode live type la `UI`.

## Commands

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

Lenh chay toan bo:

```powershell
npm run test:all
```

Lenh chay module:

```powershell
npm run test:module -- <moduleId>
```

Truyen them tham so Playwright:

```powershell
npm run test:module -- roles -- --headed
npm run test:module -- roles -- --list
```

## Them Test Case Moi

Neu them test vao module da co:

1. Them case vao spec trong `tests/<module>/*.spec.ts`.
2. Dat ID o dau title, vi du `TC_TASK_002 - ...`.
3. Gan tag truc tiep trong title, vi du `@tasks @ui`.
4. Chay `npm run test:module -- <moduleId> -- --list` de kiem tra Playwright nhan case.

Neu them module moi:

1. Tao thu muc `tests/<moduleId>/`.
2. Tao `<module>.spec.ts`.
3. Tao `module.json`.
4. Neu can page object, them file vao `src/pages/`.
5. Chay:

```powershell
npm run typecheck
npm run test:module -- <moduleId> -- --list
```

Khong can sua dashboard production. Khong can sua `runner/index.html` neu `module.json` dung.

## Environment

`.env` local toi thieu:

```env
BASE_URL=http://127.0.0.1:3000
PARALLEL_WORKERS=1
HEADLESS=true
TEST_USER_EMAIL=...
TEST_USER_PASSWORD=...
```

`TEST_USER_EMAIL` phai co quyen dung voi route can test. Vi du role UI test can vao `/dash/manage-account/members`; neu user khong co quyen, app se redirect ve:

```text
/dash/home?error=unauthorized
```

Khi do test fail la dung, can sua test data/quyen user thay vi sua source dashboard.

## Trang Thai Kiem Chung Gan Nhat

Bang chung trong phien review 2026-07-14:

| Hang muc | Ket qua |
|---|---|
| `npm run typecheck` | Pass |
| `npx.cmd playwright test --list` | Pass trong review; dung de kiem tra Playwright nhan suite hien co |
| `npm run test:ui -- --list` | Pass |
| `npm run test:backend -- --list` | Pass |
| `npm run test:module -- roles -- --list` | Pass |
| `node --check runner/server.js` | Pass |
| `GET /api/modules` qua `npm run dashboard` | Pass tren runner port tam, tra 9 module: `accounts`, `api-tokens`, `auth`, `members`, `navigation`, `proxies`, `roles`, `settings`, `tasks` |
| Realtime runner | Partial: co SSE/EventSource va `runner/realtime-reporter.cjs`, nhung con can fix replay/snapshot, stale result, `_setup` counter, stable key va live type |
| `npm run test:module -- roles` | Partial: backend role pass, 2 UI role fail vi test user bi redirect unauthorized |

## Artifact Hygiene

Khong commit:

```text
automation-test/.env
automation-test/playwright-report/
automation-test/test-results/
automation-test/reports/results.json
```

Neu artifact da bi tracked tu truoc, go khoi index bang `git rm --cached` dung pham vi. Khong xoa nham source test.
