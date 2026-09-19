import { z } from 'zod';
const bool = z.enum(['true', 'false']).transform((v) => v === 'true');
const schema = z.object({
  AI_PROVIDER_ORDER: z
    .string()
    .default('groq,openrouter')
    .transform((v) => v.split(',').map((s) => s.trim()))
    .refine(
      (v) =>
        v.length > 0 &&
        new Set(v).size === v.length &&
        v.every((s) => s === 'groq' || s === 'openrouter'),
    ),
  GROQ_API_KEY: z.string().default(''),
  GROQ_VISION_MODEL: z.string().default('qwen/qwen3.8-27b'),
  OPENROUTER_API_KEY: z.string().default(''),
  OPENROUTER_VISION_MODEL: z.string().default('qwen/qwen3.8-27b:free'),
  AI_PROVIDER_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(30000)
    .default(15000),
  AI_REQUEST_MAX_BYTES: z.coerce
    .number()
    .int()
    .min(1000)
    .max(3000000)
    .default(3000000),
  OPENROUTER_REQUIRE_ZDR: bool.default(true),
  OPENROUTER_DENY_DATA_COLLECTION: bool.default(true),
});
export type ServerConfig = z.infer<typeof schema>;
export const readServerConfig = (environment: unknown) =>
  schema.safeParse(environment);
