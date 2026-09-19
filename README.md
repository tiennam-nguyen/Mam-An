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

Default models:
- Groq `qwen/qwen3.8-27b`: one synthetic-image smoke returned schema-valid candidates.
- OpenRouter `qwen/qwen3.8-27b:free`: smoke returned HTTP 429.
- Also checked Groq `qwen/qwen3.6-27b` and OpenRouter `nex-agi/nex-n2.5-mini:free`; both returned HTTP 404.

See [live spike ledger](verification/live-provider-spike.json) for exact command, commit, fixture hash, prompt/config and outcomes. These are single-request observations, not recognition benchmarks. Model listings: [Groq vision docs](https://console.groq.com/docs/vision), [OpenRouter catalog](https://openrouter.ai/api/v1/models), checked 2026-09-19.

OpenRouter retains `data_collection: deny` and `zdr: true`; failures never loosen them. Groq account retention controls and real-photo quality remain operator review items. Sample/MockLLM mode never silently replaces a live result.

`npm run verify:ai` validates configuration without a network request. Explicit live smoke command:
```sh
node --env-file=.env.local --import tsx scripts/spike-ai.ts
```
It sends only a bundled synthetic illustration. Keys and raw provider bodies are not logged.

Vercel uses `api/v1/analyze-meal.ts` with a [Node Web Standard handler](https://vercel.com/docs/functions/runtimes/node-js). Deployment has not been performed. Preview serves only the client; local API requests use the dev server.

## Checks

```sh
npm run typecheck
npm run build
npm test
npm run test:e2e
npm run audit:safety
npm run audit:secrets
npm run verify:ai
```

Chromium must be installed for Playwright (`npx playwright install chromium` if absent). Screenshots, PDFs and failure traces are ignored under `test-results/`. No lint framework is configured; strict TypeScript and focused tests are the current gates.

## Data and limits

[Catalog notes](catalog-src/README.md) document three sourced foods, explicit reference weights and an unknown mixed dish. Unknown nutrition remains null; historical meals retain snapshots. A missing day is not zero intake.

Only a small local thumbnail persists. Original and analysis images are transient. Chromium tests verify thumbnail dimensions, EXIF removal for a synthetic JPEG, reload, offline demo, user-row preservation and print styling.

All health logs remain in this browser. Clearing browser data loses them; no cloud backup exists. Physical camera/install/print behavior, deployment and broader food-source reuse still need target-environment checks. The app makes no diagnosis, treatment recommendation or causal meal/glucose claim.

[MAP.md](MAP.md) explains boundaries and decisions; [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) records evidence. Baseline specifications remain unchanged.
