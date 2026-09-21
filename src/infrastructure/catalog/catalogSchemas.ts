import { z } from 'zod';
const nutrient = z.number().finite().nonnegative().nullable();
export const FoodSchema = z
  .object({
    id: z.string().min(1),
    nameVi: z.string().trim().min(1),
    aliases: z.array(z.string().trim().min(1)),
    servingLabel: z.string().trim().min(1),
    carbPerServing: nutrient,
    kcalPerServing: nutrient,
    gi: nutrient,
    gl: nutrient,
    sourceRefs: z.array(z.string().min(1)),
    catalogVersion: z.string().min(1),
  })
  .superRefine((food, ctx) => {
    if (
      (food.carbPerServing !== null || food.kcalPerServing !== null) &&
      !food.sourceRefs.length
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Known nutrition needs provenance',
      });
  });
export const SourceRegistrySchema = z.array(
  z.object({
    source_id: z.string().min(1),
    authority: z.string().min(1),
    title: z.string().min(1),
    url: z.url(),
    retrieved_at: z.string().min(1),
    source_type: z.enum(['NUTRITION_COMPOSITION', 'PRODUCT_RULE']),
    license_status: z.string().min(1),
    acknowledgement: z.string().min(1),
  }),
);
