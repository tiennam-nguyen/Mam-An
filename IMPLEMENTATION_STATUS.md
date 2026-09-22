# Mâm An v0.2 implementation handoff

Implementation phase only. Dedicated Unit / Integration / System Testing is still next; this is not production-readiness certification.

## State

- Branch: `codex/v0.2-implementation`.
- [RAN] Fetched `origin/main`: baseline `978fce725d3cec9e417da276868d8c2f8dc36911`.
- Implementation commit: `14ce66066d340d253ceee551a0d22ada2aeaa05f` (subsequent handoff documentation does not change runtime).
- No merge, deployment, history rewrite, production environment edits, credential rotation or live provider benchmark performed.
- Pre-existing untracked SRS/LLD v0.2 and TECTON documents remain untouched and untracked.

## Implemented

- M0: audited actual persistence/runtime; synthetic physical v1 fixture at `tests/fixtures/persisted-v1-meal.json`, captured through the existing serializer.
- M1/M2/M4: MealEntry/MealComponent model; canonical entry editing with deterministic portions, snapshots and atomic saves; schema-v2 migration; catalog roles, household vocabulary, editable phở/cơm templates and provenance build checks.
- M3: pure four-operation simulator; baseline/proposed totals, deltas, completeness, operation summaries, explicit Apply/Discard; no scenario repository or provider call. Applying still requires Save.
- M5: versioned deterministic similarity, explicit linked glucose observations, 30-minute timing buckets, distinct-meal sample counts, four data-quality states, local trace and demo/user isolation.
- M6/M8: versioned tag retrieval, minimized EvidenceBundle, always-available Vietnamese templates, opt-in text generation with bounded transport, strict schema, numeric/evidence/safety validation and fallback. Draft changes cancel stale generation.
- M7: capability routing with bounded ordered candidates, retained hardened adapters, shared v1/v2 vision handler, v2 explanation route, browser-compatible gateway.
- M9/M10/M11: review/simulation/history/detail/weekly integration; selectable seven-day local print report; source/timing display; history filters, favourites and reuse; large-text and glucose preferences; opt-in confirmed browser voice input for names/portions/notes; device adapter type only; offline deterministic flow.

## Actual-repository adaptations and limits

- Actual v1 physical shape is `{id, createdAt, isDemo:0|1, schemaVersion:1, value:Meal}` with camelCase items and a structured thumbnail union, not LLD's illustrative snake_case object. The wrapper/indexes and thumbnail union are retained.
- Each legacy item becomes one entry/component with role OTHER and legacy reference portion. Old estimates, totals, portion labels, correction flags and **actual v1 exclusion flags** are preserved without consulting the catalog.
- v2 entries own edits; `items` is a compatibility projection, validated against entries on persistence. Existing history/summary callers keep working. Glucose retains its independent compatible v1 row wrapper; new readings carry source metadata, old readings infer MANUAL/DEMO locally.
- Migration runs in a Dexie upgrade transaction. A malformed legacy record aborts the upgrade, surfaces MIGRATION_FAILED, blocks affected repositories, and preserves the original v1 rows. No reset shortcut. Demo reset touches demo rows only.
- Repeated observations in the same meal/bucket contribute one per-meal median, preventing frequent testing of one meal from dominating statistics. Zero-carb pairs cannot form a positive ratio and are conservatively unmatched. Thresholds are otherwise unchanged.
- Household bowl/ladle/glass weights are unverified: their nutrition stays null. No new food-composition numbers were invented. Curated knowledge currently explains sourced product rules; richer nutrition content requires reviewed sources.
- Browser SpeechRecognition is the P1 adapter, with explicit activation and transcript confirmation. No cloud speech endpoint/provider is configured. Unsupported browsers hide controls. P2 device/OAuth/cloud sync is not implemented.
- P1 richer retrieval, metric-vocabulary selection and native share-sheet refinements remain deferred. Local print/Save PDF and household controls work without them.
- [ASSUMED] Similarity thresholds, 30-minute buckets and minimum 3 meals are prototype product rules, not medical thresholds or statistical certification.
- [UNKNOWN] Live text-model quality/configuration, provider quota/privacy behavior, physical-device voice/camera/install/print, and deployed v2 Vercel behavior. Existing v1 provider evidence is historical, not v2 certification.
- Numeric/phrase validation is a conservative rejection screen, not proof of semantic safety. Optional text remains disabled by default. Production build emits a >500 kB chunk warning (main bundle about 542 kB / 168 kB gzip); no benchmark was performed.

## Commands and captured outcomes

Windows / Node v24.13.0; existing lockfile-installed dependencies reused (no dependency added; npm ci was not necessary). Restricted sandbox blocks some Node userInfo/git access, so approved elevated commands were used. A previously cached formatter formatted only changed implementation files.

- [RAN] `npm run typecheck` → exit 0 (strict TypeScript).
- [RAN] `npm run catalog:build` → `Catalog generated: 8 foods`.
- [RAN] `npm run build` → `Catalog valid and reproducible`; 190 modules transformed; Vite build success; PWA generated 10 precache entries. Bundle-size warning only.
- [RAN] `npm test -- tests/integration/migration-v2.test.ts tests/integration/persistence.test.ts tests/domain.test.ts tests/session.test.ts tests/state-machine.test.ts tests/simulation-v2.test.ts tests/personal-v2.test.ts tests/explanation-v2.test.ts tests/contract/api-v2.test.ts tests/catalog.test.ts` → **10 files / 80 tests passed** on the final implementation tree.
- [RAN] `npm test -- tests/provider-hardening.test.ts tests/contract/api.test.ts tests/integration/gateway-api.test.ts tests/session.test.ts tests/domain.test.ts` → **5 files / 159 tests passed** at the shared API milestone. Later changes did not modify provider transport/failover.
- [RAN] `npm run test:e2e -- implementation-v2.spec.ts` → build passed; **1 Chromium test passed**: offline sample → discard/apply without persistence → explicit save/reload → glucose → report; zero API calls/page errors and no mobile overflow. Existing broad E2E selectors were adapted to v2; the broad suite was intentionally not run.
- [RAN] `npm exec -- playwright test implementation-v2.spec.ts` → **1 passed (6.8s)** against the final built assets after the catalog-role/scenario-ID fixes.
- [RAN] `npm run audit:safety` → safety inventory and client/server bundle boundary checks passed.
- [RAN] `npm run audit:secrets` → working source, built client and committed template history passed; no secret values printed.
- [RAN] `git diff --check` → no whitespace errors.

## Operation and recovery

Operator runs `npm run dev` and, for explicitly enabled live capabilities, `npm run dev:api`. `.env.example` lists safe configuration names. Text needs both public/server opt-in and an explicit server model; zero providers falls back to local templates. Do not put secrets in VITE variables.

Do not clear IndexedDB on migration failure. Retain the affected browser profile for recovery; tests establish rollback of synthetic v1 fixtures, not recovery of every possible field-corrupted database. After a successful v2 migration, rolling back to a v1 client is not a data recovery mechanism. Validate migration/recovery and target devices in the dedicated testing/release phase before deployment. No ownership, monitoring or production readiness is implied.
