import type { GlucoseReading } from '../../domain/glucose/glucoseReading';
import type { GlucoseRepository } from '../ports/glucoseRepository';
import type { MealRepository } from '../ports/mealRepository';
import { isValidGlucose } from '../../domain/glucose/glucoseValidation';
import { fail } from '../../shared/errors/appError';
export async function addGlucoseReading(
  reading: GlucoseReading,
  glucose: GlucoseRepository,
  meals: MealRepository,
) {
  if (!isValidGlucose(reading)) return fail('INVALID_INPUT');
  if (reading.mealId) {
    const linked = await meals.getById(reading.mealId);
    if (!linked.ok) return linked;
    if (!linked.value) return fail('INVALID_INPUT');
  }
  return glucose.save({
    ...reading,
    measuredAt: new Date(reading.measuredAt).toISOString(),
  });
}
