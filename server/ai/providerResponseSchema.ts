import { componentRoles } from '../../src/domain/meal/mealEntry.js';
import { z } from 'zod';
import type { RawAnalysisCandidate } from '../../src/domain/meal/analysisCandidate.js';
const suggestedComponent = z.object({
  raw_name: z.string().trim().min(1).max(120),
  role: z.enum(componentRoles),
  suggested_portion_multiplier: z.number().finite().positive().nullable(),
  suggested_portion_label: z.string().max(80).nullable(),
});
const candidate = z.object({
  candidate_dish_template_id: z.string().max(80).nullable().optional(),
  suggested_components: z.array(suggestedComponent).max(20).optional(),
  raw_name: z.string().trim().min(1).max(120),
  suggested_portion_multiplier: z.number().finite().positive().nullable(),
  suggested_portion_label: z.string().trim().max(80).nullable(),
  provider_confidence: z
    .number()
    .finite()
    .nullable()
    .transform((v) => (v !== null && v >= 0 && v <= 1 ? v : null)),
});
export const ProviderResponseSchema = z.object({
  candidates: z.array(candidate).min(1).max(20),
});
export const EnvelopeSchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string().max(20000) }) }))
    .min(1),
});
export const NormalizedSchema = z.object({
  candidates: z
    .array(
      z.object({
        candidateDishTemplateId: z.string().max(80).nullable().optional(),
        suggestedComponents: z
          .array(
            z.object({
              rawName: z.string().trim().min(1).max(120),
              role: z.enum(componentRoles),
              suggestedPortionMultiplier: z
                .number()
                .finite()
                .positive()
                .nullable(),
              suggestedPortionLabel: z.string().max(80).nullable(),
            }),
          )
          .max(20)
          .optional(),
        rawName: z.string().trim().min(1).max(120),
        suggestedPortionMultiplier: z.number().finite().positive().nullable(),
        suggestedPortionLabel: z.string().max(80).nullable(),
        providerConfidence: z.number().min(0).max(1).nullable(),
      }),
    )
    .min(1)
    .max(20),
});
export function parseProviderResult(
  value: unknown,
): readonly RawAnalysisCandidate[] {
  const envelope = EnvelopeSchema.parse(value);
  const parsed = ProviderResponseSchema.parse(
    JSON.parse(envelope.choices[0]!.message.content),
  );
  return parsed.candidates.map((c) => ({
    candidateDishTemplateId: c.candidate_dish_template_id,
    suggestedComponents: c.suggested_components?.map((s) => ({
      rawName: s.raw_name,
      role: s.role,
      suggestedPortionMultiplier: s.suggested_portion_multiplier,
      suggestedPortionLabel: s.suggested_portion_label,
    })),
    rawName: c.raw_name,
    suggestedPortionMultiplier: c.suggested_portion_multiplier,
    suggestedPortionLabel: c.suggested_portion_label,
    providerConfidence: c.provider_confidence,
  }));
}
