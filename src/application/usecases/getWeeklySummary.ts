import type { MealRepository } from '../ports/mealRepository';
import type { GlucoseRepository } from '../ports/glucoseRepository';
import {
  aggregateWeekly,
  weeklyWindow,
} from '../../domain/summary/weeklyAggregator';
import { ok } from '../../domain/common/result';
export async function getWeeklySummary(
  meals: MealRepository,
  glucose: GlucoseRepository,
  now: Date,
) {
  const { start, end } = weeklyWindow(now),
    query = {
      fromInclusive: start.toISOString(),
      toExclusive: end.toISOString(),
    };
  const [m, g] = await Promise.all([meals.list(query), glucose.list(query)]);
  if (!m.ok) return m;
  if (!g.ok) return g;
  return ok(aggregateWeekly(m.value, g.value, now));
}
