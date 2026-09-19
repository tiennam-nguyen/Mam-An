import { it, expect } from 'vitest';
import { hasNonemptyProviderKeys } from '../scripts/envTemplate';
it('empty keys do not consume following model lines',()=>{
 expect(hasNonemptyProviderKeys('GROQ_API_KEY=\nGROQ_VISION_MODEL=qwen/model\nOPENROUTER_API_KEY=\r\nOPENROUTER_VISION_MODEL=model')).toBe(false);
 expect(hasNonemptyProviderKeys('GROQ_API_KEY="example-not-a-real-key"')).toBe(true);
 expect(hasNonemptyProviderKeys("OPENROUTER_API_KEY=''")).toBe(false);
});
