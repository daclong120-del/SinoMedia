# Plan: Automation Crawler Test Cases

Ngay lap: 2026-07-14
Trang thai: Planned
Pham vi: `automation-test`, crawler contract tests, selective live smoke tests

Plan nay dung de chuyen bo test case crawler/cookie/platform vua review thanh automation suite on dinh cho SinoMedia. Khong import thang 27 case vao runner, vi mot phan lon phu thuoc live site, captcha, profile trinh duyet that, hoac dang lech voi kien truc HTTP-first hien tai.

## 0. Ket luan review

- File nguon ghi 30 test cases nhung thuc te co 27 case.
- Nen dung bo case nhu coverage draft, khong xem la automation-ready spec.
- Test live ranking/trending cua cac nen tang Trung Quoc rat de flaky vi data thay doi, anti-bot, region/network, captcha va session.
- Docs hien tai xac nhan crawler runtime la HTTP-first; chi Douyin duoc dung Playwright Chromium persistent context nhu buoc session bootstrap/hydration, khong dung browser lam crawler runtime mac dinh.
- Bilibili playback uu tien official iframe tu BVID, khong tai video ve R2 mac dinh.
- `/api/video/proxy` co SSRF guard va phu hop lam security regression test.

## 1. Muc tieu

- Bien cac case dang o dang mo ta thanh test spec co the chay bang Playwright/Node runner.
- Tach ro case nao la unit/contract/backend, case nao la UI, case nao la live smoke env-gated.
- Giam flaky bang mock/fixture/network stub khi co the.
- Khong dua test phu thuoc cookie/profile that vao default suite.
- Khong sua dashboard/crawler production chi de lam automation xanh.

## 2. Nguyen tac bat buoc

- Moi test title co ID dau dong, vi du `TC_COOKIE_004 - ...`.
- Gan tag ro: `@crawler`, `@cookie`, `@security`, `@contract`, `@live-smoke`, `@quarantine`.
- Default runner chi chay test on dinh, khong chay live crawler neu thieu env flag.
- Live smoke test phai co guard env, vi du `RUN_LIVE_CRAWLER_SMOKE=1`.
- Credential/cookie/profile/doc live URL doc tu env hoac fixture; khong hardcode cookie that.
- Assert theo contract on dinh: field shape, status code, URL pattern, normalized output; khong assert noi dung trending/hot co dinh.
- Neu case chua co implementation, ghi `status: blocked-by-feature` trong case doc thay vi viet test fail vo nghia.

## 3. Phan loai case

| Nhom | So case | Huong automation |
|---|---:|---|
| Creative & Post Ranking | 6 | Chuyen thanh live smoke env-gated hoac contract test voi fixture API/HTML. Khong chay default. |
| Cookie & Hydration | 5 | Uu tien automate bang unit/backend contract. Douyin bootstrap can mock hoac env-gated smoke. |
| Browser Cookie Extraction | 4 | Chua dua vao default. Can feature extractor rieng va fixture profile gia lap truoc. |
| Platform Chromium ID Crawl | 7 | Khong automate theo Chromium runtime mac dinh. Doi thanh HTTP/extractor contract hoac live smoke quarantine. |
| Fault/Security | 5 | Uu tien `Bilibili iframe`, `Video Proxy SSRF`, `Zhihu d_c0`. Douyin captcha va guest mode can xac minh lai contract. |

## 4. Case uu tien dua vao automation ngay

### `crawler-contracts`

Module moi de xuat:

```text
automation-test/tests/crawler-contracts/
|-- module.json
|-- crawler-contracts.spec.ts
`-- crawler-contracts-cases.md
```

Scope:

- `TC_COOKIE_004`: Zhihu strip dau nhay kep cua `d_c0` truoc khi sinh `x-zse-96`.
- `TC_COOKIE_006`: Bilibili cookie string/JSON parse duoc `SESSDATA` va `bili_jct`.
- `TC_COOKIE_007`: JSON array cookie normalize thanh `name=value; name2=value2`.
- `TC_FAULT_001`: Bilibili creative detail/player contract build iframe URL tu BVID, khong tao flow R2/download mac dinh.
- `TC_FAULT_004`: Video Proxy chan HTTPS redirect ve private/local IP, tra `403`.

Tags:

```text
@crawler @contract @cookie @security
```

### `video-proxy`

Neu tach module rieng:

```text
automation-test/tests/video-proxy/
|-- module.json
`-- video-proxy.spec.ts
```

Scope:

- Auth required: khong login tra `401`.
- Chi chap nhan HTTPS.
- Domain allowlist.
- DNS/private IP block.
- Redirect chain van phai validate URL dich moi.
- Range header invalid tra `400`.
- Content-type/size guard.

## 5. Case can doi thanh live smoke/quarantine

Dung tag:

```text
@live-smoke @quarantine
```

Chay bang env:

```powershell
$env:RUN_LIVE_CRAWLER_SMOKE='1'
npm run test:module -- crawler-live-smoke
```

Danh sach:

- `TC_CREATIVE_006` den `TC_CREATIVE_011`.
- `TC_PLATFORM_001` den `TC_PLATFORM_007`.
- `TC_FAULT_002` neu muon mo phong captcha bang live Douyin.
- `TC_FAULT_003` neu phai goi Zhihu live API thay vi unit test signer.

Quy tac assert cho live smoke:

- Chi yeu cau response co mang ket qua khong loi, hoac co loi auth/captcha duoc classify dung.
- Chi validate ID pattern: BVID, aweme id, note id, weibo mid, thread id.
- Khong assert exact title, exact rank, exact hot count.
- Timeout/retry rieng, khong de fail live smoke lam fail default regression.

## 6. Case chua nen automate

### Browser Cookie Extraction

Chua dua vao automation chinh:

- `TC_BROWSER_004`: Chrome profile Zhihu.
- `TC_BROWSER_005`: Edge profile Douyin.
- `TC_BROWSER_006`: Brave profile Bilibili.
- `TC_BROWSER_007`: Opera profile Weibo.

Ly do:

- Phu thuoc duong dan profile that tren may user.
- Can xu ly lock file, encryption/DPAPI, cookie DB schema tung browser.
- Ruy ro doc cookie that trong test va leak artifact/log.

Dieu kien de mo khoa:

- Co extractor module chinh thuc.
- Co fixture profile gia lap khong chua secret.
- Co log redaction test.
- Co env opt-in ro, khong chay mac dinh.

### Duplicate Cookie Ownership

`TC_COOKIE_008` chua automate nhu mo ta hien tai vi code dang upsert theo `platform + username`, chua thay contract duplicate theo cookie fingerprint.

Can quyet dinh:

- Neu san pham can chan duplicate cookie: them feature fingerprint/ownership truoc, sau do test.
- Neu khong: doi expected result thanh "cap nhat account trung platform+username" hoac xoa case.

### Douyin Guest Mode

`TC_FAULT_005` dang lech voi docs hien tai. Docs uu tien diagnostic hard gate/fail-fast neu session khong pass.

Can quyet dinh:

- Giu fail-fast: doi case thanh "khong co account/session hop le thi fail co cau truc".
- Muon guest mode: can ADR/decision moi, code moi, roi moi automate.

## 7. Case spec template

Moi case trong `*-cases.md` nen co format:

```md
## TC_COOKIE_004 - Zhihu strips quoted d_c0

- Tier: P1
- Type: contract
- Tags: @crawler @cookie @contract
- Preconditions: none
- Test data: `d_c0="1234567890_abc"; zse_ck=...`
- Steps:
  1. Call signer/helper with cookie string.
  2. Capture normalized `d_c0` used in signature input or compare generated signature path.
- Expected:
  - `d_c0` is treated as `1234567890_abc`.
  - No raw cookie is printed to logs.
- Automation status: ready
- Notes: avoid live Zhihu call in default suite.
```

## 8. Rollout phases

### Phase A - Contract inventory

- Tao `crawler-contracts-cases.md`.
- Chuan hoa 27 case thanh table co cot: `ID`, `tier`, `type`, `default?`, `env`, `status`, `owner module`.
- Sua so luong tu 30 thanh 27 neu giu file case hien tai.
- Danh dau blocked cases: browser extraction, duplicate cookie ownership, guest mode.

### Phase B - Cookie/contract tests

- Tao module `crawler-contracts`.
- Viet test cho normalize cookie JSON array/object/string.
- Viet test cho Zhihu `d_c0` strip.
- Viet test cho Bilibili cookie parse/required keys bang fixture.
- Chay:

```powershell
cd D:\Python\SinoMedia\automation-test
npm run typecheck
npm run test:module -- crawler-contracts -- --list
npm run test:module -- crawler-contracts
```

### Phase C - Video proxy security regression

- Tao hoac mo rong module `video-proxy`.
- Test auth/HTTPS/domain/range/content-type guard.
- Cho SSRF redirect, dung local mock HTTP(S) server hoac mock DNS/fetch neu runner cho phep.
- Khong goi live media lon.

### Phase D - Creative detail/Bilibili iframe contract

- Them test UI/backend nhe cho rule:

```text
platform = bilibili + platform_uid = BV... -> iframe player.bilibili.com
```

- Assert khong goi `/api/video/proxy` va khong tao `cache_media` task trong flow playback.

### Phase E - Live crawler smoke opt-in

- Tao module `crawler-live-smoke`, mac dinh disabled hoac guard env.
- Moi platform chi co 1-2 smoke case nhe.
- Tat ca live smoke co tag `@live-smoke @quarantine`.
- Ket qua live smoke ghi la tham khao van hanh, khong phai default release gate.

### Phase F - Runner/report integration

- Dam bao `/api/modules` thay module moi qua `module.json`.
- Runner hien type dung: `contract`, `security`, `live-smoke`; khong hardcode het la `UI`.
- Khong commit `reports/results.json`, `playwright-report/`, `test-results/`.

## 9. Suggested module metadata

`crawler-contracts/module.json`:

```json
{
  "id": "crawler-contracts",
  "name": "Crawler Contracts",
  "description": "Kiem thu contract on dinh cho cookie normalization, platform metadata, Bilibili iframe va crawler helper.",
  "type": ["backend", "contract"],
  "specs": ["tests/crawler-contracts/crawler-contracts.spec.ts"],
  "tags": ["@crawler", "@contract", "@cookie"],
  "requiresAuth": false,
  "enabled": true
}
```

`crawler-live-smoke/module.json`:

```json
{
  "id": "crawler-live-smoke",
  "name": "Crawler Live Smoke",
  "description": "Smoke test opt-in cho crawler live site; khong chay trong regression mac dinh.",
  "type": ["backend", "live-smoke"],
  "specs": ["tests/crawler-live-smoke/crawler-live-smoke.spec.ts"],
  "tags": ["@crawler", "@live-smoke", "@quarantine"],
  "requiresAuth": false,
  "enabled": false
}
```

## 10. Quality gate

Truoc khi merge plan thanh implementation:

```powershell
cd D:\Python\SinoMedia\automation-test
npm run typecheck
npm run test:module -- crawler-contracts -- --list
npm run test:module -- crawler-contracts
npm run dashboard
```

Can verify:

- Module moi hien trong runner dashboard.
- Test list co dung ID/tag.
- Default suite khong chay live smoke neu chua bat env.
- Test khong doc cookie/profile that.
- Log khong in raw cookie/token.

## 11. Khong lam

- Khong import 27 case vao default suite mot luc.
- Khong dung profile Chrome/Edge/Brave/Opera that trong CI/default runner.
- Khong assert exact top ranking/hot data cua live site.
- Khong bien Chromium thanh crawler runtime mac dinh cho cac platform khac voi docs.
- Khong tao lai `cache_media` hay ep Bilibili ve R2/direct video playback.
- Khong sua source production chi de automation pass.
