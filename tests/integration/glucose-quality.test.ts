import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { MamAnDb } from '../../src/infrastructure/persistence/mamAnDb';
import { DexieGlucoseRepository } from '../../src/infrastructure/persistence/dexieGlucoseRepository';
import { DexieMealRepository } from '../../src/infrastructure/persistence/dexieMealRepository';
import { addGlucoseReading } from '../../src/application/usecases/addGlucoseReading';
import { buildPatternEvidence } from '../../src/domain/personal/personalResponse';
import { aggregateWeekly } from '../../src/domain/summary/weeklyAggregator';
import { meal } from '../fixtures/helpers';
it('preserves historical extreme/precise readings while excluding them from statistics; rejects new writes through use case', async () => {
  const db = new MamAnDb('glucose-quality-' + crypto.randomUUID());
  const repo = new DexieGlucoseRepository(db),
    meals = new DexieMealRepository(db);
  const m = meal();
  const base = {
    id: 'extreme' as never,
    value: 1e308,
    unit: 'MMOL_L' as const,
    measuredAt: new Date(Date.parse(m.createdAt) + 120 * 60000).toISOString(),
    mealId: m.id,
    timingTag: 'AFTER_MEAL' as const,
    note: null,
    isDemo: m.isDemo,
  };
  try {
    expect((await meals.save(m, null)).ok).toBe(true);
    expect((await repo.save(base)).ok).toBe(true); // historical persistence contract stays broad
    expect(
      (await repo.save({ ...base, id: 'precise' as never, value: 6.123456789 }))
        .ok,
    ).toBe(true);
    expect(
      (await addGlucoseReading({ ...base, id: 'new' as never }, repo, meals))
        .ok,
    ).toBe(false);
    const valid = { ...base, id: 'valid' as never, value: 6.7 };
    expect((await addGlucoseReading(valid, repo, meals)).ok).toBe(true);
    db.close();
    await db.open();
    const rows = await repo.list();
    if (!rows.ok) throw Error('repository failed');
    expect(rows.value.map((r) => r.value).sort()).toEqual(
      [1e308, 6.123456789, 6.7].sort(),
    );
    const history = [
      m,
      { ...m, id: 'm2' as never },
      { ...m, id: 'm3' as never },
    ];
    const pattern = buildPatternEvidence(
      m,
      history,
      [
        ...rows.value,
        { ...valid, id: 'v2' as never, mealId: 'm2' as never },
        { ...valid, id: 'v3' as never, mealId: 'm3' as never },
      ],
      m.isDemo ? 'DEMO' : 'USER',
    );
    expect(pattern.glucoseObservations.map((r) => r.readingId).sort()).toEqual([
      'v2',
      'v3',
      'valid',
    ]);
    expect(pattern.statistics.medianPostMealMgDl).toBe(6.7 * 18);
    const weekly = aggregateWeekly([m], rows.value, new Date(base.measuredAt));
    expect(weekly.glucoseReadings).toHaveLength(3);
    expect(await repo.getById(base.id)).toEqual({ ok: true, value: base });
  } finally {
    await db.delete();
  }
});
