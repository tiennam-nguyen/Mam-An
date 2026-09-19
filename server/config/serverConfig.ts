import { z } from 'zod';
const bool = z.enum(['true', 'false']).transform((v) => v === 'true');
const schema = z.object({
  AI_PROVIDER_ORDER: z
    .string()
    .default('groq,mistral,cohere,openrouter')
    .transform((v) => v.split(',').map((s) => s.trim()))
    .refine(
      (v) =>
        v.length > 0 &&
        new Set(v).size === v.length &&
        v.every((s) => ['groq', 'openrouter', 'mistral', 'cohere', 'gemini'].includes(s)),
    ),
  GROQ_API_KEY: z.string().default(''),
  GROQ_VISION_MODEL: z.string().default('qwen/qwen3.8-27b'),
  OPENROUTER_API_KEY: z.string().default(''),
  OPENROUTER_VISION_MODEL: z.string().default('qwen/qwen3.8-27b:free'),
  MISTRAL_API_KEY: z.string().default(''),
  MISTRAL_VISION_MODEL: z.string().default('ministral-14b-2512'),
  COHERE_API_KEY: z.string().default(''),
  COHERE_VISION_MODEL: z.string().default('command-a-vision-07-2025'),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_VISION_MODEL: z.string().default('gemini-3.8-flash'),
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
