# Provider strategy — 2026-09-19/20

[READ] Runtime: `server/config/serverConfig.ts:readServerConfig`, `api/v1/analyze-meal.ts:fetch`, `server/ai/failoverVisionService.ts:analyze`. Candidate-only output passes `parseProviderResult`; authoritative nutrition stays in the local catalog. Standard HTTP adapters share transport only where the wire protocol matches. Gemini uses its native request/response conversion.

## Observations and choice

[RAN] `provider-discovery.json` records account-visible catalogs; `provider-matrix.json` records individual smoke requests. Model IDs came from those catalogs and the official sources listed per candidate. These are synthetic-image connectivity observations, not a ranking or a meal-recognition benchmark. Every request is bounded to 15 seconds, with no retries. The SVG changed when its visible label was removed; compare only rows with the same fixture hash. Seed is unset, model responses are nondeterministic.

Default order: **Groq → Mistral → Cohere → OpenRouter**, skipping missing/blank credentials. The first three returned schema-valid image responses. Groq subsequently returned 429 in the complete local browser path; Mistral returned 200 and rendered five candidates. A previously successful smoke does not promise quota availability.

Gemini also returned a valid response, but is opt-in because the [free-tier terms](https://ai.google.dev/gemini-api/docs/pricing) allow content use to improve products. Explicitly add `gemini` to `AI_PROVIDER_ORDER` only after reviewing this constraint. The UI discloses transmission to AI and fallback services and their retention policies.

OpenRouter remains the last option with `data_collection: deny` and `zdr: true`; these filters are never relaxed on failure. Its Qwen request received HTTP 200 headers but did not yield a usable body before the deadline. Another free model returned 404. The original harness classified a body-read abort as malformed; the ledger preserves that original observation and annotates the timeout hypothesis rather than rewriting historical output.

Hugging Face and SambaNova returned valid candidate schemas but are not wired into runtime: existing direct providers suffice, HF adds routed-service/privacy and credit constraints, and the tested SambaNova vision model is preview. NVIDIA timed out. Cloudflare and Vercel returned 403; no account terms were accepted or project permissions altered. Pollinations and Cerebras returned 402. Cerebras image modality for this account remains UNKNOWN; a billing rejection cannot prove text-only capability. None of these errors proves a global provider outage or universal lack of a free tier.

## Failover contract

| Condition | Policy |
| --- | --- |
| Missing/blank provider key | Skip provider |
| Network, timeout, 429, provider 5xx | Try next provider once; transient final failure is retryable |
| 401/403, missing model 404, unsupported request 400/422, billing 402 | Try next provider; sanitized diagnostic reason distinguishes configuration/access from transient failures |
| Malformed JSON/schema/empty candidates | Try next provider once |
| Invalid user input/origin/upload | Stop before providers |
| Parent cancellation | Stop immediately, no next provider |
| All fail | Return last stable error; never inject sample data |
| Invalid global config | Sanitized 503 and field-name diagnostics; do not construct chain |

Per-provider timeout is configurable (100–30000 ms, default 15000). A **25000 ms total budget** bounds the chain; therefore slow failures can exhaust the budget before every configured provider runs. The browser deadline is 30000 ms. No automatic repeated calls to a rate-limited provider. Provider diagnostics contain only provider ID, stable code, allowlisted reason, and elapsed time; no images, response bodies or credentials.

## Access, cost, privacy limits

[ASSUMED] Accounts have no card and are intended for free-tier testing, as stated by the operator. [UNKNOWN] Exact billing state, remaining credits, quotas, training/retention controls on each account, and real-photo recognition quality. A successful request proves current access only; a model listing alone does not prove free inference.

Official references inspected during discovery:

- [Groq vision](https://console.groq.com/docs/vision)
- [Mistral models](https://docs.mistral.ai/models), [free playground mode](https://docs.mistral.ai/getting-started/quickstarts/studio/test-model-playground)
- [Cohere vision trial/production access](https://docs.cohere.com/v1/docs/command-a-vision), [compatibility API](https://docs.cohere.com/docs/compatibility-api)
- [Gemini pricing/data use](https://ai.google.dev/gemini-api/docs/pricing)
- [OpenRouter catalog](https://openrouter.ai/api/v1/models)
- [NVIDIA multimodal APIs](https://docs.api.nvidia.com/nim/reference/multimodal-apis)
- [HF inference pricing](https://huggingface.co/docs/inference-providers/pricing)
- [SambaNova models](https://docs.sambanova.ai/docs/en/models/sambacloud-models)
- [Cloudflare vision model](https://developers.cloudflare.com/workers-ai/models/llama-3.2-11b-vision-instruct/)
- [Cerebras multimodal availability](https://www.cerebras.ai/blog/gemma-4-on-cerebras-the-fastest-inference-is-now-multimodal)
- [Vercel gateway pricing](https://vercel.com/docs/ai-gateway/pricing)
- [Pollinations catalog](https://gen.pollinations.ai/text/models)

No representative real-photo fixture set exists in this repository. Recognition quality, major-component recall, hallucinated components and portion plausibility remain UNKNOWN. Do not derive accuracy percentages from this illustration.
