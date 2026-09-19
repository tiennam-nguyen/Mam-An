import type { Meal } from '../meal/meal';
import type { GlucoseReading } from '../glucose/glucoseReading';
export const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function weeklyWindow(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
export function aggregateWeekly(
  meals: readonly Meal[],
  readings: readonly GlucoseReading[],
  now: Date,
) {
  const { start, end } = weeklyWindow(now);
  const inside = (instant: string) =>
    new Date(instant) >= start && new Date(instant) < end;
  const selected = meals.filter((m) => inside(m.createdAt));
  const dailyLoggedCarbEstimates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    const rows = selected.filter(
      (m) => localDate(new Date(m.createdAt)) === localDate(date),
    );
    const known = rows.filter((m) => m.totalCarbEstimate !== null);
    return {
      localDate: localDate(date),
      mealCount: rows.length,
      totalKnownCarb: known.length
        ? known.reduce((s, m) => s + (m.totalCarbEstimate ?? 0), 0)
        : null,
      hasPartialMeals: rows.some((m) => m.completeness !== 'COMPLETE'),
    };
  });
  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    loggedMealCount: selected.length,
    dailyLoggedCarbEstimates,
    glucoseReadings: readings
      .filter((r) => inside(r.measuredAt))
      .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)),
    hasPartialMeals: selected.some((m) => m.completeness !== 'COMPLETE'),
    meals: selected,
  };
}
