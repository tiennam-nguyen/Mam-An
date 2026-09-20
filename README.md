# Mâm An · Prototype v0.1

Vietnamese mobile-first meal journal: React/TypeScript/Vite, Dexie/IndexedDB and an optional stateless AI proxy. No account, backend database or health-history upload.

## Run

Use Node 24 and npm:
```sh
npm ci
npm run dev
```
Open the URL printed by Vite. The sample path needs no API keys:
**Ghi bữa ăn → Dùng bữa ăn mẫu → correct food/portion → Lưu bữa ăn → Thêm số đo → Tuần của tôi → Xem báo cáo**.

**Dữ liệu mẫu** seeds seven days; reset replaces only sample records. For offline reload, first load a production build online and let its service worker install:
```sh
npm run build
npm run preview
```

## AI configuration

Keys belong in ignored `.env.local`, never `.env.example` or a VITE_ variable. The example contains empty keys and model defaults. The operator's supplied keys were moved into the ignored file before verification; they are not committed.

To enable live analysis locally, add `VITE_ENABLE_LIVE_AI=true` to `.env.local`, run `npm run dev:api` in a second terminal, and restart `npm run dev`. The app discloses transmission before sending an image. Vite preserves Host for same-origin checking.

Supported providers and model defaults (discovered and smoke-tested 2026-09-19):

| Provider | Model | Configuration |
| --- | --- | --- |
| Groq | `qwen/qwen3.8-27b` | `GROQ_API_KEY`, `GROQ_VISION_MODEL` |
| Mistral | `ministral-14b-2512` | `MISTRAL_API_KEY`, `MISTRAL_VISION_MODEL` |
| Cohere | `command-a-vision-07-2025` | `COHERE_API_KEY`, `COHERE_VISION_MODEL` |
| OpenRouter | `qwen/qwen3.8-27b:free` | `OPENROUTER_API_KEY`, `OPENROUTER_VISION_MODEL` |
| Gemini (opt-in) | `gemini-3.8-flash` | `GEMINI_API_KEY`, `GEMINI_VISION_MODEL` |

Default `AI_PROVIDER_ORDER=groq,mistral,cohere,openrouter`; missing keys are skipped. Existing explicit orders remain in force. Gemini uses its native API and must be explicitly added to the order; its free tier may use content to improve products. Review service retention terms before sending personal images. OpenRouter keeps `data_collection: deny` and `zdr: true` by default; failures do not loosen these settings.

Provider failures, including stale models and malformed output, try the next configured provider once, within a 25-second total budget. No same-provider retry or automatic sample substitution occurs. The client has a 30-second deadline. User/input failures stop immediately. AI supplies candidate names only; nutrition remains a deterministic local catalog calculation.

`npm run verify:ai` checks configuration without network access. Provider discovery and bounded live tests are separate from CI:

```sh
npm run discover:providers
npm run test:providers -- --provider mistral --model ministral-14b-2512 --timeout 15000
# Optional, one request per candidate; no automatic retries:
npm run test:providers -- --all
```

The default fixture is the bundled synthetic illustration; `--fixture PATH` selects another explicitly authorized image. The [provider matrix](verification/provider-matrix.json) records each request's timestamp, command, commit, fixture hash and outcome without raw responses or keys. See [provider strategy](verification/PROVIDER_STRATEGY.md) for access/privacy limitations. These are connectivity observations, not recognition benchmarks.

Vercel uses `api/v1/analyze-meal.ts` with a [Node Web Standard handler](https://vercel.com/docs/functions/runtimes/node-js). Set `VITE_ENABLE_LIVE_AI=true` **before building**, separately for Preview and Production; set server keys and provider order for the same target, then redeploy. Server imports use emitted `.js` extensions and `api/tsconfig.json` isolates Function compiler types. `npm run preview` serves only static client files, not Functions. Deployed results and access blockers are recorded in the [test report](verification/TEST_REPORT.md).

The branch Preview was verified with a real Groq request on 2026-09-20 (HTTP 200, three candidates, corrected meal persisted after reload). The operator subsequently added all provider keys to Vercel **Production**; their presence was checked without revealing values. The explicit Production/Preview order was updated to `groq,mistral,cohere,openrouter` for the next deployment. Local credentials and Vercel credentials are separate; new keys added only to Production are not automatically available in Preview. Release verification is recorded in the test report.

Production was released from PR #2 and verified at merge commit `807cb39`: real Groq rate-limit → Mistral success, HTTP 200, four candidates, correction/save/reload/glucose/report flow passed. Reproduce the opt-in single-image production check with `node --import tsx scripts/verify-production.ts https://mam-an.vercel.app DEPLOYED_COMMIT`; this consumes one live analysis request and creates only disposable browser-local test data.

## Checks

```sh
npm run typecheck
npm run build
npm test
npm run test:e2e
npm run audit:safety
npm run audit:secrets
npm run catalog:check
npm run verify:ai
```

Chromium must be installed for Playwright (`npx playwright install chromium` if absent). `test:e2e` rebuilds with live UI enabled and runs on an isolated strict port; upstream HTTP is deterministic in that suite. Screenshots, PDFs and failure traces are ignored under `test-results/`. No lint framework is configured; strict TypeScript and focused tests are the current gates.

## Data and limits

[Catalog notes](catalog-src/README.md) document three sourced foods, explicit reference weights and an unknown mixed dish. Unknown nutrition remains null; historical meals retain snapshots. A missing day is not zero intake.

Only a small local thumbnail persists. Original and analysis images are transient. Chromium tests verify thumbnail dimensions, EXIF removal for a synthetic JPEG, reload, offline demo, user-row preservation and print styling.

All health logs remain in this browser. Clearing browser data loses them; no cloud backup exists. An available app update is offered explicitly and cannot reload an unsaved meal or glucose form. Physical camera/install/print behavior and broader food-source reuse still need target-environment checks. The app makes no diagnosis, treatment recommendation or causal meal/glucose claim.

[MAP.md](MAP.md) explains boundaries and decisions; [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) records evidence. Baseline specifications remain unchanged.
