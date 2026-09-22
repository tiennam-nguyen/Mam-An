import {
  buildMealSignature,
  buildPatternEvidence,
} from '../../domain/personal/personalResponse';
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
  const seen = new Set<string>();
  const representativeMeals = m.value
    .filter((meal) => {
      const key = JSON.stringify([meal.isDemo, buildMealSignature(meal)]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
  return ok({
    ...aggregateWeekly(m.value, g.value, now),
    observedPatternCards: representativeMeals.map((meal) => ({
      mealId: meal.id,
      mealLabel: [...new Set(meal.entries.map((e) => e.displayName))].join(
        ' · ',
      ),
      isDemo: meal.isDemo,
      pattern: buildPatternEvidence(
        meal,
        m.value,
        g.value,
        meal.isDemo ? 'DEMO' : 'USER',
      ),
    })),
  });
}
