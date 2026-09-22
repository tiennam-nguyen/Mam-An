# v0.2 verification inventory

Historical planning snapshot. The gaps below were the starting inventory, not outstanding work. Final completion evidence, command results, fixes and precisely scoped UNKNOWNs are in [TEST_REPORT.md](TEST_REPORT.md) and [final-runs.json](final-runs.json), tested on `cda3ca11da65a55d9e66fff9fe5d7039dcf9a8a9` (2026-09-22).

Base: origin/codex/v0.2-implementation 385d0b371eb492d65d2af1f61e2a4f921581850a; runtime parent 14ce66066d340d253ceee551a0d22ada2aeaa05f. Hardening branch starts at the implementation HEAD. Windows 10.0.26200, Node 24.13.0, npm 11.6.2. User specifications remain untouched/untracked.

| Requirement | Implementation | Existing tests | Missing / planned layer |
|---|---|---|---|
| Nutrition, components, portions, snapshots | mealEntry, nutritionCalculator, snapshotBuilder, portionResolver | domain, simulation-v2 | component/exclusion/zero/precision/unit table; unit |
| Migration and projection | mamAnDb, migrateV1, persistenceSchemas | migration-v2, persistence | excluded/corrected/blob/glucose/unusual/reopen/failure physical rows; integration + browser |
| Four scenario operations, lifecycle | decisionSimulator, AnalysisSessionService | simulation-v2, session | individual/composed ops, duplicate/stale/deep mutation, no writes; unit + system |
| Signature, similarity thresholds/isolation | personalResponse, getPersonalResponse | personal-v2 | all boundary ratios/overlap/zero/order, repository mode filtering; unit/integration |
| Glucose, distinct counts, states | personalResponse | personal-v2 | timing boundaries, per-meal median weighting, premeal source, all state edges, TZ; unit/system |
| Retrieval, templates, minimization | explanation | explanation-v2 | tie/tag/limit matrix, serialized realistic private fixture, every fallback state; unit/integration |
| Generated numeric/safety evidence | explanation, explanationSchemas | explanation-v2, api-v2 | numeric formatting/percent/ranges, benign/adversarial Vietnamese, strict refs/schema; unit/contract |
| Stale AI and cancellation | HttpAiGateway, MealEvidence, AnalysisSessionService | session, gateway-api, live.spec | explanation late response/edit/apply/discard/navigation; system |
| Capabilities and v1/v2 API | CapabilityRouter, handlers, adapters | provider-hardening, api, api-v2, gateway-api | capability matrix, v2 multipart/JSON edge matrix, real v2 seam; unit/contract/integration |
| History/favourite/reuse/settings | repositories, session, history/detail/settings | persistence, implementation-v2 | persistent favourite/reuse isolation + failure, settings reload; integration/system |
| Weekly/report and time | weeklyAggregator, getWeeklySummary, WeeklyPage | domain, demo.spec | selected period, mixed data, personal states, midnight/DST; integration/system |
| Voice optional adapter | browserVoiceInput, VoiceInput | none | mocked transcript/confirm/cancel/error/empty/unsupported; unit/system |
| PWA/offline/mobile | PwaUpdateNotice, vite config | demo, implementation-v2, pwa-update | simulation/glucose update guard, all routes large text/narrow, API cache, runtime errors; system |
| Product residue/security | features/assets, audits, built bundle | audit scripts | rendered route sweep, duplicated copy/internal labels, accessibility smoke, bundle inspection |
| Hosted/live | Vercel Preview and v2 routes | historical v1 only | current Preview startup and bounded synthetic live request, configuration permitting |

Work order: baseline clean install/typecheck/catalog/unit+integration; deepen load-bearing tests and reproduce defects; full production system suite; fixes/cleanup; final commit with full required runs; hosted/live checks; evidence + PR to implementation branch. Never clear real browser profiles or deploy Production.
