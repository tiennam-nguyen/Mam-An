import {
  buildMealSignature,
  buildPatternEvidence,
} from '../../domain/personal/personalResponse';
import type { MealRepository } from '../ports/mealRepository';
import type { GlucoseRepository } from '../ports/glucoseRepository';
import { weeklyWindow } from '../../domain/summary/weeklyAggregator';
import { ok } from '../../domain/common/result';
import { buildWeeklyReport } from '../../domain/summary/weeklyReport';
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
  const [m, g] = await Promise.all([meals.list(), glucose.list(query)]);
  if (!m.ok) return m;
  if (!g.ok) return g;
  const seen = new Set<string>();
  const report = buildWeeklyReport(m.value, g.value, now);
  const representativeMeals = [...report.meals]
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    )
    .filter((meal) => {
      const key = JSON.stringify([meal.isDemo, buildMealSignature(meal)]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return ok({
    ...report,
    observedPatternCards: representativeMeals
      .map((meal) => ({
        mealId: meal.id,
        mealLabel: [...new Set(meal.entries.map((e) => e.displayName))].join(
          ' · ',
        ),
        isDemo: meal.isDemo,
        pattern: buildPatternEvidence(
          meal,
          report.meals,
          g.value,
          meal.isDemo ? 'DEMO' : 'USER',
        ),
      }))
      .sort(
        (a, b) =>
          b.pattern.sampleCount - a.pattern.sampleCount ||
          a.mealId.localeCompare(b.mealId),
      )
      .slice(0, 3),
  });
}
