import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { it, expect } from 'vitest';
import fixture from '../fixtures/persisted-v1-meal.json';
import { MamAnDb } from '../../src/infrastructure/persistence/mamAnDb';
import { DexieMealRepository } from '../../src/infrastructure/persistence/dexieMealRepository';
const stores = { meals: 'id, createdAt, isDemo', glucoseReadings: 'id, measuredAt, mealId, isDemo', thumbnails: 'id, mealId, isDemo', settings: 'key', meta: 'key' };
async function oldDatabase(rows: unknown[]) {
  const name = 'migration-' + crypto.randomUUID();
  const old = new Dexie(name); old.version(1).stores(stores);
  await old.open(); await old.table('meals').bulkPut(rows); old.close(); return name;
}
for (const kind of ['empty', 'known', 'unknown', 'multiple', 'mixed', 'null-thumbnail'] as const) it('migrates actual v1: ' + kind, async () => {
  const row = structuredClone(fixture);
  if (kind !== 'multiple') row.value.items = row.value.items.slice(0, 1);
  if (kind === 'unknown') Object.assign(row.value.items[0]!, { foodId: null, carbEstimate: null, kcalEstimate: null, nutritionState: 'UNKNOWN' });
  if (kind === 'null-thumbnail') (row.value as { thumbnailRef: unknown }).thumbnailRef = null;
  const user = structuredClone(row); user.id = user.value.id = 'user'; user.isDemo = 0; user.value.isDemo = false;
  const rows = kind === 'empty' ? [] : kind === 'mixed' ? [row, user] : [row];
  const name = await oldDatabase(rows); const db = new MamAnDb(name);
  try {
    await db.open(); expect(db.verno).toBe(2);
    const migrated = await db.meals.toArray(); expect(migrated).toHaveLength(rows.length);
    for (const original of rows) {
      const result = migrated.find(m => m.id === original.id)!;
      expect(result.value.totalCarbEstimate).toBe(original.value.totalCarbEstimate);
      expect(result.value.items).toEqual(original.value.items);
      expect(result.value.thumbnailRef).toEqual(original.value.thumbnailRef);
      expect(result.value.entries).toHaveLength(original.value.items.length);
      result.value.entries.forEach((e, i) => {
        expect(e.components[0]!.carbEstimate).toBe(original.value.items[i]!.carbEstimate);
        expect(e.components[0]!.portion.factorToReferenceSnapshot).toBe(1);
        expect(e.components[0]!.role).toBe('OTHER');
      });
    }
  } finally { await db.delete(); }
});
it('malformed v1 aborts upgrade, preserves every original row, and blocks repositories', async () => {
  const broken = { ...fixture, id: 'malformed' };
  const name = await oldDatabase([fixture, broken]); const db = new MamAnDb(name);
  const result = await new DexieMealRepository(db).list();
  expect(result.ok).toBe(false); if (!result.ok) expect(result.error.code).toBe('MIGRATION_FAILED');
  db.close(); const old = new Dexie(name); old.version(1).stores(stores);
  try { await old.open(); expect(old.verno).toBe(1); expect(await old.table('meals').count()).toBe(2); expect(await old.table('meals').get(fixture.id)).toEqual(fixture); }
  finally { await old.delete(); }
});
