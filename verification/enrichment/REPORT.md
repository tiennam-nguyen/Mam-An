# Catalog, portions, evidence and report enrichment

Branch: `codex/catalog-portion-report-enrichment`. Base: freshly fetched `origin/main` `904de0f`. No merge or production deployment.

## Result

Catalog: **8 → 34 foods; 3 → 29 with known nutrition; 12 → 98 units**. The 98 units comprise 58 verified mass/reference identities, 31 estimated source-based household/volume conversions and 9 description-only units. Catalog version `v3-2026-10-02`; persistence schema remains v2.

Added brown/sticky rice, cooked rice/egg noodles, plain French bread, potato/sweet potato/corn/kidney beans, banana/mango/papaya/watermelon/orange, plain whole milk/yogurt, unsweetened green tea/regular cola, sugar/shoyu, roasted chicken breast/firm tofu, boiled cabbage/bok choy/carrot and raw red tomato. Preparation-specific labels and aliases avoid mapping whole Vietnamese recipes to foreign basic-food records.

Exact sources, licenses, transformations, download URL and reproduction commands: [SOURCES.md](SOURCES.md). Every USDA record's original FDC identity, nutrient row IDs, values, portion row and input SHA256 are in `catalog-src/usda-curated.json`; the original three ASEAN locators remain in `catalog-src/foods.csv`. Vietnamese 2007 table access/reuse and Vietnamese mixed-recipe equivalences remain unresolved; no values invented for them. GI/GL remain unknown.

Known nutrition has quantified reference amount/unit, food state, edible portion, available-carbohydrate definition, source energy definition and provenance. Household defaults are separate from the reference basis. The shared portion editor exposes food-specific chips, estimated-weight notice and optional g/ml input. Unsupported quantities use reserved description units and calculate UNKNOWN. Normal users no longer select component roles; catalog role precedes template/AI fallback.

Personal observations show eligible range and premeal delta, distinct-meal count, timing, caveats and inspectable meal links. Existing similarity, minimum-sample and demo isolation rules remain. Simulation queries history for its resulting entries. No clinical thresholds, risk colors, causal claims or forecasts added.

The deterministic weekly report builder joins exact saved meal IDs, assigns chronological M references (ID breaks time ties), resolves outside-period meal context without adding it to totals, preserves original glucose units and saved nutrition, and reports missing/unlinked states. The UI includes meal detail links, self-contained printed meal context, counts/completeness/timing narrative and frequency among logged meals only. Representative pattern cards prioritize the largest comparable sample. Demo has seven varied menus, ten readings, linked/unlinked states, three comparable before/after pairs, sparse cases and partial nutrition.

## Verification and limits

[RAN] Verification milestone: 436 unit/integration tests passed across 26 files; all 58 browser tests passed; six focused demo/enrichment browser tests and the separate mobile/desktop visual run passed. `npm ci`, `npm run typecheck`, `npm run catalog:build`, `npm run catalog:check`, `npm test`, `npm run build`, `npm run test:e2e`, `npm run audit:safety`, `npm run audit:secrets`, and `git diff --check` completed successfully. These commands are repeated after this verification record is committed; the final handoff and PR identify that final SHA and results. Local command outputs are retained as ignored `check-*.log` files alongside this report.

Initial browser failures were outdated assumptions about 100 g defaults and identical demo menus; tests now use independently calculated source arithmetic (158 g rice = 46.452 g available carbohydrate). Final empty-report wording also avoids presenting 0/0 completeness; a dedicated unit regression verifies missing data stays null.

[READ] Inspected final 390 px review/unknown screenshots, large-text report/evidence viewports, desktop report and all four rendered A4 PDF pages. The print fixes remove excess spacing, orphaned badges, decimal-comma truncation and tinted page background. Browser assertions also cover 320/390/1366 large-text widths and no horizontal overflow.

Remaining bounds: food composition and household masses do not establish a user's actual serving or clinical accuracy; only recorded components count. USDA available carbohydrate is an explicit total-minus-fiber derivation. ASEAN noncommercial acknowledgement restriction remains; commercial redistribution needs review. No live provider accuracy benchmark, production deployment, clinician validation or new monitoring was performed. Build may report a >500 kB bundle advisory.

Clean install reports one low-severity existing transitive build-tool advisory: `serialize-javascript@7.1.1`, via `vite-plugin-pwa → workbox-build → @rollup/plugin-terser`, GHSA-gfhx-hw2g-v5hg. No dependency or lockfile changes are included. The safety audit checks feature/client boundaries, and the secret audit checks credentials; neither claims a dependency-vulnerability-free tree.

## Maintenance and recovery

Ordinary calculation uses generated local assets, without new runtime services, dependencies or provider costs. Re-curate against pinned sources, retain original values and units, then run `catalog:build`/`catalog:check`. Roll back the branch/catalog implementation if necessary; stored meals need no reverse migration. Existing snapshots are neither rewritten nor recomputed. Maintainers must review source rights before distribution and keep unknowns explicit when evidence is unavailable.
