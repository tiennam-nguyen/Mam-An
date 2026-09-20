import { it, expect } from 'vitest';
import { hasNonemptyProviderKeys } from '../scripts/envTemplate';
it('empty keys do not consume following model lines',()=>{
 expect(hasNonemptyProviderKeys('GROQ_API_KEY=\nGROQ_VISION_MODEL=qwen/model\nOPENROUTER_API_KEY=\r\nOPENROUTER_VISION_MODEL=model')).toBe(false);
 expect(hasNonemptyProviderKeys('GROQ_API_KEY="example-not-a-real-key"')).toBe(true);
 expect(hasNonemptyProviderKeys("OPENROUTER_API_KEY=''")).toBe(false);
});
it.each(['MISTRAL_API_KEY','NVIDIA_NIM_API_KEY','GEMINI_API_KEY','COHERE_API_KEY','CLOUDFLARE_API_KEY','CEREBRAS_API_KEY','HUGGINGFACEHUB_API_KEY','SAMBA_API_KEY','VERCEL_API_KEY','POLLINATIONS_API_KEY'])('detects nonempty %s', name => {
 expect(hasNonemptyProviderKeys(name+'=test-only-placeholder')).toBe(true);
 expect(hasNonemptyProviderKeys(name+'=""\nMODEL=ordinary')).toBe(false);
});
