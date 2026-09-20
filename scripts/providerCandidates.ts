// IDs below were discovered in verification/provider-discovery.json on 2026-09-19.
// This is an opt-in evaluation list, not the production failover chain.
export const providerCandidates = [
  { provider: 'vercel', model: 'google/gemma-4-31b-it', key: 'VERCEL_API_KEY', endpoint: 'https://ai-gateway.vercel.sh/v1/chat/completions', source: 'https://ai-gateway.vercel.sh/v1/models' },
  { provider: 'cerebras', model: 'qwen-3.8-27b', key: 'CEREBRAS_API_KEY', endpoint: 'https://api.cerebras.ai/v1/chat/completions', imageCapable: null, source: 'https://api.cerebras.ai/v1/models' },
  { provider: 'cloudflare', model: '@cf/meta/llama-3.2-11b-vision-instruct', key: 'CLOUDFLARE_API_KEY', endpoint: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID ?? ''}/ai/v1/chat/completions`, source: 'https://developers.cloudflare.com/workers-ai/models/llama-3.2-11b-vision-instruct/' },
  { provider: 'groq', model: 'qwen/qwen3.8-27b', key: 'GROQ_API_KEY', endpoint: 'https://api.groq.com/openai/v1/chat/completions', source: 'https://console.groq.com/docs/vision' },
  { provider: 'openrouter', model: 'qwen/qwen3.8-27b:free', key: 'OPENROUTER_API_KEY', endpoint: 'https://openrouter.ai/api/v1/chat/completions', source: 'https://openrouter.ai/api/v1/models' },
  { provider: 'openrouter', model: 'google/gemma-4-31b-it:free', key: 'OPENROUTER_API_KEY', endpoint: 'https://openrouter.ai/api/v1/chat/completions', source: 'https://openrouter.ai/api/v1/models' },
  { provider: 'mistral', model: 'mistral-small-2603', key: 'MISTRAL_API_KEY', endpoint: 'https://api.mistral.ai/v1/chat/completions', source: 'https://docs.mistral.ai/models' },
  { provider: 'mistral', model: 'ministral-14b-2512', key: 'MISTRAL_API_KEY', endpoint: 'https://api.mistral.ai/v1/chat/completions', source: 'https://docs.mistral.ai/studio/conversations/vision' },
  { provider: 'gemini', model: 'gemini-3.8-flash', key: 'GEMINI_API_KEY', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', source: 'https://ai.google.dev/gemini-api/docs/pricing' },
  { provider: 'gemini', model: 'gemini-2.5-flash', key: 'GEMINI_API_KEY', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', source: 'https://ai.google.dev/gemini-api/docs/image-understanding' },
  { provider: 'cohere', model: 'command-a-vision-07-2025', key: 'COHERE_API_KEY', endpoint: 'https://api.cohere.ai/compatibility/v1/chat/completions', source: 'https://docs.cohere.com/v1/docs/command-a-vision' },
  { provider: 'nvidia', model: 'meta/llama-3.2-90b-vision-instruct', key: 'NVIDIA_NIM_API_KEY', endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions', source: 'https://docs.api.nvidia.com/nim/reference/multimodal-apis' },
  { provider: 'huggingface', model: 'Qwen/Qwen3.8-27B', key: 'HUGGINGFACEHUB_API_KEY', endpoint: 'https://router.huggingface.co/v1/chat/completions', source: 'https://router.huggingface.co/v1/models' },
  { provider: 'sambanova', model: 'gemma-4-31B-it', key: 'SAMBA_API_KEY', endpoint: 'https://api.sambanova.ai/v1/chat/completions', source: 'https://docs.sambanova.ai/docs/en/models/sambacloud-models' },
  { provider: 'pollinations', model: 'openai/gpt-5.4-nano', key: 'POLLINATIONS_API_KEY', endpoint: 'https://gen.pollinations.ai/v1/chat/completions', source: 'https://gen.pollinations.ai/text/models' },
] as const;
