# Mâm An hardening verification

## Environment and evidence

- Branch: `codex/test-hardening-live-ai`; baseline fetched main `4aa32fb6e9c62d18a3bc7d4363a7b501a8303178`.
- Tested source revision: `abf3cf43f564e4312bb0c1cce156d2b045a40643`. Subsequent documentation/evidence commits do not change this tested source.
- [RAN] Node v24.13.0, Windows PowerShell, Chromium via installed Playwright 1.63.0; 2026-09-19/20 Asia/Bangkok. Provider timestamps are UTC.
- Public production: https://mam-an.vercel.app/ ; baseline GitHub deployment 6540293721, `mam-qxwnqdcdo-ronnie-nguyens-projects.vercel.app`.
- `final-runs.json` records exact final commands, SHA, timestamps, environment and exit codes. `logs/` contains outputs. Intermediate runs were at baseline SHA plus working-tree changes; they are not clean-commit evidence. Provider ledger explicitly marks modified working tree.
- [READ] PRD/SRS/HLD/LLD provide baseline design evidence. Inventory below checks their candidate-only AI, deterministic nutrition, local persistence, correction and medical-safety boundaries against current source.
- Operator file `TECTON_v1_Principal_Protocol.md` remains unmodified/uncommitted. No dependencies or lockfile changed.

## Confirmed failures and divergence frontiers

### Browser request receiver

[RAN] Production live button was enabled at both 390px and 1366px. Upload and analyze displayed a network error without an API response/request (`deployment-inspection.json`). This was not a disabled build flag.

[READ] `src/infrastructure/ai/httpAiGateway.ts:analyze` stored native fetch as a member and invoked `this.send(...)`. Last correct boundary: UI invoked gateway; first wrong boundary: native browser fetch receiver.

Prediction: if member-call receiver binding causes the error, calling the same fetch with the global receiver will issue a request. [RAN] Controlled Chromium probe returned `TypeError: Failed to execute 'fetch' on 'Window': Illegal invocation` for member invocation and HTTP 200 for `.call(window, ...)`. Before-fix live browser regressions failed (`logs/live-gateway-before.txt`); after `.call(globalThis, ...)`, production-build E2E reaches the intercepted API and persists corrected results. Added a 30-second deadline and signal/body-read regressions.

### Emitted Vercel Function modules

[RAN] Public production GET `/api/v1/analyze-meal` returned HTTP 500, text/plain, `FUNCTION_INVOCATION_FAILED`; expected handler response is JSON 405. The protected deployment URL redirects to Vercel login.

[READ] Installed Vercel CLI 59.23.2 / `@vercel/node` 13.0.1 supports the existing default `{ fetch(Request) }` export. The signature was retained.

Prediction: if extensionless emitted ESM imports prevent startup, explicit .js specifiers will make the same emitted artifact invocable. [RAN] Official builder artifact before fix failed `ERR_MODULE_NOT_FOUND` for server/config/serverConfig and reported missing node/vite type definitions. After explicit extensions and `api/tsconfig.json`, the same builder emitted an artifact that returned GET 405 and POST 200 through sharp, the real adapter/parser and stub upstream HTTP. See `logs/vercel-runtime-before.txt` and `logs/vercel-runtime-final.txt`.

This confirms the local artifact root cause. [INFERRED] It explains the hosted 500; hosted logs are inaccessible, so it is not yet a confirmed deployed root cause. Builder uses meta.isDev to avoid package installation; emitted compiler/tracer output is exercised on Windows, not hosted Linux.

Reproduction command (installed builder directory is machine-specific):

```powershell
node scripts/verify-vercel-runtime.mjs 'C:\Users\LOQ\AppData\Local\npm-cache\_npx\69f9afb961c37556\node_modules\@vercel\node'
```

### Sample test timing and stale PWA

[RAN] Fresh baseline build exposed a test navigating away before meal-save completed (3 passed, 1 failed). Waiting for the saved view before navigation fixed that test race. This is not reported as a production persistence defect.

[RAN] Two service-worker versions on a disposable origin reproduced a waiting update with no user activation affordance (`logs/pwa-update-before.txt`). Added an explicit update notice. The regression confirms it stays disabled during an unsaved meal, enables after save, activates/reloads and preserves history; no /api cache entry appears.

## Build and checks

| Command | [RAN] result | Evidence |
| --- | --- | --- |
| npm ci at baseline, unchanged lockfile | 388 packages, 0 reported vulnerabilities | logs/baseline-install.txt |
| Baseline typecheck/build | Success, 170 modules | baseline logs |
| Baseline npm test | 7 files / 41 tests passed | logs/baseline-test-unsandboxed.txt |
| Final npm run typecheck | Exit 0 | logs/final-typecheck.txt |
| Final npm test | 10 files / 203 tests passed | logs/final-test.txt |
| Final npm run test:e2e (includes npm run build) | 18 passed; 173 modules; PWA 10 precache entries | logs/final-test-e2e.txt |
| New York timezone domain run | 26 passed, including 167-hour DST week | logs/timezone-new-york.txt |
| Final npm run audit:safety | Passed inventory/browser-server boundary checks | logs/final-audit-safety.txt |
| Final npm run audit:secrets | Passed working source, built client, template history | logs/final-audit-secrets.txt |
| Final npm run catalog:check | Valid and reproducible | logs/final-catalog-check.txt |

DST command in PowerShell: `$env:TZ='America/New_York'; npm test -- --run tests/domain.test.ts` (baseline SHA plus domain-test additions, 2026-09-19). The final source retains those tests.

Sandbox-only cache EPERM and tsx uv_os_get_passwd ENOMEM were resolved by approved elevated execution. They are not application defects. Early E2E against pre-existing dist is not counted as fresh-build proof. A new glucose exact-label selector initially timed out because wrapping-label names include option text; role/name-prefix selection corrected the test. No test was skipped to achieve the final result.

## Unit inventory

[RAN] The 203-test deterministic suite covers these mechanisms without live provider requests:

- `tests/domain.test.ts`: carb/kcal scaling, precision vs display rounding, nonpositive rejection, empty/unknown/partial, inclusion, duplicate-like items, fractions/large portions, snapshot stability; seven local days, timezone/DST, empty week, linked/unlinked glucose.
- `tests/state-machine.test.ts`, `tests/session.test.ts`: state transitions/review gate, cancellation, retry, correction, portions, add/remove, late result rejection and preserved draft on failure.
- `tests/provider-hardening.test.ts`: all five supported adapters; absent/blank keys, valid output, 400/401/403/404/408/429/500/503/504, malformed JSON/schema/empty candidates, network and body timeout. Config default/order, duplicate/unsupported IDs, invalid values; fallback after auth/model/schema failures, parent abort and total budget. Gemini native conversion/thought filtering; observer failure cannot break analysis.
- `tests/contract/api.test.ts`: POST/origin/body contract, normalized/error schema, Host/origin proxy regression.
- `tests/secret-template.test.ts`: supported credential names and generic credential suffix detection.

## Integration inventory

- [RAN] `tests/integration/gateway-api.test.ts`: real gateway → multipart → handler → sharp → real adapter → stub network → parser → client DTO. Stable error codes, non-JSON responses, upload validation, global fetch receiver, parent/deadline abort.
- [RAN] Real adapter/parser failover: 429/timeout/malformed/model unavailable → next provider; all unavailable; sanitized failures.
- [RAN] `tests/integration/persistence.test.ts`: actual Dexie/fake IndexedDB, atomic thumbnail rollback, save/query/reopen/weekly aggregate, schema corruption, version-one reopen, demo reset preserving real meals/readings. No new migration exists to test.
- [RAN] Vite proxy Host/origin regression remains in the contract suite. Emitted Vercel Function invoked separately as above.
- [RAN] `scripts/verify-live-path.ts`: actual Chromium native fetch → local HTTP → exported Function/config → real provider → parser → UI on the production bundle. Groq returned 429; separate Mistral request returned 200, five candidates and visible review UI. `live-path.json` records both, with commands/hash/timestamps. Synthetic data only, not hosted-success evidence.

## System inventory (production build)

- [RAN] UC-01: 390px/1366px live-enabled upload/request, wrong candidate, correction/portion, recomputed total, save/history/reload.
- [RAN] UC-02: held live response released after manual correction; corrected rice and 14.7g remain after save/reload. Application tests independently cover late-result rejection.
- [RAN] UC-03: offline persisted meal → glucose value/unit/time/tag → association in detail/week/report. Safety language retains noncausal boundaries.
- [RAN] UC-04: live/sample/manual unknown records, eight-record history after demo reset, preserved user row and thumbnail after reload. Broader multi-time ordering permutations were not separately system-tested.
- [RAN] UC-05: seven seeded days, seven meals/seven readings, each day's 32.8g, demo/real counts, print stylesheet/PDF without horizontal overflow. Partial/unknown aggregation has deterministic domain coverage.
- [RAN] Failures: HTTP 429/503/504/502, malformed success, offline network, invalid/oversize upload, injected IndexedDB write failure; retry/manual path, preserved draft, no sample masquerading as live success.
- [RAN] Offline shell/sample workflow; PWA update protects draft and saved history; /api is not cached.
- [RAN] Mobile/laptop screenshots inspected. Removed SVG text, redundant caption, MockLLM/build labels and prototype footer. Alt text, sample badges, source attribution, unknown-nutrition and medical/privacy wording remain.
- [RAN] Baseline production labels are NFC-correct; Chromium reports one Segoe UI face for all navigation glyphs, no per-glyph fallback. The reported typography defect was not reproduced here. System/local font stack, weight/line-height/no-wrap were hardened; regression asserts single-face rendering and takes screenshots. Other-platform rendering remains UNKNOWN.

## Live provider matrix

[RAN] 15 candidate requests across 12 providers from account-visible catalogs/current official references; one bounded request per model, no 429 retries. `provider-matrix.json` contains command/config/fixture hashes/timestamps. First 12 rows used the original illustration, last three the label-free version. Latencies are single observations at baseline SHA plus harness changes, 15s timeout, meal-candidates-v1, no seed.

| Provider/model | HTTP | Schema / candidates | Observed ms |
| --- | --- | --- | --- |
| Groq qwen/qwen3.8-27b | 200 | valid / 4 | 1902 |
| OpenRouter qwen/qwen3.8-27b:free | 200 headers | invalid; deadline suspected (ledger annotation) | 15021 |
| OpenRouter google/gemma-4-31b-it:free | 404 | unavailable | 486 |
| Mistral mistral-small-2603 | 429 | rate limit | 565 |
| Mistral ministral-14b-2512 | 200 | valid / 8 | 4633 |
| Gemini gemini-3.8-flash | 200 | valid / 3 | 9966 |
| Gemini gemini-2.5-flash | 404 | unavailable | 444 |
| Cohere command-a-vision-07-2025 | 200 | valid / 5 | 6384 |
| NVIDIA meta/llama-3.2-90b-vision-instruct | none | timeout | 15009 |
| HF Qwen/Qwen3.8-27B | 200 | valid / 3 | 1855 |
| SambaNova gemma-4-31B-it | 200 | valid / 3 | 3264 |
| Pollinations openai/gpt-5.4-nano | 402 | billing/access rejection | 1912 |
| Cloudflare llama-3.2-11b-vision-instruct | 403 | authorization rejection | 1146 |
| Cerebras qwen-3.8-27b | 402 | billing/access; modality UNKNOWN | 728 |
| Vercel google/gemma-4-31b-it | 403 | authorization rejection | 1671 |

[READ] `PROVIDER_STRATEGY.md` documents privacy/free-tier sources, inclusion/exclusion decisions and failover matrix. Runtime supports Groq/Mistral/Cohere/OpenRouter plus opt-in Gemini. HF/Samba success does not justify expanding runtime solely for provider count. Credentials stay server-side; normal tests do not consume quotas. [ASSUMED] No card/free accounts per operator, not independently verified.

## Production / Vercel

[RAN] Baseline public client enables live AI but fails before sending the request; direct Function GET returns 500. GitHub deployment reports success, which does not establish Function health. Vercel credential authenticates user API (200), but project/team listings are empty and deployment metadata returns 404. Protected deployment URLs redirect to login.

**BLOCKED pending branch Preview:** hosted build/function logs, server key presence, deployed artifact invocation and real-provider success need access to the owning Vercel project. Local artifact/local real-provider results cannot satisfy hosted checks. Branch deployment outcome will be appended after push/PR.

## Remaining UNKNOWNs / definition of done

- BLOCKED: items 7–8, deployed Preview API and deployed real-provider success, until owning-project deployment/access is available. Production is not claimed fixed; main is not merged.
- UNKNOWN: exact hosted warning/logs/env, hosted Linux behavior, physical camera/install/native print, other-platform font rendering, account quotas/retention controls.
- UNKNOWN: real-photo Vietnamese recognition quality. No representative real-photo dataset exists here; synthetic observations are not accuracy measurements.
- Other definition items are supported by reproductions, passing local suites, provider ledger, UI review, audits and updated README. No schema/data migration, credential rotation, force-push or operator-data deletion occurred.
