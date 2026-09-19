import 'fake-indexeddb/auto';
import { afterEach, it, expect } from 'vitest';
import { MamAnDb } from '../../src/infrastructure/persistence/mamAnDb';
import { DexieMealRepository } from '../../src/infrastructure/persistence/dexieMealRepository';
import { DexieGlucoseRepository } from '../../src/infrastructure/persistence/dexieGlucoseRepository';
import { DexieDemoRepository } from '../../src/infrastructure/persistence/dexieDemoRepository';
import { catalog, meal, now } from '../fixtures/helpers';
import {
  seedDemoData,
  demoData,
} from '../../src/application/usecases/seedDemoData';
import type {
  MealId,
  ThumbnailId,
  GlucoseReadingId,
} from '../../src/domain/common/brandedIds';
import { aggregateWeekly } from '../../src/domain/summary/weeklyAggregator';
const databases: MamAnDb[] = [];
function database() {
  const db = new MamAnDb('test-' + crypto.randomUUID());
  databases.push(db);
  return db;
}
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete();
});
it('save/read survives closing and reopening; history is a snapshot', async () => {
  const db = database(),
    repo = new DexieMealRepository(db),
    m = { ...meal(), isDemo: false };
  expect((await repo.save(m, null)).ok).toBe(true);
  db.close();
  await db.open();
  const found = await new DexieMealRepository(db).getById(m.id);
  expect(found).toEqual({ ok: true, value: m });
  m.items[0]!.displayName = 'catalog changed';
  expect(await repo.getById(m.id)).not.toEqual({ ok: true, value: m });
});
it('forced meal write failure rolls back thumbnail too', async () => {
  const db = database(),
    repo = new DexieMealRepository(db),
    id = 'thumb' as ThumbnailId,
    m = { ...meal(), thumbnailRef: { kind: 'IDB_BLOB' as const, id } },
    thumb = {
      id,
      mealId: m.id,
      blob: new Blob(['pixels'], { type: 'image/jpeg' }),
      mimeType: 'image/jpeg' as const,
      createdAt: m.createdAt,
      isDemo: true,
    };
  const fail = () => {
    throw new Error('injected write failure');
  };
  db.meals.hook('creating', fail);
  expect((await repo.save(m, thumb)).ok).toBe(false);
  expect(await db.meals.count()).toBe(0);
  expect(await db.thumbnails.count()).toBe(0);
  db.meals.hook('creating').unsubscribe(fail);
  expect((await repo.save(m, thumb)).ok).toBe(true);
  expect(await db.thumbnails.count()).toBe(1);
});
it('schema corruption is read failure rather than empty history', async () => {
  const db = database(),
    repo = new DexieMealRepository(db);
  await db.meals.put({
    id: 'bad',
    createdAt: 'bad',
    isDemo: 0,
    schemaVersion: 1,
    value: meal(),
  });
  const result = await repo.list();
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe('STORAGE_READ_FAILED');
});
it('seed is idempotent; reset preserves user-created meals/readings', async () => {
  const db = database(),
    repo = new DexieDemoRepository(db),
    m = {
      ...meal(),
      id: 'user-meal' as MealId,
      isDemo: false,
      source: 'FILE' as const,
    };
  await new DexieMealRepository(db).save(m, null);
  const g = {
    ...demoData(catalog, now).readings[0]!,
    id: 'user-glucose' as GlucoseReadingId,
    isDemo: false,
    mealId: m.id,
  };
  await new DexieGlucoseRepository(db).save(g);
  expect((await seedDemoData(repo, catalog, now)).ok).toBe(true);
  expect((await seedDemoData(repo, catalog, now)).ok).toBe(true);
  expect(await db.meals.count()).toBe(8);
  expect((await seedDemoData(repo, catalog, now, true)).ok).toBe(true);
  expect(await new DexieMealRepository(db).getById(m.id)).toEqual({
    ok: true,
    value: m,
  });
  expect(await new DexieGlucoseRepository(db).getById(g.id)).toEqual({
    ok: true,
    value: g,
  });
});
it('version-one storage reopens and feeds weekly aggregation with linked glucose', async () => {
  const db = database();
  const m = meal();
  const reading = { ...demoData(catalog, now).readings[0]!, measuredAt: now.toISOString(), mealId: m.id };
  await new DexieMealRepository(db).save(m, null);
  await new DexieGlucoseRepository(db).save(reading);
  db.close();
  await db.open();
  expect(db.verno).toBe(1);
  const meals = await new DexieMealRepository(db).list();
  const readings = await new DexieGlucoseRepository(db).list();
  expect(meals.ok && readings.ok).toBe(true);
  if (meals.ok && readings.ok) {
    const summary = aggregateWeekly(meals.value, readings.value, now);
    expect(summary.loggedMealCount).toBe(1);
    expect(summary.glucoseReadings[0]!.mealId).toBe(m.id);
  }
});
