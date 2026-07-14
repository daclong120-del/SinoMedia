# Plan: Automation Test Parallel Runner

Ngay lap: 2026-07-14
Trang thai: Planned
Pham vi: `automation-test/runner`, `automation-test/playwright.config.ts`, `automation-test/tests/**/module.json`, test tags/metadata neu can

## 0. Van de hien tai

Runner dashboard dang chay qua Playwright realtime, nhung server van ep:

```js
args.push('--workers=1');
```

Vi vay test case chay tuan tu tung cai mot. UI nhin thay row `RUNNING` rat lau, nhat la UI test cho route/member/api-token bi unauthorized hoac cho timeout selector. Playwright config da co:

```ts
fullyParallel: true
workers: process.env.PARALLEL_WORKERS ? parseInt(process.env.PARALLEL_WORKERS) : 4
```

Nhung dashboard override bang `--workers=1`, nen gia tri config/env hien khong co tac dung khi bam nut runner.

Muc tieu: cho phep dashboard chay 2/4/5/8 workers de nhieu test case chay cung luc, nhung van co che do an toan cho test khong parallel-safe.

## 1. Muc tieu UX

Runner dashboard can co them dieu khien:

- Workers: `1`, `2`, `4`, `5`, `8`.
- Preset:
  - `Safe`: 1 worker.
  - `Fast`: 4 hoac 5 workers.
  - `Turbo`: 8 workers.
- Hien ro trong log:

```text
[INFO] Running with 5 workers
[INFO] Parallel mode: fast
```

- Khi nhieu case chay cung luc, bang ket qua hien nhieu row `RUNNING` cung thoi diem.
- Console log van append realtime, khong bi tron/mat event.
- Khi test xong, tat ca row phai ve `PASS`/`FAIL`/`SKIP`, khong ket `RUNNING`.

## 2. Nguyen tac an toan

Khong phai test nao cung nen chay 8 luong.

Quy tac:

- Backend/API read-only hoac guard test: co the chay `4-8` workers.
- UI smoke read-only: co the chay `3-5` workers.
- UI mutation nhu create/delete token, invite member, create task, import account: mac dinh `1-2` workers neu chua co data isolation.
- Test dung chung cung user/storageState co the chay song song neu chi doc UI, nhung mutation phai co data rieng theo worker.
- Test tao data phai dung unique suffix tu `testInfo.parallelIndex` hoac timestamp.
- Test khong parallel-safe phai co tag `@serial` hoac metadata `parallelSafe: false`.
- Khong sua dashboard production source de lam test xanh.

## 3. Phase 1 - Worker count parameter trong runner

Sua `automation-test/runner/server.js`.

Payload moi cua `POST /api/runs`:

```json
{
  "mode": "module",
  "moduleId": "api-tokens",
  "workers": 5,
  "parallelMode": "fast"
}
```

Server validate:

- `workers` la number.
- min = `1`.
- max = env `MAX_TEST_WORKERS` neu co, mac dinh `8`.
- neu payload khong co workers:
  - backend: default `4` hoac env `PARALLEL_WORKERS`;
  - ui/module/all: default `1` de giu safe behavior cho den khi user chon.

Thay:

```js
args.push('--workers=1');
```

Bang:

```js
const workers = resolveWorkerCount(params, mode, mod);
args.push(`--workers=${workers}`);
```

Run state luu them:

```js
workers,
parallelMode,
```

`run-started` SSE payload them:

```json
{
  "workers": 5,
  "parallelMode": "fast"
}
```

Acceptance:

- Bam run voi workers `5`, command log hien `--workers=5`.
- Neu gui workers `99`, server clamp ve `8` hoac tra 400 co message ro.
- Neu gui workers `0`, server tra 400.

## 4. Phase 2 - UI control trong dashboard runner

Sua `automation-test/runner/index.html`.

Them control gan khu nut run:

```text
Workers: [1] [2] [4] [5] [8]
Mode: Safe / Fast / Turbo
```

Hoac slider:

```text
Parallel Workers: 1..8
```

Khi goi `runTest()`:

```js
payload.workers = selectedWorkers;
payload.parallelMode = selectedParallelMode;
```

UI hien:

- badge `Workers: 5`;
- log first line `[INFO] Running with 5 workers`;
- neu workers > 1 thi hien warning nho: "Parallel UI tests can conflict if tests mutate shared data".

Acceptance:

- Chon `5`, bam module `api-tokens`, request body co `workers: 5`.
- Console log hien dung so workers.
- Bang co the hien nhieu row `RUNNING` cung luc.

## 5. Phase 3 - Module/test metadata parallel-safe

Mo rong `module.json` tuy chon:

```json
{
  "id": "api-tokens",
  "parallelSafe": false,
  "recommendedWorkers": 1,
  "maxWorkers": 2
}
```

Module read-only co the:

```json
{
  "parallelSafe": true,
  "recommendedWorkers": 5,
  "maxWorkers": 8
}
```

Runner behavior:

- Neu user chon workers > `maxWorkers`, UI/server canh bao hoac clamp.
- Neu `parallelSafe: false`, dashboard nen mac dinh `1`.
- Neu user van chon `8`, cho chay nhung log warning ro:

```text
[WARNING] Module api-tokens is marked parallelSafe=false. Running with 8 workers may cause flaky results.
```

Tag trong spec:

- `@parallel-safe`
- `@serial`
- `@mutation`
- `@read-only`

Quy tac:

- Test mutation chua isolate data thi gan `@serial`.
- Test read-only thi gan `@parallel-safe`.

## 6. Phase 4 - Scheduler nang cao: parallel group + serial group

Phase nay lam sau Phase 1/2.

Van de: mot suite co ca safe va unsafe tests. Neu tat ca chay `--workers=8`, unsafe tests co the flaky.

Huong giai quyet:

1. Chay nhom parallel-safe truoc:

```powershell
npx playwright test --grep @parallel-safe --workers=8
```

2. Chay nhom serial/mutation sau:

```powershell
npx playwright test --grep @serial --workers=1
```

3. Merge/reconcile final results.

Can than: Playwright JSON reporter moi run ghi `reports/results.json`, nen neu chia thanh nhieu process thi can output file rieng:

```text
reports/runs/<runId>/parallel-results.json
reports/runs/<runId>/serial-results.json
```

Sau do server merge summary/testCases roi emit `result-final`.

Acceptance:

- `Run All Fast` chay safe group multi-worker.
- Serial group van chay sau, khong bi de data.
- Final table gom du ca hai group.

## 7. Phase 5 - Realtime runner hardening cho parallel

Khi 5/8 workers chay cung luc:

- `test-begin` co the den lien tiep rat nhanh.
- Nhieu row RUNNING cung luc la binh thuong.
- `test-end` co the khong theo thu tu `test-begin`.
- UI update phai dua vao stable key, khong dua vao row index.

Can dam bao:

- Server/reporter dung `pwTestId` hoac stable key.
- UI co live elapsed timer cho row RUNNING.
- Poll snapshot tiep tuc hoat dong neu SSE mat event.
- Console co log:

```text
[RUNNING] TC_...
[PASSED] TC_...
[FAILED] TC_...
```

Khong duoc de row ket `RUNNING` khi run da `completed/failed`.

## 8. Phase 6 - Data isolation cho UI parallel

Muon chay UI mutation 5/8 workers that su on dinh thi can data isolation.

Quy uoc:

- Moi test tao entity phai co suffix:

```ts
const suffix = `${testInfo.parallelIndex}-${Date.now()}`;
```

- Moi worker khong dung chung ten role/task/token/account.
- Test cleanup du lieu sau khi chay neu co the.
- Neu cleanup khong chac, dung seed/test namespace rieng:

```text
e2e_<worker>_<timestamp>
```

Auth:

- Storage state dung chung doc-only OK.
- Neu test thay doi session/user preference, can worker-scoped auth state:

```text
playwright/.auth/user-worker-0.json
playwright/.auth/user-worker-1.json
```

Phase dau chua can lam worker-scoped auth neu suite chi doc UI.

## 9. Verification bat buoc

Chay trong `automation-test/`:

```powershell
npm run typecheck
npm run test:module -- roles -- --list
npx.cmd playwright test --grep @backend --workers=4
npx.cmd playwright test tests/api-tokens/api-tokens.spec.ts --workers=4
npm run dashboard
```

Manual dashboard:

1. Chon workers `1`, chay `api-tokens`, ghi thoi gian baseline.
2. Chon workers `4` hoac `5`, chay `api-tokens`, xac nhan 2 case co the RUNNING gan nhau va tong thoi gian giam.
3. Chon workers `8`, chay backend/API, xac nhan no khong crash runner.
4. Xac nhan neu test fail vi unauthorized thi hien `FAIL` + error message, khong ket `RUNNING`.
5. Xac nhan final summary khop `reports/results.json`.

Metric can ghi:

```text
module=<id>
workers=1 duration=...
workers=5 duration=...
workers=8 duration=...
peakRunning=...
passed=...
failed=...
```

## 10. Acceptance criteria cuoi

- Dashboard cho chon worker count truoc khi run.
- Server khong con hardcode `--workers=1`.
- Command log hien dung `--workers=N`.
- Co the chay 5 hoac 8 workers voi backend/read-only UI.
- UI khong bi ket `RUNNING` khi run ket thuc.
- Long-running row co elapsed timer va warning.
- Module unsafe co default/clamp/canh bao workers.
- Artifacts runtime khong commit: `reports/results.json`, `playwright-report/`, `test-results/`.

## 11. Thu tu giao AI trien khai

1. Chi sua `automation-test/runner/server.js`, `automation-test/runner/index.html`, `automation-test/playwright.config.ts` neu can, va `module.json` neu them metadata.
2. Khong sua `dashboard/`, `crawler-pipeline/`, `supabase/` de lam test xanh.
3. Lam Phase 1 + Phase 2 truoc: workers parameter + UI control.
4. Verify dashboard voi `backend` workers 4/8.
5. Verify `api-tokens` workers 4/5; neu fail unauthorized thi chap nhan fail that, nhung runner phai hien FAIL nhanh/ro.
6. Sau do moi them metadata `parallelSafe/recommendedWorkers/maxWorkers`.
7. Sau cung moi lam scheduler parallel-safe + serial group neu can.
