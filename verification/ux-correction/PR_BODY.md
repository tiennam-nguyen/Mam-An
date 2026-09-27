Vietnamese headings rendered detached accents because the Windows browser selected mixed Georgia/Times New Roman glyphs. The meal editor also exposed too much configuration, reference-food selection overwrote user names, and finite-positive glucose validation allowed enormous values to overflow saved-meal views.

This change uses the verified system font stack, puts advanced meal editing behind “Chỉnh món này,” preserves custom names independently of catalog mapping, and simplifies glucose/settings flows. Mobile report rows, touch targets, skip-link behavior and forward-navigation scroll/focus are corrected. Unknown nutrition, uncertain-result confirmation, simulation semantics and historical storage remain intact.

New glucose entry policy: 0.1–99.9 mmol/L with at most one decimal, or integer 1–999 mg/dL. These are data-entry constraints, not medical thresholds. Whole-string validation rejects exponent/malformed/oversized input before conversion, including newline paste. Changing units clears the input. Existing out-of-policy readings are preserved exactly, visibly flagged and excluded from personal statistics; no schema migration, clamping or automatic repair.

Verification on `fb2b796f65db8e27270c4838f73d178f920731df`:

- 406 tests passed (307 unit, 47 contract, 52 integration); full browser suite: 56 passed.
- Typecheck, production build/catalog validation, safety-copy audit and secret audit passed.
- Before/after screenshots at 320/390/1366 px, normal/large text; actual per-glyph font inspection and NFC/NFD comparison; Windows pixel regressions passed without snapshot updates.
- Synthetic historical extreme records survive reload unchanged; invalid direct use-case writes are rejected. Complete meal → simulation → save/reload → glucose → history/report flows remain functional.

See `verification/ux-correction/REPORT.md` for linked screenshots, reproductions and exact command logs. Evidence commit adds artifacts only. Physical mobile devices and the operator's exact screenshot environment remain unverified; the five referenced screenshots were not attached. The existing bundle-size warning remains. No provider reevaluation, merge or Production deployment.
