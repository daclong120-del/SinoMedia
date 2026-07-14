# Plan: Automation Test Remove Skip

Ngay lap: 2026-07-14
Trang thai: Planned
Pham vi: `automation-test` runner UI/server/reporter, Playwright specs, docs/rules automation-test

Plan nay nham loai bo trang thai `SKIP` khoi AutoTest runner vi no lam ket qua mo ho: nguoi dung khong biet test case da chay that, bi thieu env, bi chan quyen, hay chi bi bo qua. Huong moi la fail-closed hoac khong dua case vao run set ngay tu dau, de dashboard chi hien ket qua co nghia.

## 0. Van de hien tai

Trong dashboard hien tai co the thay:

- Nhieu row hien `SKIP 0.00s`.
- Counter ben trai co `Bo qua`.
- Tong so case tang, nhung pass/fail bang 0, lam nguoi dung tuong runner da chay het trong khi thuc te phan lon case khong duoc execute.
- Live/env-gated specs nhu Douyin creative live smoke co the dung `test.skip()` khi thieu env, lam Playwright report sinh skipped result.

Nguon `SKIP` hien co:

- UI: `automation-test/runner/index.html` co `stat-skipped`, `.badge-skipped`, `statusBadge('skipped')`.
- Server: `automation-test/runner/server.js` parse JSON reporter va dem `summary.skipped`.
- Realtime: `test-end` map `eventData.status === 'skipped'` thanh `skipped`.
- Specs: mot so live smoke test co `test.skip()` hoac annotation skip khi thieu env.
- Docs/plans cu van ghi pass/fail/skip nhu mot trang thai binh thuong.

## 1. Nguyen tac moi

- Default runner khong hien `SKIP`.
- Default `Run All` khong duoc co case bi skipped.
- Test case da nam trong selected run set thi phai ket thuc bang `PASS` hoac `FAIL`.
- Neu thieu env/live credential thi khong register vao default suite, hoac khi user co tinh chay module live thi fail ro voi error message.
- Khong dung `test.skip()` de lam runner xanh.
- Khong coi `skipped` cua Playwright la thanh cong hay neutral. Neu Playwright van tra skipped, runner phai convert thanh `FAIL` voi message `Unexpected skipped test`.
- Setup/auth helper khong tinh la business test case. Viec loai `_setup` khoi business counter khong goi la skip.
- Khong dong cham cac khai niem khac ngoai automation runner:
  - SQL `SKIP LOCKED`.
  - Crawler dedup `skipped_count`.
  - Crawler bo qua item loi trong loop neu co log ro.

## 2. Trang thai ket qua sau khi bo skip

Trang thai terminal trong dashboard:

```text
PASS
FAIL
RUNNING
ERROR
```

Khong co:

```text
SKIP
SKIPPED
Bo qua
```

Neu can hien case khong nam trong run set, dung trang Quan ly Test Case/registry rieng, khong dua vao bang ket qua cua run.

## 3. Huong xu ly live/env-gated test

### Default run

- `Run All` chi include specs co the chay on dinh trong moi truong local default.
- Live specs khong duoc register vao default run neu thieu env flag.
- Module live co the hien trong registry la `requiresEnv`, nhung khong tao result row `SKIP`.

### User bam chay live module

Neu user chu dong chay module live ma thieu env:

- Case phai `FAIL` nhanh, khong `SKIP`.
- Error message phai noi ro env nao thieu:

```text
RUN_LIVE_DOUYIN_CREATIVE must be 1 to run live Douyin smoke tests.
```

### Cach implement test

Khong dung:

```ts
test.skip();
testInfo.skip(true, "...");
```

Dung fail-closed:

```ts
test("TC_DY_LIVE_001 - ...", async () => {
  expect(process.env.RUN_LIVE_DOUYIN_CREATIVE, "RUN_LIVE_DOUYIN_CREATIVE must be 1").toBe("1");
  // live smoke steps...
});
```

Hoac dung dynamic spec registration o server/module registry: neu env thieu thi khong dua live spec vao run set default.

## 4. Phase A - Inventory va policy lock

- Quet toan bo `automation-test`:

```powershell
rg -n "test\\.skip|skip\\(|skipped|SKIP|stat-skipped|badge-skipped" automation-test
```

- Phan loai tung occurrence:
  - UI display skip.
  - Server summary skip.
  - Playwright spec skip.
  - Comment/doc text.
  - Domain skip khong lien quan runner.
- Viet rule vao `.agents/rules/auto-test.md`:
  - Khong viet `test.skip()`.
  - Thieu env/live session thi fail ro hoac exclude khoi default run, khong skip.
  - Khong sua source dashboard production de lam test xanh.

Acceptance:

- Co danh sach occurrences can sua.
- Co quy tac ro rang ve "skipped from Playwright => fail".

## 5. Phase B - Server/report parser

File chinh:

```text
automation-test/runner/server.js
automation-test/runner/realtime-reporter.cjs
```

Viec can lam:

- Loai `summary.skipped` khoi summary business runner.
- Khi parse final JSON:
  - Neu `res.status === 'skipped'`, tao row `status='failed'`.
  - Gan `errorMessage='Unexpected skipped test. This runner is fail-closed; remove test.skip or exclude the spec from default run.'`.
  - Tang `summary.failed`.
- Khi realtime `test-end` nhan `status === 'skipped'`:
  - Emit status `failed`.
  - Emit error message tuong tu.
- Neu Playwright stats co skipped > 0:
  - run exit status UI phai la `FAILED`/`ERROR`, khong `COMPLETED`.
  - console log warning ro: `Skipped tests are not allowed`.
- Voi `_setup`:
  - Tiep tuc loai khoi business cases.
  - Khong report la skipped.

Acceptance:

- Final JSON co skipped thi dashboard hien FAIL.
- Counter khong con skipped.
- Console giai thich vi sao skipped bi convert thanh fail.

## 6. Phase C - UI dashboard

File chinh:

```text
automation-test/runner/index.html
```

Viec can lam:

- Xoa stat `Bo qua`/`stat-skipped` khoi sidebar.
- Xoa CSS/logic `.badge-skipped`.
- `statusBadge()` khong con branch skipped.
- Bang ket qua chi hien `PASS`, `FAIL`, `RUNNING`.
- Summary cards/sidebar chi con:
  - Tong so case.
  - Thanh cong.
  - That bai.
  - Thoi gian chay.
- Neu server gui skipped ngoai y muon, UI fallback thanh `FAIL`, khong render `SKIP`.
- Copy trong log/noi dung UI khong dung "skip" nhu mot result binh thuong.

Acceptance:

- Khong con chu `SKIP` trong UI runner khi run.
- Khong con `Bo qua` counter.
- Run co skipped tu Playwright hien FAIL ro.

## 7. Phase D - Refactor specs dang skip

Targets can kiem tra:

```text
automation-test/tests/**/*
```

Case hien can chu y:

- `automation-test/tests/crawler-live-smoke/crawler-live-smoke.spec.ts`
- `automation-test/tests/douyin-creative/douyin-creative-live.spec.ts`

Huong sua:

- Live smoke khong nam trong default `Run All` neu thieu env.
- Neu user chay module live truc tiep ma env thieu, case fail voi assertion message ro.
- Neu case chua implement, khong tao placeholder `test.skip`. Dua vao `*-cases.md` voi `Automation status: planned`.
- Neu can quarantine, dung tag `@quarantine` va runner exclude mac dinh, khong dung skip.

Acceptance:

- `rg -n "test\\.skip|testInfo\\.skip|skip\\(" automation-test/tests` khong con match dung cho Playwright skip.
- Live smoke thieu env khong tao `SKIP`.

## 8. Phase E - Module registry va run selection

Viec can lam:

- Mo rong `module.json` neu can:

```json
{
  "requiresEnv": ["RUN_LIVE_DOUYIN_CREATIVE"],
  "defaultRun": false
}
```

- Runner `/api/modules` co the tra metadata can thiet de UI hien "requires env".
- `Run All` chi chay module/case `defaultRun !== false`.
- Chay module truc tiep:
  - Neu thieu env va module la live-only, co the fail ngay bang synthetic failed result hoac chay spec fail-closed.
  - Khong tra skipped result.

Acceptance:

- Default Run All khong keo live smoke vao roi skip hang loat.
- User van thay module live trong registry, nhung biet no can env.

## 9. Phase F - Docs va historical plans

Can cap nhat:

```text
automation-test/README.md
notes/automation-test.md
docs/project-status.md
.agents/rules/auto-test.md
```

Noi dung can doi:

- Thay `passed/failed/skipped` bang `passed/failed`.
- Ghi ro "skip is not an allowed final result".
- Ghi ro live smoke/env-gated khong chay default.
- Ghi ro neu test chua automation-ready thi chi nam trong case doc, khong tao `test.skip()`.

Khong can sua cac plan lich su neu chi la archived context, nhung plan moi/phien docs hien hanh phai dung rule moi.

## 10. Verification bat buoc

Chay trong `automation-test`:

```powershell
npm run typecheck
npm run test:module -- douyin-creative -- --list
npm run test:module -- crawler-live-smoke -- --list
npm run dashboard
```

Manual dashboard:

1. Bam `Run All`.
2. Xac nhan sidebar khong con `Bo qua`.
3. Xac nhan khong co row `SKIP`.
4. Bam module live thieu env.
5. Xac nhan no hien `FAIL` voi error message thieu env, khong hien `SKIP`.
6. Mo HTML report neu Playwright van ghi skipped, dashboard van fail-closed.

Search gate:

```powershell
rg -n "SKIP|skipped|stat-skipped|badge-skipped|test\\.skip|testInfo\\.skip" automation-test
```

Ket qua mong muon:

- Khong con UI/runner skip.
- Neu con chu `skip` thi chi nam trong comment noi ve policy cam skip hoac domain unrelated.

## 11. Rollout thu tu

1. Sua spec skip truoc de giam skipped source.
2. Sua server parser de fail-closed neu skipped van lot vao.
3. Sua UI bo counter/badge skip.
4. Sua module registry/default run selection cho live/env-gated.
5. Cap nhat docs/rules.
6. Chay verification va chup dashboard sau fix.

## 12. Definition of Done

- Dashboard khong con tinh nang skip.
- `Run All` khong tao hang loat `SKIP 0.00s`.
- Moi selected test case ket thuc bang `PASS` hoac `FAIL`.
- Missing env/live credential hien fail message ro.
- `test.skip()` khong con trong `automation-test/tests`.
- Server convert bat ky Playwright skipped result nao thanh failed result.
- Docs/rules khong con xem skip la trang thai hop le.
