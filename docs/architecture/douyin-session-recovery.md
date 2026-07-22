# Douyin Session Recovery & Challenge Solver

Status: Planned / architecture direction
Last updated: 2026-07-21

This document records the agreed direction for handling Douyin search sessions that pass login/profile checks but fail real search with an anti-bot challenge.

## Problem

The current Douyin HTTP crawler can hold an enriched browser session and call profile APIs, but search can still return a soft-block response:

```text
search_nil_info.search_nil_type = "verify_check"
search_nil_info.search_nil_item = "verify_check"
result_status = 5
data.length = 0
```

When this happens, the session is not simply "expired". It is a browser identity that needs challenge recovery before the HTTP API crawler can continue.

## Decision

Douyin challenge handling must be implemented as a worker-side session recovery subsystem, not as normal crawler logic.

Allowed:

- Use Playwright Chromium persistent context to recover or refresh the Douyin browser identity.
- Use a pluggable challenge provider such as 2Captcha only during session bootstrap/recovery.
- Run `runSessionDiagnostic` again after recovery.
- Continue with the HTTP API crawler only after diagnostic passes.

Not allowed:

- Do not put 2Captcha calls inside Dashboard UI components.
- Do not put challenge solving inside `core.ts` crawl loops.
- Do not put browser/challenge logic inside `http_client.ts`.
- Do not retry challenge recovery forever or spend solver balance without a strict limit.
- Do not log raw cookies, `msToken`, `api_key`, solver payloads, or challenge tokens.

## Placement

Generic challenge provider code should live outside platform-specific crawlers:

```text
crawler-pipeline/src/challenge/
  types.ts
  solver.ts
  providers/two_captcha.ts
```

Douyin-specific detection and session recovery should stay inside the Douyin module:

```text
crawler-pipeline/src/crawl/douyin/challenge.ts
crawler-pipeline/src/crawl/douyin/session_recovery.ts
```

Responsibilities:

| Component | Responsibility |
|---|---|
| `session_diagnostic.ts` | Classify session health and return a structured reason such as `ok`, `missing_identity`, `auth_expired`, `challenge_required`, `empty_search`, or `network_error`. |
| `http_client.ts` | Detect/parse platform response signals, but do not open browser or call 2Captcha. |
| `session_recovery.ts` | Open persistent browser context, handle Douyin challenge, export refreshed `DouyinSession`, and save it through the existing session/account path. |
| `challenge/providers/two_captcha.ts` | Wrap 2Captcha API, timeout handling, polling, and provider errors. |
| `core.ts` / future `DouyinSessionManager` | Orchestrate diagnostic -> optional recovery -> diagnostic -> crawl. |
| Dashboard `/dash/settings` | Store/display solver configuration only. It is not the runtime solver. |

## Runtime Flow

```text
ensureLogin
  -> load account/local DouyinSession
  -> runSessionDiagnostic
       -> ok: return session
       -> challenge_required:
            -> recoverDouyinSession
                 -> open Playwright persistent context for same account/profile/proxy
                 -> navigate to Douyin/search
                 -> solve or wait for challenge depending on configured strategy
                 -> export enriched DouyinSession
            -> runSessionDiagnostic again
                 -> ok: return recovered session
                 -> fail: mark account as challenge_required/suspect and fail task
       -> other failure: rotate account or fail fast according to account policy
```

The normal search/detail/comment crawler remains HTTP-first. Browser is a recovery/bootstrap tool, not the default runtime crawler.

## Configuration Contract

First implementation may read from worker environment variables:

```env
CAPTCHA_ENABLED=true
CAPTCHA_PROVIDER=2captcha
TWOCAPTCHA_API_KEY=...
DOUYIN_CHALLENGE_STRATEGY=manual_then_2captcha
CAPTCHA_MAX_ATTEMPTS=1
CAPTCHA_TIMEOUT_MS=120000
```

Supported strategy values should be explicit:

| Value | Meaning |
|---|---|
| `off` | Never attempt recovery; fail with `challenge_required`. |
| `manual` | Open non-headless browser and wait for operator action. |
| `2captcha` | Use configured 2Captcha provider only. |
| `manual_then_2captcha` | Prefer manual recovery when available, then use provider fallback. |

Dashboard already has a Settings surface and `system_settings` storage for 2Captcha configuration. Before the worker can consume that DB-backed setting, add a narrow internal settings endpoint or scoped route. Do not expose the whole `system_settings` table through the generic worker REST proxy.

Recommended worker-facing scope:

```text
crawler:read_settings
```

Recommended endpoint shape:

```text
GET /api/worker/settings/captcha
```

The response must return only the fields the worker needs, and secrets must never be written to `crawler_logs` or `audit_logs`.

## Task Metadata & Logs

Worker task metadata should expose recovery progress without leaking secrets:

```json
{
  "phase": "challenge_solving",
  "challenge_status": "required",
  "challenge_provider": "2captcha",
  "session_recovery_attempts": 1
}
```

Recommended phases:

- `session_diagnostic`
- `challenge_solving`
- `session_recovered`
- `collecting_posts`
- `failed`

## Failure Policy

- One task/account should have a small bounded recovery attempt count, normally `1` or `2`.
- If recovery fails, mark the account as `challenge_required` or suspect according to the account health policy.
- Do not immediately re-checkout the same account in a loop.
- If solver config is missing while strategy requires it, fail fast with a clear message.
- If profile/checkpoint 1 passes but search/checkpoint 2 returns `verify_check`, report `challenge_required`, not generic session expired.

## Definition of Done

This subsystem is not Done until all of these are true:

- A real Douyin search task saves the requested amount, for example `10/10` or `50/50`, after a session had previously hit `verify_check`.
- Diagnostic returns structured reasons instead of a bare boolean.
- Worker logs show `session_diagnostic -> challenge_solving -> session_recovered -> collecting_posts`.
- Solver/account/session secrets are redacted from logs.
- Retry/recovery attempts are bounded and do not burn 2Captcha balance indefinitely.
- Missing 2Captcha configuration produces a clear operator-facing error.
- `npx.cmd tsc --noEmit` and the relevant crawler smoke test pass.

