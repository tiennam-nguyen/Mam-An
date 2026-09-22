# Mâm An v0.2 hardening verification

## Revision and scope

- Branch: `codex/v0.2-testing-hardening`; base: `385d0b371eb492d65d2af1f61e2a4f921581850a` (`codex/v0.2-implementation`).
- Tested source revision and exact command timestamps: [final-runs.json](final-runs.json). The final evidence commit changes verification artifacts only.
- Final tested source: `cda3ca11da65a55d9e66fff9fe5d7039dcf9a8a9`, 2026-09-22; clean tracked working tree (empty-diff SHA-256 recorded in the manifest).
- Environment: Windows 10.0.26200, Node 24.13.0, npm 11.6.2; Chromium via Playwright 1.63.0. Fresh test databases/browser contexts, synthetic records only.
- Captured text artifacts use normalized LF line endings and trimmed trailing whitespace; substantive command output is retained.
- No merge, production deployment, provider-key change, or real health-data mutation. The three user-supplied specification/protocol files remain untouched and untracked.

## Confirmed defects and regression evidence

| Defect / reproduction | Mechanism and prediction | Fix and independent check |
|---|---|---|
| Duplicate baseline entry/component IDs accepted by scenario operations | First matching ID silently selects an ambiguous target; reject duplicates before projection | `createScenario` validates both ID sets. `hardening-regressions.test.ts`; [before](logs/regressions-before.txt), [after](logs/domain-migration-after.txt) |
| Duplicate v1 item IDs committed an unreadable v2 database | Legacy shape validation did not enforce new snapshot invariants; validate the completed snapshot inside the upgrade transaction to prevent commit | `migrateV1Meal` calls `parseMeal`. Physical v1 rollback/reopen and browser upgrade tests; [before](logs/migration-before-fix.txt), [after](logs/domain-migration-after.txt) |
| Ungrounded percentages accepted when the same number existed as carb; clinical phrases and uppercase Đ bypassed screening | Number-only matching loses units; lowercase after replacing đ misses uppercase Đ | Normalize case first; require percentage-valued knowledge evidence for percent claims; extend bounded clinical phrase rejection. Benign Vietnamese remains accepted. [before](logs/regressions-before.txt), [additional adversarial before](logs/adversarial-before.txt); `explanation-adversarial.test.ts` |
| Empty/whitespace voice transcript accepted | Non-null was treated as usable speech; trim and reject empty content | Adapter tests cover result/error/end/cancel/deadline/start failure, and browser tests require explicit confirmation |
| Favourite write failure invisible | Detail page discarded the failed settings Result | Visible error and successful retry clear it. [browser reproduction](logs/e2e-hardening-first.txt); `hardening.spec.ts` |
| Navigation overflows at 320 px with large text | Non-wrapping flex navigation exceeds viewport; allow row wrapping | [element geometry reproduction](logs/layout-diagnosis.txt); all-route 320/390/1366 px checks and screenshots |
| Deployed AI functions fail at startup | Server schema imports `mealEntry`, whose transitive runtime import omitted `.js`. Source runners resolve it, Node ESM in the emitted function does not | Explicit `.js` runtime import. [Preview failure](preview-before.json), [independent emitted failure](logs/emitted-before.txt), [v1](logs/emitted-after-v1.txt), [v2 vision](logs/emitted-after-v2-vision.txt), [v2 text](logs/emitted-after-v2-text.txt) |

Test-instrument corrections were separate from product fixes: old broad text locators matched newly added explanation/component text; tests now identify the exact saved total. Native select controls use their accessible combobox role. Asynchronous persisted checkboxes are clicked and then polled for the checked state. A deliberately closed Dexie instance was replaced with a fresh instance for reopen testing. No expected behaviour was relaxed.

## Automated evidence

Run `npm run verify:v2` for the complete reproducible command sequence. Every command has its own log and exit status in `final-runs.json`: clean install, typecheck, catalog reproducibility, all Vitest tests, production build, all maintained and new E2E suites, safety audit, secret audit, whitespace check, and focused tests under both `Asia/Ho_Chi_Minh` and `America/New_York`.

[RAN] Final result: **373 tests in 22 suites passed**: 275 unit tests, 47 contract tests and 51 integration tests. **48 Playwright tests passed** in the full browser suite. All 11 verification commands exited 0. Per-suite counts: [test-counts.json](test-counts.json). Final native emitted-function checks also passed for [v1](logs/emitted-final-v1.txt), [v2 vision](logs/emitted-final-v2-vision.txt), and [v2 text](logs/emitted-final-v2-text.txt).

Domain checks cover component roles, independent carb/kcal, unknown/zero/excluded/partial/empty, fractional/large/invalid portions, all four scenario operations, deep isolation, stale targets, similarity thresholds and ordering, glucose timing boundaries, per-meal weighting, closest premeal selection, minimum distinct samples, all four evidence states, retrieval ranking/provenance, minimized runtime serialization, schema/ref/numeric/safety validation, and optional voice lifecycle.

Integration checks cross actual Dexie repositories and use cases, settings/favourites persistence, selected weekly periods and USER/DEMO isolation. Real `HttpAiGateway → handler → decoder/router → provider adapter/parser` seams exercise v1/v2 vision and text with only upstream HTTP substituted. Provider failure matrices remain maintained. `AbortSignal.any` is unavailable in the browser seam test and throwing in the gateway test.

## Migration and recovery

[RAN] Actual Dexie v1 upgrades cover empty, known, unknown, multiple, mixed demo/user, null/bundled/blob thumbnail, excluded/corrected flags, fractional and unusually large historical quantities, exact historical totals, linked glucose, settings, and repeated v2 opens. The test deliberately preserves historical totals that differ from current catalog recomputation.

[RAN] Malformed row mappings, invalid quantities, duplicate IDs, and malformed glucose abort the transaction. Tests read all physical tables afterward, verify version 1 remains, then repeat the failing upgrade with a fresh connection. Corrupt v2 compatibility projections return a storage error without deleting records. Browser tests seed physical IndexedDB version 10 (Dexie v1), then verify success at version 20 or preserved failure at version 10.

Recovery limit: there is no automatic repair of malformed historical records and no production data export/backup feature. The UI tells the operator not to clear application data. Preserve the affected browser profile; investigate/export with explicit operator authorization before repair. Tests establish transaction rollback in these environments, not recovery from damaged storage hardware or browser data eviction.

## Production-browser scenario matrix

| Mission | Maintained evidence |
|---|---|
| S1 offline four-operation scenario, Discard/Apply, explicit Save | `implementation-v2.spec.ts`: zero persisted meals until Save; corrected total survives reload |
| S2 real browser-to-API vision | `real-api.spec.ts`: production client and actual local API/router/adapter; synthetic upstream HTTP only |
| S3/S4 v1 migration success/failure | `hardening.spec.ts`: physical old database and all-row preservation after retry |
| S5/S6 personal sufficient/sparse/noncomparable/no-data | Seeded real records beside abundant demo records; independent expected statistics/copy |
| S7 local explanation and fallback | Offline suite plus invalid-number/ref/clinical/malformed/unavailable/deadline browser cases |
| S8 generated explanation and races | Valid output plus A finishing after edit/B, navigation, Apply, Discard, cancel |
| S9 favourites/reuse | Persist/reload, original unchanged, new ID, favourite filter, failed-write retry |
| S10 glucose/week/report | Linked records, selected period empty/nonempty, print output and source/demo labels |
| S11 mobile/large text | All routes at 320/390/1366 px, persisted large text, review/simulation/detail checks |
| S12 PWA/offline | SW install and offline reload, no API cache, waiting update blocked during meal/scenario/glucose edits |
| S13 old client/API compatibility | Real v1 gateway, actual v1 local API, emitted v1 function startup/POST |
| S14 voice | Explicit start, transcript confirmation, discard, stop, empty/error, unsupported hidden; ordinary text still editable |

Every maintained browser suite uses the shared fixture to fail on unhandled page errors, unexpected console errors, and final viewport overflow. Expected failed-network resource messages are accepted only when correlated with a failed URL. Route sweeps additionally inspect element geometry. Browser contexts are test-local. Native installation, camera and speech services are not inferred from these runs.

## Product, privacy, and bundle review

[READ/RAN] Removed internal knowledge/catalog version strings from product copy, retained source labels and immutable stored provenance. Removed the unexplained disabled week date input; period selection remains in the report. Added actionable favourite-save feedback and wrapping navigation. Kept demo transparency, unknown nutrition, uncertainty, source details, privacy disclosure, historical snapshots, v1 compatibility, migration safeguards, and PWA guards. No blanket source-code removal or new dependencies.

[READ] Source/asset sweep found no debug controls, console logging, or raw rule enums in feature UI. Structured provider-attempt logs stay on the server and contain operational metadata, not image bytes, notes, or health histories. Source reference identifiers remain inside the explicit provenance disclosure. The bundled SVG has no developer text; no imagery was replaced.

[RAN] Secret audit checks working source, built client, local-key equality, credential-like patterns, and committed environment-template history without printing secret values. Explanation transport is an explicit projection and tested at runtime for exclusion of notes, raw observations, IDs and images. Fetch/API responses use no-store and service-worker caches contain no API entries.

[READ/RAN] Cheap bundle inspection: 544.73 kB main JS / 167.93 kB gzip, existing >500 kB warning retained. Browser build excludes server provider URLs/keys; no duplicate server SDK was added. No speculative chunking or dependency rewrite. The warning is not a measured performance failure or a speed guarantee.

## Screenshot-driven UI/UX follow-up

[RAN/READ] Captured and visually inspected mobile/desktop flows. The review form exposed duplicate single-item headings and long stacks of low-frequency fields; Save was below the long form. Matched-food correction fields now use a disclosure, unknown-food fields remain open, ordinary single-item headings follow name corrections, and mobile Save retains a visible running total. Portion labels use Vietnamese decimal commas. No nutrition assumptions were added.

[RAN/READ] The simulation comparison inherited a grid rule that left the before card half-width on phones. A dedicated responsive grid now uses full-width mobile cards and balanced desktop columns. Apply/Discard remain accessible at the bottom on mobile; the unchanged state explains what to do instead of displaying unknown values with gram units. Empty timing disclosures, repeated headings and malformed unknown-nutrition sentences were removed. Native checkboxes no longer inherit full-width text-input styling.

[RAN] Weekly patterns previously rendered multiple identical cards for repeated meals. Deduplication uses meal signature plus USER/DEMO mode before selecting representative cards; per-meal statistics still use all eligible records. The integration regression checks that identical meals within each mode produce one card per mode. Cards now identify the represented foods.

Screenshot evidence: [mobile review](screenshots/ux-review-390.png), [desktop review](screenshots/ux-review-1366.png), [mobile comparison](screenshots/ux-simulation-390.png), [desktop comparison](screenshots/ux-simulation-1366.png), [settings](screenshots/ux-settings-390.png), [weekly report](screenshots/ux-report-390.png). Preserved comparisons: [old comparison layout](screenshots/ux-before-simulation-390.png), [old duplicate report cards](screenshots/ux-before-report-390.png). The `ux-review.spec.ts` workflows regenerate final screenshots, verify corrected headings and mobile Save visibility. Large-text route checks cover 320/390/1366 px; this is browser emulation, not physical-device testing.

## Hosted Preview

See `preview-before.json` for the reproduced startup failure and `preview-final.json` for final deployment identity, route startup and the bounded synthetic live result. No configuration or protection changes. The first failed request stopped before a provider; the retry checks connectivity, not recognition accuracy or clinical usefulness.

[RAN] Preview `dpl_CrH3xnzRcsPXjNMv7UCcEHnmTKpc`, source `cda3ca1`: v2 vision POST **200**, Groq provider event **OK**, 1486 ms provider latency; UI reached editable review. V1 and v2 text GETs returned expected **405** in deployment logs, confirming startup. Optional live text generation was not offered in this Preview and was not enabled; local template and deterministic text seams were verified.

## Remaining UNKNOWNs and operator checklist

- Physical Android Chrome, iOS Safari and embedded WebView: upload a synthetic fixture, correct/save/reload, try four scenario operations, enlarge text, enter glucose, view/print report, install PWA where supported, then reload offline. Record device/OS/browser versions and console errors. No physical-device PASS is claimed.
- Real camera, real microphone recognition/permissions and native print/install UI remain untested. Browser speech may use an online service; transcription requires user confirmation.
- Clinical language screening is a finite schema/number/phrase safeguard. It cannot prove semantic medical safety or catch every paraphrase. False negatives/positives remain possible; deterministic templates are the fallback.
- Real-photo recognition quality, provider availability over time, and performance on low-end phones remain unmeasured. A synthetic live call is a connectivity observation only.
- Mobile API review found guarded optional speech, caught image-decode failures and no `AbortSignal.any` dependency. Secure-context `crypto.randomUUID`, canvas, IndexedDB and service workers still depend on supported browser versions. No speculative polyfills were added.

Operational ownership remains with the repository/operator; no monitoring or backup service was invented. Promotion and merge require the operator's separate decision. If an AI regression occurs, keep the local/manual path available and disable the optional capability through existing configuration; do not downgrade or erase upgraded user databases.
