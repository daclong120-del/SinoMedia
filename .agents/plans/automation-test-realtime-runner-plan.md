# Plan: Automation Test Realtime Runner

Ngay lap: 2026-07-14
Trang thai: Planned
Pham vi: `automation-test/runner`, `automation-test/playwright.config.ts`, optional custom reporter trong `automation-test/runner`

## 0. Van de hien tai

Runner dashboard hien tai khong realtime vi:

- `automation-test/runner/server.js` endpoint `POST /api/run` spawn Playwright, gom `stdout/stderr` vao bien `consoleOutput`, doi process `close` roi moi `res.end(JSON.stringify(results))`.
- `automation-test/runner/index.html` ham `runTest()` dung `fetch('/api/run')`, nen UI chi vao `.then(data => ...)` sau khi toan bo run ket thuc.
- `reports/results.json` chi duoc Playwright JSON reporter ghi xong khi run ket thuc, nen khong the dung file nay lam nguon realtime cho tung test case.
- `playwright.config.ts` hien chi co reporter `html` va `json`; chua co reporter phat event `test-begin/test-end`.

Muc tieu: bam `Run All` la log phai chay lien tuc nhu terminal, bang/counter cap nhat dan theo tung test case, khong doi den cuoi moi "bum" hien tat ca.

## 1. Muc tieu UX

Khi user bam run:

1. UI tao run moi va nhan `runId` ngay lap tuc.
2. Console log hien tung dong realtime:
   - dong lenh dang chay;
   - stdout/stderr cua Playwright;
   - event test bat dau/ket thuc;
   - loi spawn/process neu co.
3. Loader/timer van chay nhu hien tai.
4. Bang test case cap nhat dan:
   - case dang chay hien `RUNNING`;
   - case xong doi sang `PASS`/`FAIL`/`SKIP`;
   - counter total/pass/fail/skip tang dan.
5. Khi run ket thuc, server parse lai `reports/results.json` de reconcile ket qua cuoi cung, dam bao summary/table khop Playwright report.
6. Log khong bi replace bang mot cuc text cuoi cung; log chi append lien tuc va auto-scroll.

## 2. Huong kien truc de chon

Dung Server-Sent Events (SSE), khong can WebSocket luc dau.

Ly do:

- Luong realtime chu yeu la server -> browser.
- Native browser co `EventSource`, khong can them dependency.
- Local runner Node `http` hien tai co the tu implement SSE bang response stream.
- De reconnect hon fetch dai.

Khong nen tiep tuc giu model `POST /api/run` doi den xong moi tra JSON.

## 3. API moi de de xuat

Giu `/api/results` va `/report/*` nhu hien tai.

Them endpoint moi:

```text
POST /api/runs
GET  /api/runs/:runId/events
GET  /api/runs/:runId
POST /api/runs/:runId/stop       # optional phase sau
```

### `POST /api/runs`

Payload giong hien tai:

```json
{ "mode": "all" }
```

Hoac:

```json
{ "mode": "type", "type": "ui" }
{ "mode": "module", "moduleId": "roles" }
```

Response tra ngay:

```json
{
  "runId": "run_20260714_120501_ab12",
  "status": "running",
  "mode": "all",
  "startedAt": "2026-07-14T05:05:01.000Z"
}
```

Neu dang co run khac:

```json
{ "error": "Dang co tien trinh test dang chay", "running": true }
```

### `GET /api/runs/:runId/events`

SSE stream:

```text
event: run-started
data: {"runId":"...","command":"node ... playwright test --workers=1"}

event: log
data: {"stream":"stdout","line":"Running 8 tests using 1 worker"}

event: test-begin
data: {"testId":"TC_AUTH_001","title":"...","module":"auth"}

event: test-end
data: {"testId":"TC_AUTH_001","status":"passed","duration":1234}

event: run-finished
data: {"exitCode":0,"summary":{"total":8,"passed":8,"failed":0,"skipped":0}}
```

Header bat buoc:

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### `GET /api/runs/:runId`

Tra snapshot hien tai de UI reload/reconnect:

```json
{
  "runId": "...",
  "status": "running",
  "summary": { "total": 3, "passed": 2, "failed": 0, "skipped": 0 },
  "testCases": [],
  "lastLogs": []
}
```

## 4. Backend run state

Trong `server.js`, thay `activeTestProcess` bang `activeRun`.

De xuat shape:

```js
const runs = new Map();
let activeRunId = null;

const run = {
  id,
  status: 'running',
  mode,
  startedAt,
  endedAt: null,
  command,
  process,
  clients: new Set(),
  events: [],
  logs: [],
  summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
  testCases: [],
  exitCode: null
};
```

Can co helper:

- `createRunId()`
- `emitRunEvent(run, type, payload)`
- `writeSse(res, type, payload, id)`
- `appendLog(run, stream, chunk)`
- `finishRun(run, exitCode)`
- `cleanupOldRuns()`

Gioi han bo nho:

- Chi giu toi da 5 run gan nhat.
- Moi run chi giu 1000-3000 log lines gan nhat.
- `events` co the la ring buffer de client reconnect khong bi mat qua nhieu.

## 5. Phase 1 - Realtime raw terminal logs

Muc tieu phase nay: log tren UI chay lien tuc, chua can bang test case realtime hoan hao.

Viec can lam:

1. Tao `POST /api/runs` de spawn Playwright va tra `runId` ngay.
2. Tao `GET /api/runs/:runId/events` SSE.
3. Khi spawn:
   - emit `run-started`;
   - emit log command;
   - pipe `stdout` -> event `log`;
   - pipe `stderr` -> event `log`;
   - khi close, parse `reports/results.json`, emit `result-final`, emit `run-finished`.
4. Van giu `parsePlaywrightResults(resultsPath)` lam final source of truth.
5. Neu spawn error, emit `run-error`.

Acceptance phase 1:

- Bam Run All, console UI hien log dau tien trong 1 giay.
- Trong luc Playwright dang chay, log tiep tuc append.
- Khi run xong, summary/table cap nhat tu final JSON nhu hien tai.
- Khong con hien tuong console trong UI rong den cuoi run moi do mot cuc.

## 6. Phase 2 - Frontend EventSource

Sua `automation-test/runner/index.html`.

`runTest()` moi:

1. Disable buttons.
2. Clear console va table hien tai.
3. `POST /api/runs` lay `runId`.
4. Mo:

```js
const source = new EventSource(`/api/runs/${runId}/events`);
```

5. Lang nghe event:

```js
source.addEventListener('run-started', onRunStarted);
source.addEventListener('log', onLog);
source.addEventListener('result-final', onResultFinal);
source.addEventListener('run-finished', onRunFinished);
source.addEventListener('run-error', onRunError);
```

6. `onLog` chi append line:

```js
appendConsoleLine(payload.line, payload.stream);
```

7. Khi `run-finished`:
   - stop timer;
   - close EventSource;
   - enable buttons;
   - `log-status = COMPLETED/FAILED`.

Can them UI helper:

- `appendConsoleLine(line, stream)`
- `setRunStatus(status)`
- `resetRunView()`
- `autoScrollConsole()`
- optional `Clear logs`

Khong nen dung:

```js
consoleOutput.innerText = data.consoleOutput;
```

neu muon realtime that.

## 7. Phase 3 - Structured Playwright realtime events

Raw stdout co the du de nhin log chay, nhung muon bang test case update dep thi can custom reporter.

Them reporter:

```text
automation-test/runner/realtime-reporter.cjs
```

Reporter dung Playwright hooks:

- `onBegin(config, suite)`
- `onTestBegin(test)`
- `onTestEnd(test, result)`
- `onEnd(result)`

Reporter ghi JSON line ra stdout voi prefix rieng de server parse:

```text
__PW_EVENT__{"type":"test-begin","testId":"TC_TASK_001","title":"...","module":"tasks"}
__PW_EVENT__{"type":"test-end","testId":"TC_TASK_001","status":"passed","duration":821}
```

Server xu ly stdout theo line buffer:

- Neu line bat dau bang `__PW_EVENT__`, parse JSON va emit SSE event tuong ung.
- Neu line thuong, emit `log`.

Can dam bao line buffer dung:

- chunk stdout co the cat ngang dong;
- phai gom buffer den khi gap `\n`;
- khong parse JSON tren chunk chua du dong.

Tich hop reporter:

Option A - trong `playwright.config.ts`:

```ts
reporter: [
  ['line'],
  [path.resolve(__dirname, 'runner/realtime-reporter.cjs')],
  ['html', { open: 'never' }],
  ['json', { outputFile: 'reports/results.json' }]
]
```

Option B - chi bat reporter khi runner dashboard chay:

```ts
const realtimeReporter = process.env.PW_REALTIME_REPORTER === '1'
  ? [[path.resolve(__dirname, 'runner/realtime-reporter.cjs')]]
  : [];
```

Runner server spawn Playwright voi env:

```js
env: {
  ...process.env,
  PW_REALTIME_REPORTER: '1'
}
```

Khuyen nghi: Option B de CLI thuong khong bi output event neu khong can.

## 8. Phase 4 - Live table and counters

Sau khi co `test-begin/test-end`:

UI can:

- Khi `test-begin`: them row neu chua co, status `RUNNING`.
- Khi `test-end`: update row status `PASS/FAIL/SKIP`, duration, error message neu co.
- Counter:
  - `total` tang khi `test-begin` hoac lay tu `onBegin`;
  - `passed/failed/skipped` tang khi `test-end`.
- Khi `result-final`: reconcile bang final JSON:
  - neu counter live khac final JSON, final JSON thang;
  - console ghi mot line `[INFO] Final results reconciled from reports/results.json`.

Can tranh double count:

- moi test co key on dinh: `test.id` tu reporter neu co, hoac fallback `project + file + title`.
- Neu retry, chi tinh ket qua cuoi cung theo Playwright final JSON; live UI co the hien retry line rieng trong log.

## 9. Phase 5 - Stop/reconnect/hardening

Optional sau khi realtime core chay:

- Nut `Stop Run` goi `POST /api/runs/:runId/stop`.
- Server kill child process:
  - Windows: `taskkill /pid <pid> /T /F` neu can kill tree;
  - mac/linux: `process.kill(-pid)` neu spawn detached.
- Client reconnect:
  - EventSource tu reconnect neu mat ket noi;
  - `GET /api/runs/:runId` lay snapshot neu reconnect muon ve dung state.
- Rate limit UI log render:
  - batch append log moi 100-200ms neu output qua nhieu;
  - gioi han DOM log lines de UI khong lag.

## 10. File du kien se sua

Bat buoc:

```text
automation-test/runner/server.js
automation-test/runner/index.html
```

Neu lam structured events:

```text
automation-test/runner/realtime-reporter.cjs
automation-test/playwright.config.ts
```

Neu cap nhat tai lieu thao tac:

```text
automation-test/README.md
notes/automation-test.md
```

Khong sua:

```text
dashboard/
crawler-pipeline/
supabase/
```

Task nay chi lien quan runner automation, khong sua source dashboard production de lam test xanh.

## 11. Verification bat buoc

Chay trong `automation-test/`:

```powershell
npm run typecheck
npm run test:module -- roles -- --list
npm run dashboard
```

Manual check tren dashboard runner:

1. Mo `http://localhost:3005`.
2. Bam `Run All`.
3. Xac nhan terminal log append lien tuc trong luc dang chay.
4. Bam `Run Module` voi `roles`.
5. Xac nhan console khong doi den cuoi moi hien mot cuc.
6. Neu da lam Phase 3/4, xac nhan row/counter update theo tung test case.
7. Khi run xong, xac nhan summary cuoi khop Playwright HTML/JSON report.

## 12. Acceptance criteria cuoi

- First log line hien trong UI trong vong 1 giay sau khi bam run.
- Console output append realtime, auto-scroll, khong replace bang mot blob cuoi cung.
- Khi Playwright dang chay, user thay duoc tien trinh hien tai.
- Final summary/table van khop `reports/results.json`.
- Neu co test fail, error message hien o row tuong ung va log co dong fail lien quan.
- Khong co module registry regression: `/api/modules` van tra module nhu cu.
- Khong commit artifact runtime: `reports/results.json`, `playwright-report/`, `test-results/`.

## 13. Thu tu giao cho AI trien khai

1. Chi doc/sua `automation-test/runner/server.js`, `automation-test/runner/index.html`, `automation-test/playwright.config.ts` va file reporter moi neu can.
2. Lam Phase 1 + Phase 2 truoc de co raw realtime logs.
3. Chay dashboard va verify console append realtime.
4. Sau do moi lam Phase 3 + Phase 4 de co live table/counter.
5. Cuoi cung chay verification, cap nhat README/note neu hanh vi runner thay doi.
6. Tuyet doi khong sua source `dashboard/` production de giai quyet viec runner log cham.
