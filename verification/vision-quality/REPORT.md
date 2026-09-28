# Vision provider quality and access — 2026-09-28

## Outcome and limits

Implemented stronger defaults: **Command A+ → Qwen3-VL 235B (Hugging Face) → Groq Qwen3.8 27B → Mistral Medium 3.5 → OpenRouter free Qwen**. Missing keys are skipped. Explicit environment overrides remain authoritative. Gemini stays opt-in because of the existing free-tier data-use boundary. No billing settings, subscriptions, production environment, deployment or main branch were changed.

The new prompt asks for familiar Vietnamese dish categories, dish-level grouping and visible components rather than literal descriptions. Nutrition still comes exclusively from the local catalog; unknown ingredients remain unknown and require review.

**Recognition is not solved.** The original user photo was not supplied, so the exact “Lá xanh ngâm nước” failure could not be reproduced. Two independent public photographs were inspected and evaluated without sending filenames or captions to providers. Command A+ recognized the soup category and the rice plate, but repeatedly misidentified taro as dumplings or other foods. Do not interpret the result as an accurate ingredient list or nutrition estimate. This small check cannot establish general model rankings or production reliability.

## Access observations [RAN]

Existing no-card keys, local Windows, one bounded request per listed probe, no automatic retries. Model catalogs returned HTTP 200 for eleven providers; Vercel inference was separately checked. Complete timestamps, model IDs, fixture hashes and outcomes are in the JSON ledgers. These are observations of this account and time, not a guarantee of perpetual free access. Account billing state was not independently inspected; no upgrades were attempted.

| Provider / stronger option | Observed outcome | Decision |
| --- | --- | --- |
| Cohere Command A+ `command-a-plus-05-2026` | Valid structured results; default reasoning probes also included timeout/malformed output | First choice with documented `reasoning_effort: none`; final-mode real image requests took about 2–4 seconds |
| Hugging Face Qwen3-VL 235B | Valid soup result in 7.7 s; rice request timed out at 15 s | Stronger fallback, with the same bounded timeout |
| Hugging Face Kimi K3 / Qwen3.5 397B | Both timed out at 15 s | Not promoted |
| NVIDIA Kimi K3 | Timed out at 15 s and on a different fixture at 25 s | Not promoted |
| Groq Qwen3.8 27B | Accessible; wrong noodle dish with old prompt; soup with invented meats with revised prompt | Retained below stronger working options |
| Mistral Medium 3.5 `mistral-medium-2604` | HTTP 429 | Stronger configured Mistral default, late fallback; account quota currently prevents use |
| Gemini 3.1 Pro | HTTP 429 | Not promoted |
| Gemini 3.8 Flash | 15 s timeout; separate 25 s soup probe returned HTTP 503 | Remains opt-in |
| Gemini 2.5 Flash | HTTP 404 despite catalog listing | Not promoted |
| OpenRouter free Qwen / Gemma | HTTP 429 / 404 with privacy controls intact | Existing free Qwen retained as last fallback; no paid model substitution |
| Pollinations GPT-5.6 Sol | HTTP 402 | No purchase/upgrade attempted |
| SambaNova Gemma / Cerebras Qwen | HTTP 402 | No purchase/upgrade attempted |
| Vercel gateway / Cloudflare vision | HTTP 403 | No permission or billing changes attempted |

Catalog inclusion does not prove inference entitlement. Larger model names do not establish better food recognition. Unsupported/slow providers were not added to runtime merely because their catalogs listed flagship models.

## Prompt experiments and independent checks

- `soup-results.json`: prior Groq prompt called the soup a noodle dish. Command A+ with v3 returned “Canh rau”; Qwen 235B returned soup but mistook taro for meatballs.
- `rice-results.json`: default Command A+ mode timed out once and returned schema-invalid data once; the cause of malformed output was not captured. Hugging Face timed out.
- `direct-vision.json`: documented Command A+ direct mode returned “Cơm tấm” / “Nước chấm” and “Canh rau”, with valid schemas. Some components were still wrong. Direct mode is a practical mitigation, not a proven diagnosis of earlier failures.
- `rejected-v4.json`: an extra unknown-component constraint worsened the soup label to “Bánh canh nước”; reverted. The file was originally produced at `final-prompt.json`, as recorded in its commands. Final shipped prompt is v3, SHA-256 `4b4420f242e88b5cffd45b7068c65919679e02458c8209ff893f127aefb26522`.
- `browser-live.json` / `.png`: real Chromium mobile viewport → local production build → exported v2 API → real Command A+ → review screen, HTTP 200, `Cache-Control: no-store`. It returned “Canh rau nấu với sủi cảo”: soup category recognized, dumpling identification incorrect. Screenshot inspected; unknown ingredients remained unconfirmed and Save disabled. No personal diary data was saved or sent.

The evaluation script now sends the same complete prompt and provider-specific options as production. Previously it omitted the component prompt, so old smoke tests did not exercise the full production request. New records include normalized dish/component names and prompt hashes. Use only public or explicitly authorized fixtures; do not commit personal meal data.

## Verification [RAN]

Environment: Windows, Node 24.13.0, npm 11.6.2. Base `a2e57ff673c5d1c97f78f0ee332903806dca3c13`, dirty branch `codex/vision-quality`; final source file SHA-256 manifest recorded in checks.json. No new dependencies, persistence schema changes or UI changes.

- `npm run typecheck`: passed (`typecheck.log`).
- `npm run test`: **425 tests / 25 suites passed** (`tests.log`). Includes new runtime priority/quota failover contract and the full HTTP/error matrix for Hugging Face.
- `npm run build`: passed (`build.log`); existing client bundle-size warning remains.
- Emitted Vercel v2 function built with `@vercel/node` 13.0.1 and ran through real decoder/adapter with stubbed upstream HTTP, returning 200 (`runtime.log`). This establishes import/runtime compatibility, not hosted access.
- Safety/client boundary and credential audits passed (`safety.log`, `secrets.log`).
- `npm run test:e2e`: **56 browser tests passed** (`e2e.log`). Hosted deployment and the user's original image remain unchecked.

## Rollout and recovery

Deployment requires separate authorization. The project operator should set `AI_PROVIDER_ORDER=cohere,huggingface,groq,mistral,openrouter`, `COHERE_VISION_MODEL=command-a-plus-05-2026`, `HUGGINGFACE_VISION_MODEL=Qwen/Qwen3-VL-235B-A22B-Instruct`, and `MISTRAL_VISION_MODEL=mistral-medium-2604`; keep existing keys server-only. Existing explicit old settings otherwise override these source defaults. A working local key does not prove it is installed in the hosted environment.

Before production rollout, test the preview with a consented real meal photo. Check latency, provider errors, valid review data and uncertain ingredient handling. Stop rollout on increased failures or more confident wrong ingredients. Recover by redeploying the previous revision and restoring prior provider/model environment settings; no data migration is needed. Keep manual entry available when free quotas are exhausted. No monitoring owner has been assigned beyond the project operator.

Sources inspected: [Cohere Command A+](https://docs.cohere.com/docs/command-a-plus), [Cohere compatibility options](https://docs.cohere.com/docs/compatibility-api), [Mistral Medium 3.5](https://docs.mistral.ai/models/mistral-medium-3-5-26-04), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Groq vision](https://console.groq.com/docs/vision), [NVIDIA Kimi K3](https://docs.api.nvidia.com/nim/re/reference/moonshotai-kimi-k3), authenticated model catalogs in `catalogs.json`. Image credits and licensing: `FIXTURES.md`.
