# Implementation status

## Completed

- [RAN] Remote default main verified at a8733e989099950da176733fd2c0a13788c9880f; repository originally contained LICENSE only. Working branch codex/implementation-bootstrap; no merge or history rewrite.
- Deterministic UC-01–UC-05 implemented: validated catalog, review/correction/what-if, atomic snapshots/thumbnails, glucose, history, weekly print report, seed/reset and offline shell.
- Neutral multipart API, bounded image decode, schema/error mapping, Groq/OpenRouter adapters and availability-only failover. MockLLM contract tests are independent of providers.
- [RAN] Initial deterministic milestone committed as 0e8a1f7.
- [RAN] User-supplied keys moved from tracked .env.example to ignored .env.local. Committed template had no nonempty keys. Never printed credentials.

## Verification evidence

- [RAN] npm test: 41 focused tests passed, including the automated Vite proxy regression.
- [RAN] npm run build: catalog reproducibility, strict TypeScript, Vite production build and PWA precache passed in the final run.
- [RAN] npm run test:e2e: 4 Chromium tests passed (offline full loop/no API requests; unknown/reset preservation; uploaded JPEG thumbnail/EXIF/reload; laptop/print layout).
- [RAN] TZ=America/New_York npm test -- tests/domain.test.ts: 20 tests passed, including seven calendar days spanning 167 elapsed hours.
- [RAN] Safety feature inventory and client bundle server-boundary audit passed.
- [RAN] Placeholder configuration check passed without network access.
- [RAN] Local API regression: 403 reproduced; installed Vite source showed string proxy implies changeOrigin:true. Preserving Host and explicitly setting false yielded expected 503 with empty keys.
- [RAN] Screenshots inspected at mobile and laptop sizes and print media. Synthetic JPEG with EXIF yielded 240×160 local thumbnail without EXIF in Chromium.
- [RAN] Authorized live smoke: Groq qwen3.8 returned valid candidates; Groq qwen3.6 returned404; OpenRouter qwen3.8:free returned429; NEX mini:free returned404 with strict privacy. Ledger: verification/live-provider-spike.json.
- Latest steering supersedes earlier MockLLM-only restriction; authenticated smoke performed only after explicit user authorization.

## Commands

npm ci
npm run dev
npm run dev:api
npm run typecheck
npm run build
npm test
npm run test:e2e
npm run catalog:build
npm run catalog:check
npm run audit:safety
npm run audit:secrets
npm run verify:ai

Optional live spike: node --env-file=.env.local --import tsx scripts/spike-ai.ts

No lint command configured. Node tools needed elevation in this Windows sandbox because restricted userInfo failed; .git is also read-only inside the sandbox.

## Assumptions / limits

- [ASSUMED] Image constants: input20MB/40MP; analysis edge1600 JPEG.82; thumbnail edge240/.7. One synthetic fixture verified, not a photo-quality study.
- [ASSUMED] Timeout15s/provider pending representative live images.
- [UNKNOWN] Provider quota stability, account retention controls, OpenRouter privacy-compatible capacity and real-image quality.
- [UNKNOWN] Vercel deployment/HTTPS and physical-phone camera/install/print. Chromium responsive/offline/print is the demonstrated scope.
- [UNKNOWN] Broader food-source reuse rights and household serving equivalence. Three traced reference entries only.
- User-supplied TECTON_v1_Principal_Protocol.md remains untouched/untracked.
- LLD deltas are recorded in MAP.md.

## Next frontier

Target-device rehearsal and optional representative-photo evaluation. These do not block the deterministic demo.

## Final gates

- [RAN] Final full unit/integration/contract suite: 41 passed across 7 files.
- [RAN] Final browser suite: 4 passed. Strict typecheck, production build, catalog, credential and safety audits passed.
- [RAN] Baseline specifications show no changes from their preserved commit.

## Handoff state
- Final implementation commit: efdf638; subsequent local-only regression-file line-ending cleanup.
- Automatic approval review blocked pushing codex/implementation-bootstrap to origin, requiring explicit user destination approval. No push occurred in that attempt.
- Keys remain in ignored .env.local. Main remains unchanged.

- User explicitly approved the exact branch push to https://github.com/tiennam-nguyen/Mam-An.git after the review block.

## v0.2 implementation (active)
- Baseline: origin/main 978fce725d3cec9e417da276868d8c2f8dc36911; branch codex/v0.2-implementation.
- [READ] M0: physical meals are {id, createdAt, isDemo:0|1, schemaVersion:1, value:Meal}; value uses camelCase flat items and structured thumbnail references. Glucose has a separate v1 wrapper; settings use key/value. Atomic save covers meal + thumbnail. Demo reset filters demo rows.
- [RAN] Baseline npm run typecheck passed. Captured tests/fixtures/persisted-v1-meal.json using v1 demoData + toMealRow (synthetic, no personal history).
- Migration adaptation: retain wrapper/indexes and thumbnail union, transform each item into one entry/component; preserve includedInTotal as well as all persisted numbers (actual v1 supports exclusion). No catalog lookup during migration. Dexie upgrade transaction must abort on malformed data.
- Plan: component/save skeleton + migration; portion/templates; simulation; personal evidence; local knowledge/explanation; capability/API v2; review/weekly/report and P1 adapters; focused checks + build + review PR. No deploy/merge.
- User-provided v0.2 specs and TECTON file pre-existed untracked; preserve them.
