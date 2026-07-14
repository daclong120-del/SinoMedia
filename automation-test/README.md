# Automation Test

Cap nhat: 2026-07-14
Trang thai: Partial

`automation-test` la workspace Playwright rieng cho SinoMedia. Muc tieu la co mot runner local: bam mot nut tren dashboard test runner de chay test theo module hoac chay toan bo suite, sau do hien pass/fail theo tung test case.

## Doc Nhanh

Khong mo truc tiep file nay:

```text
automation-test/runner/index.html
```

Neu mo bang `file:///.../runner/index.html`, browser khong goi duoc API `/api/modules` va `/api/results`, nen man hinh se hien `0 test case`.

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
| `npx.cmd playwright test --list` | Pass, list du 9 muc gom setup |
| `npm run test:ui -- --list` | Pass |
| `npm run test:backend -- --list` | Pass |
| `npm run test:module -- roles -- --list` | Pass |
| `GET /api/modules` qua `npm run dashboard` | Tra 4 module: `auth`, `roles`, `settings`, `tasks` |
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
