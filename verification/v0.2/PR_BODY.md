Mâm An v0.2 could commit malformed legacy snapshots, accept ambiguous scenario IDs and unsupported percentage claims, and fail to start its deployed AI functions. This hardening validates migrated snapshots inside the transaction, rejects duplicate targets, strengthens evidence/voice handling, and fixes the transitive Node ESM import. Favourite failures now have visible recovery feedback.

Screenshot review also found crowded meal editing, inaccessible mobile save controls, a broken phone comparison grid and duplicate weekly pattern cards. The revised flows keep correction and nutrition uncertainty explicit while making Save/Apply accessible and reports easier to scan. No new dependencies or production/configuration changes.

Verification on `cda3ca11da65a55d9e66fff9fe5d7039dcf9a8a9`:

- `npm run verify:v2`: all 11 commands passed, including clean install, typecheck, catalog, build, audits and two timezone runs.
- 373 tests passed: 275 unit, 47 contract, 51 integration; full Playwright suite: 48 passed.
- Real Dexie upgrades and physical transaction rollback/retry verified; v1/v2 gateway/handler/router/adapter seams exercised with only upstream HTTP substituted.
- Native emitted Vercel functions verified. Final Preview v2 vision returned HTTP 200 / Groq OK for one synthetic image; v1 and v2 text startup returned expected 405.
- Final mobile/desktop screenshots and logs are in `verification/v0.2/TEST_REPORT.md`. The evidence commit adds artifacts only.

Physical mobile devices, real camera/microphone, native install/print, live text generation, real-photo accuracy and sustained provider availability remain unverified. Clinical screening is bounded and does not establish clinical safety. The existing 544.73 kB bundle warning remains. No merge or Production deployment is included.
