import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { MamAnDb } from '../../src/infrastructure/persistence/mamAnDb';
import { DexieMealRepository } from '../../src/infrastructure/persistence/dexieMealRepository';
import { DexieGlucoseRepository } from '../../src/infrastructure/persistence/dexieGlucoseRepository';
import { DexieSettingsRepository } from '../../src/infrastructure/persistence/dexieSettingsRepository';
import { getPersonalResponse } from '../../src/application/usecases/getPersonalResponse';
import { getWeeklySummary } from '../../src/application/usecases/getWeeklySummary';
import { meal } from '../fixtures/helpers';

it('real repositories isolate personal modes, preserve preferences, and filter weekly periods after reopen', async () => {
  const db = new MamAnDb('personal-' + crypto.randomUUID());
  const meals = new DexieMealRepository(db),
    glucose = new DexieGlucoseRepository(db),
    settings = new DexieSettingsRepository(db);
  const q = meal();
  const expectedSettings = {
    glucoseUnit: 'MG_DL' as const,
    demoModeEnabled: true,
    largeTextEnabled: true,
    voiceInputEnabled: true,
    preferredPortionVocabulary: 'METRIC' as const,
    favouriteMealIds: ['u0'],
  };
  try {
    for (const isDemo of [false, true])
      for (let i = 0; i < 3; i++) {
        const m = {
          ...meal(),
          id: `${isDemo ? 'd' : 'u'}${i}` as never,
          isDemo,
          createdAt: '2026-09-19T05:00:00.000Z',
        };
        expect((await meals.save(m, null)).ok).toBe(true);
        expect(
          (
            await glucose.save({
              id: `g-${m.id}` as never,
              mealId: m.id,
              measuredAt: '2026-09-19T07:00:00.000Z',
              value: isDemo ? 999 : 100 + 10 * i,
              unit: 'MG_DL',
              timingTag: 'AFTER_MEAL',
              isDemo,
              note: null,
            })
          ).ok,
        ).toBe(true);
      }
    expect((await settings.save(expectedSettings)).ok).toBe(true);
    db.close();
    await db.open();
    expect(await settings.get()).toEqual({ ok: true, value: expectedSettings });
    for (const mode of ['USER', 'DEMO'] as const) {
      const result = await getPersonalResponse(q, meals, glucose, mode);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.dataQuality).toBe('SUFFICIENT_FOR_DESCRIPTION');
        expect(result.value.sampleCount).toBe(3);
        expect(result.value.statistics.medianPostMealMgDl).toBe(
          mode === 'USER' ? 110 : 999,
        );
        expect(
          result.value.matchedMealIds.every((id) =>
            id.startsWith(mode === 'USER' ? 'u' : 'd'),
          ),
        ).toBe(true);
      }
    }
    const excluded = await getPersonalResponse(q, meals, glucose, 'USER', 'u0');
    expect(excluded.ok && excluded.value.dataQuality).toBe('SPARSE');
    const current = await getWeeklySummary(
      meals,
      glucose,
      new Date('2026-09-19T12:00:00'),
    );
    expect(current.ok && current.value.loggedMealCount).toBe(6);
    const old = await getWeeklySummary(
      meals,
      glucose,
      new Date('2020-01-01T12:00:00'),
    );
    expect(old.ok && old.value.loggedMealCount).toBe(0);
    await db.glucoseReadings.put({
      id: 'broken',
      measuredAt: 'invalid',
      mealId: null,
      isDemo: 0,
      schemaVersion: 1,
      value: {} as never,
    });
    expect(await getPersonalResponse(q, meals, glucose, 'USER')).toMatchObject({
      ok: false,
      error: { code: 'STORAGE_READ_FAILED' },
    });
  } finally {
    await db.delete();
  }
});
