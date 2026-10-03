import type { Meal } from '../meal/meal';
import type { GlucoseReading } from '../glucose/glucoseReading';
import { aggregateWeekly } from './weeklyAggregator';

/** Exact ID joins only. M references are chronological, ties broken by immutable ID.
 * Outside-period linked meals are context only and never enter period totals. */
export function buildWeeklyReport(
  meals: readonly Meal[],
  readings: readonly GlucoseReading[],
  now: Date,
) {
  const summary = aggregateWeekly(meals, readings, now);
  const linkedIds = new Set(
    summary.glucoseReadings.flatMap((g) => (g.mealId ? [g.mealId] : [])),
  );
  const periodIds = new Set(summary.meals.map((m) => m.id));
  const mealRows = meals
    .filter((m) => periodIds.has(m.id) || linkedIds.has(m.id))
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    )
    .map((meal, index) => ({
      meal,
      reference: `M${index + 1}`,
      outsidePeriod: !periodIds.has(meal.id),
      label:
        meal.entries.map((e) => e.displayName.split(', ')[0]).join(' · ') ||
        'Bữa đã ghi',
    }));
  const byId = new Map(mealRows.map((row) => [row.meal.id, row]));
  const readingRows = [...summary.glucoseReadings]
    .sort(
      (a, b) =>
        a.measuredAt.localeCompare(b.measuredAt) || a.id.localeCompare(b.id),
    )
    .map((reading) => {
      const linked = reading.mealId ? byId.get(reading.mealId) : undefined;
      // Report the saved relationship exactly. Personal evidence applies its own mode isolation.
      const meal = linked;
      const minutes = meal
        ? Math.round(
            (Date.parse(reading.measuredAt) - Date.parse(meal.meal.createdAt)) /
              60000,
          )
        : null;
      return {
        reading,
        meal,
        minutes,
        linkLabel: meal
          ? `${meal.reference} · ${meal.label}`
          : reading.mealId
            ? 'Không tìm thấy bữa đã liên kết'
            : 'Chưa liên kết bữa',
        timingLabel:
          minutes === null
            ? 'Chưa xác định'
            : minutes < 0
              ? `${Math.abs(minutes)} phút trước bữa`
              : minutes === 0
                ? 'Cùng thời điểm bữa'
                : `${minutes} phút sau bữa`,
      };
    });
  const counts = new Map<string, number>();
  for (const meal of summary.meals)
    for (const name of new Set(
      meal.entries.flatMap((e) =>
        e.components.filter((c) => c.includedInTotal).map((c) => c.displayName),
      ),
    ))
      counts.set(name, (counts.get(name) ?? 0) + 1);
  const frequentComponents = [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'vi'))
    .slice(0, 5);
  const linked = readingRows.filter((r) => r.meal).length;
  const unlinked = readingRows.filter((r) => !r.reading.mealId).length;
  const missing = readingRows.length - linked - unlinked;
  const unknownComponents = summary.meals
    .flatMap((m) => m.entries.flatMap((e) => e.components))
    .filter(
      (c) =>
        c.includedInTotal &&
        (c.carbEstimate === null || c.kcalEstimate === null),
    ).length;
  const timingGroups = new Map<number, number>();
  for (const row of readingRows)
    if (row.minutes !== null && row.minutes > 0) {
      const bucket = Math.round(row.minutes / 30) * 30;
      timingGroups.set(bucket, (timingGroups.get(bucket) ?? 0) + 1);
    }
  const partial = summary.meals.filter(
    (m) => m.completeness !== 'COMPLETE',
  ).length;
  const days = summary.dailyLoggedCarbEstimates.filter(
    (d) => d.mealCount > 0,
  ).length;
  const narrative = [
    `Đã ghi ${summary.loggedMealCount} bữa trong ${days}/7 ngày. Ngày chưa ghi không có nghĩa là không ăn.`,
    `Có ${readingRows.length} số đo: ${linked} xác định được bữa${readingRows.length ? ` (${Math.round((linked / readingRows.length) * 100)}%)` : ''}, ${unlinked} chưa liên kết, ${missing} liên kết không tìm thấy bữa.`,
    summary.loggedMealCount
      ? `${partial}/${summary.loggedMealCount} bữa có dinh dưỡng chưa đầy đủ; ${unknownComponents} thành phần còn thiếu dữ liệu. Tổng theo ngày chỉ cộng phần đã biết từ bản ghi đã lưu.`
      : 'Chưa có bữa ăn trong kỳ để mô tả độ đầy đủ của dữ liệu dinh dưỡng.',
    ...[...timingGroups]
      .sort((a, b) => a[0] - b[0])
      .map(
        ([bucket, count]) =>
          `${count} số đo trong nhóm khoảng ${bucket} phút sau bữa (nhóm cách nhau 30 phút; thời gian chính xác ở bảng).`,
      ),
    'Thời điểm và số đo mô tả những lần đã ghi; không chứng minh món ăn gây ra thay đổi đường huyết.',
  ];
  return { ...summary, mealRows, readingRows, frequentComponents, narrative };
}
