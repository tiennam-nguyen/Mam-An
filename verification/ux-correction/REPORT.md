# v0.2 UX correction verification

## Revision and scope

- Base: fetched `origin/main`, `113a97ddd9fd3c6a6a654cd813a710730630a852`.
- Source: `fb2b796f65db8e27270c4838f73d178f920731df`, branch `codex/v0.2-ux-correction`.
- Evidence dates: 2026-09-26/27. Windows 10.0.26200, Node 24.13.0, npm 11.6.2, Playwright Chromium 153.0.8010.12. See [final-runs.json](final-runs.json) and [browser.json](after/browser.json).
- No schema migration, historical-data rewrite, nutrition/catalog expansion, provider change, new dependency, merge or Production deployment. User specification files remain untracked and untouched. Earlier `verification/v0.2` artifacts are preserved.
- The attachment contained the mission text, but not the five referenced operator screenshots. The described defects were reproduced locally; exact operator-device comparison remains unavailable.

## Confirmed mechanisms and checks

| Defect | Evidence and prediction | Correction / independent check |
|---|---|---|
| Detached Vietnamese accents | [RAN] NFC text and exact codepoints were intact. CDP reported mixed Georgia/Times New Roman within “Thiết lập” and “Tuần của tôi”; navigation used Segoe UI. Prediction: a consistent system face should remove the visible separation without changing text. | [RAN/READ] System typography renders attached accents in normal/large screenshots at 320/390/1366 px. Per-character probes identify fallback for multiple tone-marked glyphs under the old stack. Both NFC and NFD sentence probes reproduce the old defect and render naturally with the system stack, including with normal tracking. No production per-character spans, inserted spaces or font download. |
| Editor overwhelms ordinary review | [READ/RAN] Matched components exposed portion-unit selects and multiple layers of controls; all components of a dish expanded. Mapping a reference food also overwrote the recorded name. | Default cards retain name, carb/unknown state, explicit portion basis and chips. “Chỉnh món này” contains advanced controls, source information and contextual voice. Multi-component summaries start compact; only the first item needing correction opens automatically. Reference mapping leaves the user name unchanged. Tests cover mapping, custom unknowns, instant totals, add/remove, confirmation and save/reload. |
| Extreme/new glucose accepted | [RAN] Four initial regressions failed because finite-positive validation accepted 1e9, 1e308, excessive precision and an oversized mmol/L entry. `Number(value)` also accepted exponent syntax. | One unit-aware numeric policy is shared by domain/use case, presentation and observation eligibility. Complete-string parsing runs before conversion; pasted text is checked before browser newline stripping. Invalid UI submissions and direct use-case calls cannot write. |
| Historical value overflows | [RAN] A preserved 1e308 reading expanded a 390 px meal page to 3329 px; the weekly table required horizontal scrolling. | “Giá trị cần kiểm tra” keeps the raw value behind an explicit disclosure, wraps safely and states exclusion from summaries. Mobile report rows have labeled vertical fields. Reload and physical repository checks prove the original number remains unchanged; derived personal statistics include only eligible readings. |
| Forward navigation starts halfway down | [READ/RAN] Choosing the sample from a scrolled new-meal page left review at the old scroll offset (observed in viewport screenshots). | Forward/replacement pathname navigation resets scroll and focuses the main content. Browser POP navigation is left alone. Browser regression asserts top position and keyboard focus. |
| Large-text / touch details | [RAN/READ] Fixed -60 px skip-link hiding exposed part of the link when its text grew. Navigation/checkbox targets were smaller than the intended touch area. | Relative translation fully hides the skip link until focus; keyboard test verifies access. Navigation and settings checkbox labels have at least 44 px height. Save remains in the phone viewport; content remains reachable by scrolling. |

The full-word actual-font measurements are in [before/typography.json](before/typography.json) and [after/typography.json](after/typography.json); [per-glyph results](after/glyph-fonts.json) and [font comparison](after/font-comparison.png) separately characterize the old/new stacks. Computed `font-family` alone was not used as evidence of glyph selection. These observations support the font-selection/shaping diagnosis in this Windows Chromium environment; they do not establish universal device coverage.

## Numerical contract

[READ] SRS-FR-009 previously required positive numeric values, supported units and valid timestamps, without precision bounds. The new mission explicitly adds entry/data-quality constraints:

- New mmol/L entries: **0.1–99.9**, at most one decimal; either comma or dot is a decimal separator, never a thousands separator.
- New mg/dL entries: **1–999**, integer digits only.
- These are bounded entry formats (two integer digits plus one decimal, or three integer digits), **not medical targets or diagnostic thresholds**. They reject likely entry errors without interpreting health status.
- Reject empty/whitespace, signs, zero, non-finite values, exponent notation, mixed separators, invalid characters, excess digits/precision and multiline paste. Unit changes clear the unconverted input and explain re-entry. Timing tags default to “Chưa chọn”, not an assumed after-meal measurement.
- No `Math.ceil`, clamping or storage rounding. Accepted values retain their original numeric value/unit. Display uses at most one decimal for mmol/L and integers for mg/dL. Since JavaScript numbers do not retain lexical spelling, a direct numeric `1e2` is indistinguishable from numeric `100`; exponent *text* is rejected at the string boundary, while direct numeric values receive the shared bounds/precision checks.
- The existing broad persistence schema remains unchanged so finite-positive historical extreme or overprecise measurements can still be read. Such records stay visible, keep their original value, and are excluded from personal-response observations/statistics by the same policy. Weekly “readings entered” counts still include them. Structurally corrupt rows retain the existing storage-error behavior; this task adds no automatic repair or history editor.

[RAN] Integration tests reopen actual Dexie repositories, retain 1e308 and 6.123456789 exactly, reject an invalid new use-case write, preserve an accepted 6.7, and verify independent expected observation IDs and median. Browser tests separately seed old persisted values, inspect detail/report at all three widths, expand the raw-value disclosure and verify unchanged storage after reload.

## Visual evidence

| Flow | Before | After |
|---|---|---|
| Settings / “Thiết lập” | [390 px](before/-settings-390-false.png) | [390 px](after/-settings-390-false.png), [320 px large](after/-settings-320-true.png) |
| “Tuần của tôi” | [390 px](before/-weekly-390-false.png) | [390 px](after/-weekly-390-false.png) |
| Meal review | [390 px](before/review-390-false.png) | [390 px viewport](after/review-viewport-390-false.png), [320 px large](after/review-viewport-320-true.png), [desktop](after/review-viewport-1366-false.png) |
| Multi-component dish | Expanded state identified in source and baseline review | [Correction overview](after/multi-component-390.png) |
| Glucose entry | [390 px](before/-glucose-new-390-false.png) | [390 px](after/-glucose-new-390-false.png) |
| Extreme historical value | [Detail](before/extreme-detail-390.png), [report](before/extreme-report-390.png) | [Detail](after/extreme-detail-390.png), [320 px report](after/extreme-report-320.png) |

[RAN/READ] The screenshot walkthrough covers review → simulation/Discard → save/reload → linked glucose → history → report at 320/390/1366 px, normal/large text. Maintained suites also cover simulation Apply and all four operations, upload/live seams, offline/PWA, voice confirmation and failure paths. New typography pixel baselines cover headings/navigation on Windows; other platforms still run geometry/font/workflow checks but need their own visual review. Snapshot baselines were visually reviewed and final verification runs without `--update-snapshots`.

## Final checks and limits

[RAN] **406 tests / 24 suites passed** (307 unit, 47 contract, 52 integration); **56 maintained/new E2E tests passed**. `npm run typecheck`, `npm run test`, `npm run build` (including catalog validation), `npm run test:e2e`, `npm run audit:safety`, and `npm run audit:secrets` all exited 0 on the source revision above. The final evidence commit changes verification artifacts only. The working/staged whitespace checks passed after normalizing artifact line endings.

[RAN] The GitHub commit status reports the branch Preview deployment completed: [deployment dashboard](https://vercel.com/ronnie-nguyens-projects/mam-an/Aoz5VZHTjdK7He9wY1rxAdSVCFgP). This records deployment status, not an additional hosted live-provider or physical-device test. Production-browser verification above ran against the locally built application.

Final command exit codes, exact revision and timestamps are recorded in [final-runs.json](final-runs.json). Logs retain actual outputs; line endings/trailing whitespace are normalized for repository storage. Initial failing reproductions and test-instrument corrections are retained separately. Native-select tests use accessible combobox roles; asynchronous settings changes are clicked and polled; the newly collapsed add-food picker is explicitly opened. Existing behavioral assertions were retained.

No physical Android/iOS/WebView session was available. Camera/microphone permission UI, native keyboard behavior, browser-back restoration across every platform, and operator-specific font installations remain **UNKNOWN**. The numeric limits are a documented product data-entry policy, not a claim about medical measurement ranges. The existing large JavaScript bundle warning remains; no new speed claim is made. No live provider reevaluation was needed for these local UI/domain changes.

Operator device smoke check: open this branch's Preview (not an older immutable deployment); inspect “Thiết lập” and “Tuần của tôi”; try normal/large text, custom-food correction, portion adjustment, save/reload, comma-decimal input and exponent rejection, then the linked report. Preserve existing device data. No repair/deletion is required to review a flagged historical measurement.
