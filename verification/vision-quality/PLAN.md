# Vision quality mission — 2026-09-28

User outcome: recognizable Vietnamese dish names, using the strongest accessible vision models with existing no-card accounts. No billing changes. Scope: provider evaluation, prompt, model defaults and reproducible checks; no production deployment.

Base: origin/main a2e57ff; branch codex/vision-quality. Previous UX PR #7 merged.

Observed: user screenshot reports “Lá xanh ngâm nước”; original meal photograph and provider identity unavailable. Existing prompt asks for descriptive names when uncertain. Existing default starts Groq, then Ministral 14B. This is a plausible mechanism, not a reproduced diagnosis.

Acceptance: inspect every configured provider catalog; bounded one-shot flagship access probes; choose working vision-capable models, retain fallback/time/privacy limits; improve Vietnamese dish-level instructions while preserving visible-only ingredients and deterministic nutrition; run relevant contracts and full tests/typecheck/build. Synthetic images establish access/schema only, never real-meal accuracy.

Completed: eleven provider catalogs, bounded inference across twelve providers, stronger-model candidates, final prompt v3, Command A+ direct vision default, Hugging Face integration, 425 automated tests, 56 browser tests, emitted serverless runtime and safety/credential checks. Real mobile browser path exercised with a public soup photograph. Results, observed recognition errors, licenses and rollout/recovery instructions are in REPORT.md and JSON/log evidence.

Remaining bounds: exact user photograph unavailable; real ingredient recognition still makes errors. Existing production environment overrides and deployment need separate authorization. Next useful check: original user photo on preview after authorized deployment. No claim of universal model superiority or resolved ingredient accuracy.
