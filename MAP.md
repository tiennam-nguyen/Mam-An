# Mâm An map

React/TypeScript/Vite local-first modular monolith. npm only. Static catalog + IndexedDB/Dexie; optional stateless Node/Vercel AI proxy.

## Dependency direction

Features → application ports/use cases + domain/shared UI. Application has no concrete persistence/provider imports. Domain has no React, Dexie or network imports. Infrastructure implements ports; app/compositionRoot.ts wires adapters once. API → server services → provider port. Recurring safety copy lives in shared/content/safetyCopy.ts.

## Flow

Sample MockLLM or uploaded image → review/correction/portion → deterministic catalog math → atomic meal+thumbnail snapshot → local history → optional glucose link → seven local calendar days → printable report.

Session tokens and abort controllers discard stale results. Corrections are local. Save retries reuse a stable ID. Demo records use normal repository read paths. The API accepts image+locale only and validates size, decoded pixels and normalized output. No raw payload logging.

## Decisions and LLD deltas

- LLD supersedes HLD's original provider choice: Groq then OpenRouter, with explicit fixture mode.
- Initial operator request was MockLLM-only; subsequent request authorized live multi-model tests. Keys live only in ignored .env.local. Groq qwen3.8 became the default after a valid smoke response.
- Physical meal/glucose records use schemaVersion:1 plus value snapshots and numeric 0/1 indexed demo flags; IndexedDB indexes do not accept boolean keys. Domain still uses booleans.
- Weekly daily totals are nullable and carry mealCount, distinguishing absent/all-unknown logs from known zero.
- Manual review can begin without first failing AI.
- Three manually traced ASEANFOODS reference foods; Vietnam FCT entries were not verified. Mixed-dish estimates remain unknown. Reference weights are illustrative, not measured household servings.
- Bundled original SVG illustration is visibly sample data, not a real AI photograph.
- Related small contracts share files; no empty placeholder module tree. Plain CSS, no global-state/UI framework.
- Sharp is server-only and rejects corrupt/spoofed image payloads by decoding them.
- No lint/import framework, broad CI, analytics, server persistence, auth or SDK dependency.
- Only implementation code was formatted; PRD/SRS/HLD/LLD unchanged.

## Frontier

Deterministic demo and mocked API contracts implemented. Live smoke has one verified Groq response and explicit provider failures. Remaining external checks: representative food-photo quality, provider account/privacy controls, deployed HTTPS behavior, target-device camera/install/print, broader data licensing/serving review.
