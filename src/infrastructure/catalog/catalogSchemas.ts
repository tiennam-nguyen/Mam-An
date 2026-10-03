import { componentRoles } from '../../domain/meal/mealEntry';
import { z } from 'zod';
const nutrient = z.number().finite().nonnegative().nullable();
export const FoodSchema = z
  .object({
    id: z.string().min(1),
    category: z.enum([...componentRoles, 'MIXED']).default('OTHER'),
    nameVi: z.string().trim().min(1),
    aliases: z.array(z.string().trim().min(1)),
    servingLabel: z.string().trim().min(1),
    carbPerServing: nutrient,
    kcalPerServing: nutrient,
    gi: nutrient,
    gl: nutrient,
    sourceRefs: z.array(z.string().min(1)),
    catalogVersion: z.string().min(1),
    referenceServingId: z.string().optional(),
    defaultPortionId: z.string().optional(),
    nutrientBasis: z
      .object({
        amount: z.number().finite().positive(),
        unit: z.enum(['G', 'ML']),
        preparationState: z.string().min(1),
        ediblePortionNote: z.string().min(1),
        carbohydrateDefinition: z.literal('AVAILABLE_BY_DIFFERENCE'),
        energyDefinition: z.string().min(1),
      })
      .optional(),
    provenance: z
      .object({
        sourceId: z.string().min(1),
        sourceFoodId: z.string().min(1),
        sourceDescription: z.string().min(1),
        sourceVersion: z.string().min(1),
        sourceRef: z.url(),
        accessedAt: z.iso.date(),
        notes: z.string().min(1),
      })
      .optional(),
    portionUnits: z
      .array(
        z.object({
          id: z.string().min(1),
          labelVi: z.string().min(1),
          aliases: z.array(z.string()),
          factorToReference: z.number().finite().positive(),
          conversionQuality: z.enum(['VERIFIED', 'ESTIMATED', 'UNVERIFIED']),
          sourceRef: z.string().min(1),
          kind: z.enum(['HOUSEHOLD', 'METRIC', 'REFERENCE']),
        }),
      )
      .optional(),
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
