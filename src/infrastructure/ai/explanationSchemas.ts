import { z } from 'zod';
const text = z.string().max(600),
  label = z.string().min(1).max(120),
  numeric = z.number().finite().nullable(),
  positive = z.number().finite().nonnegative().nullable();
export const ExplanationTransportSchema = z
  .strictObject({
    meal: z.strictObject({
      evidenceKey: z.literal('meal.current'),
      entryLabels: z.array(label).max(20),
      componentLabels: z.array(label).max(100),
      totalCarbEstimate: positive,
      completeness: z.enum(['COMPLETE', 'PARTIAL', 'UNKNOWN']),
    }),
    scenario: z
      .strictObject({
        evidenceKey: z.literal('scenario.delta'),
        carbBefore: positive,
        carbAfter: positive,
        carbDelta: numeric,
        operationLabels: z.array(text).max(100),
      })
      .nullable(),
    pattern: z
      .strictObject({
        evidenceKey: z.literal('pattern.summary'),
        sampleCount: z.number().int().nonnegative().max(100000),
        timingBucketMinutes: z.number().int().positive().nullable(),
        medianPostMealMgDl: positive,
        medianDeltaFromPremealMgDl: numeric,
        dataQuality: z.enum([
          'SUFFICIENT_FOR_DESCRIPTION',
          'SPARSE',
          'NONCOMPARABLE',
          'NO_DATA',
        ]),
        caveats: z.array(label).max(20),
      })
      .nullable(),
    knowledge: z
      .array(
        z.strictObject({
          evidenceKey: label,
          title: label,
          body: z.string().max(1500),
          sourceLabel: label,
        }),
      )
      .max(5),
    uncertaintyFlags: z.array(label).max(20),
  })
  .superRefine((p, ctx) => {
    if (
      p.pattern &&
      p.pattern.dataQuality !== 'SUFFICIENT_FOR_DESCRIPTION' &&
      (p.pattern.medianPostMealMgDl !== null ||
        p.pattern.medianDeltaFromPremealMgDl !== null)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Insufficient pattern cannot include statistics',
      });
    if (
      p.pattern?.dataQuality === 'SUFFICIENT_FOR_DESCRIPTION' &&
      (p.pattern.sampleCount < 3 ||
        p.pattern.timingBucketMinutes === null ||
        p.pattern.medianPostMealMgDl === null)
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid sufficient pattern' });
  });
export const ExplanationOutputSchema = z.strictObject({
  summaryVi: z.string().min(1).max(1200),
  personalObservationVi: z.string().max(1000).nullable(),
  optionExplanationsVi: z.array(text).max(10),
  uncertaintyNoteVi: z.string().min(1).max(600),
  evidenceRefs: z.array(label).max(20),
});
