// Use Command A+ direct vision within the interactive request deadline.
// Live fixture probes with this option returned valid JSON in 2–4 seconds;
// default-mode probes included a timeout and malformed output (cause unknown).
// https://docs.cohere.com/docs/compatibility-api
export function visionRequestOptions(provider: string, model: string) {
  return provider === 'cohere' && model === 'command-a-plus-05-2026'
    ? { reasoning_effort: 'none' as const }
    : {};
}
