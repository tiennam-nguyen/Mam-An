import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { it, expect } from 'vitest';
import fixture from '../fixtures/persisted-v1-meal.json';
import { MamAnDb } from '../../src/infrastructure/persistence/mamAnDb';
import { DexieMealRepository } from '../../src/infrastructure/persistence/dexieMealRepository';
import { flattenEntries } from '../../src/domain/meal/mealEntry';
const stores = {
  meals: 'id, createdAt, isDemo',
  glucoseReadings: 'id, measuredAt, mealId, isDemo',
  thumbnails: 'id, mealId, isDemo',
  settings: 'key',
  meta: 'key',
};
async function oldDatabase(rows: unknown[]) {
  const name = 'migration-' + crypto.randomUUID();
  const old = new Dexie(name);
  old.version(1).stores(stores);
  await old.open();
  await old.table('meals').bulkPut(rows);
  old.close();
  return name;
}
for (const kind of [
  'empty',
  'known',
  'unknown',
  'multiple',
  'mixed',
  'null-thumbnail',
] as const)
  it('migrates actual v1: ' + kind, async () => {
    const row = structuredClone(fixture);
    if (kind !== 'multiple') row.value.items = row.value.items.slice(0, 1);
    if (kind === 'unknown')
      Object.assign(row.value.items[0]!, {
        foodId: null,
        carbEstimate: null,
        kcalEstimate: null,
        nutritionState: 'UNKNOWN',
      });
    if (kind === 'null-thumbnail')
      (row.value as { thumbnailRef: unknown }).thumbnailRef = null;
    const user = structuredClone(row);
    user.id = user.value.id = 'user';
    user.isDemo = 0;
    user.value.isDemo = false;
    const rows = kind === 'empty' ? [] : kind === 'mixed' ? [row, user] : [row];
    const name = await oldDatabase(rows);
    const db = new MamAnDb(name);
    try {
      await db.open();
      expect(db.verno).toBe(2);
      const migrated = await db.meals.toArray();
      expect(migrated).toHaveLength(rows.length);
      for (const original of rows) {
        const result = migrated.find((m) => m.id === original.id)!;
        expect(result.value.totalCarbEstimate).toBe(
          original.value.totalCarbEstimate,
        );
        expect(result.value.items).toEqual(original.value.items);
        expect(result.value.thumbnailRef).toEqual(original.value.thumbnailRef);
        expect(result.value.entries).toHaveLength(original.value.items.length);
        result.value.entries.forEach((e, i) => {
          expect(e.components[0]!.carbEstimate).toBe(
            original.value.items[i]!.carbEstimate,
          );
          expect(e.components[0]!.portion.factorToReferenceSnapshot).toBe(1);
          expect(e.components[0]!.role).toBe('OTHER');
        });
      }
    } finally {
      await db.delete();
    }
  });
it('malformed v1 aborts upgrade, preserves every original row, and blocks repositories', async () => {
  const broken = { ...fixture, id: 'malformed' };
  const name = await oldDatabase([fixture, broken]);
  const db = new MamAnDb(name);
  const result = await new DexieMealRepository(db).list();
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe('MIGRATION_FAILED');
  db.close();
  const old = new Dexie(name);
  old.version(1).stores(stores);
  try {
    await old.open();
    expect(old.verno).toBe(1);
    expect(await old.table('meals').count()).toBe(2);
    expect(await old.table('meals').get(fixture.id)).toEqual(fixture);
  } finally {
    await old.delete();
  }
});

it('preserves unusual historical numbers, flags, blobs, linked glucose and settings across repeated opens', async () => {
  const row = structuredClone(fixture);
  Object.assign(row.value.items[0]!, {
    portionMultiplier: 0.125,
    carbEstimate: 0,
    kcalEstimate: 0,
    userCorrected: true,
    includedInTotal: false,
  });
  Object.assign(row.value.items[1]!, {
    portionMultiplier: 100000,
    carbEstimate: 0.123456789,
    kcalEstimate: null,
  });
  Object.assign(row.value.items[2]!, {
    foodId: null,
    carbEstimate: null,
    kcalEstimate: 12.3456,
    nutritionState: 'UNKNOWN',
  });
  Object.assign(row.value, {
    totalCarbEstimate: 999.123456789,
    totalKcalEstimate: 0,
    completeness: 'PARTIAL',
    note: 'Historical snapshot: never recalculate',
    thumbnailRef: { kind: 'IDB_BLOB', id: 'blob-old' },
  });
  const name = await oldDatabase([row]);
  const old = new Dexie(name);
  old.version(1).stores(stores);
  await old.open();
  const glucose = {
    id: 'linked',
    measuredAt: '2026-09-19T07:00:00.000Z',
    mealId: row.id,
    isDemo: 1,
    schemaVersion: 1,
    value: {
      id: 'linked',
      measuredAt: '2026-09-19T07:00:00.000Z',
      mealId: row.id,
      isDemo: true,
      value: 5.5,
      unit: 'MMOL_L',
      timingTag: 'AFTER_MEAL',
      note: 'private glucose',
    },
  };
  await old.table('glucoseReadings').put(glucose);
  await old
    .table('thumbnails')
    .put({
      id: 'blob-old',
      mealId: row.id,
      blob: new Blob(['unchanged pixels']),
      isDemo: true,
    });
  await old
    .table('settings')
    .put({
      key: 'user',
      value: { glucoseUnit: 'MMOL_L', demoModeEnabled: true },
    });
  old.close();
  const db = new MamAnDb(name);
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      await db.open();
      const saved = await db.meals.get(row.id);
      expect(saved!.value.items).toEqual(row.value.items);
      expect(flattenEntries(saved!.value.entries)).toEqual(row.value.items);
      for (const field of [
        'totalCarbEstimate',
        'totalKcalEstimate',
        'completeness',
        'note',
        'thumbnailRef',
        'catalogVersion',
        'createdAt',
        'source',
        'isDemo',
      ] as const)
        expect(saved!.value[field]).toEqual(row.value[field]);
      expect(await db.glucoseReadings.get('linked')).toEqual(glucose);
      expect(await (await db.thumbnails.get('blob-old'))!.blob.text()).toBe(
        'unchanged pixels',
      );
      expect(await db.settings.get('user')).toEqual({
        key: 'user',
        value: { glucoseUnit: 'MMOL_L', demoModeEnabled: true },
      });
      expect(
        (await new DexieMealRepository(db).getById(row.id as never)).ok,
      ).toBe(true);
      db.close();
    }
  } finally {
    await db.delete();
  }
});

it.each(['glucose', 'duplicate-item', 'number'])(
  'failed %s upgrade rolls back physically and fails again without deleting evidence',
  async (kind) => {
    const row = structuredClone(fixture);
    if (kind === 'duplicate-item')
      row.value.items[1]!.itemId = row.value.items[0]!.itemId;
    if (kind === 'number') row.value.items[0]!.portionMultiplier = 0;
    const name = await oldDatabase([row]);
    const old = new Dexie(name);
    old.version(1).stores(stores);
    await old.open();
    await old.table('meta').put({ key: 'sentinel', value: 'preserve' });
    if (kind === 'glucose')
      await old
        .table('glucoseReadings')
        .put({ id: 'invalid', value: { value: -1 } });
    const before = await Promise.all(
      Object.keys(stores).map((table) => old.table(table).toArray()),
    );
    old.close();
    const db = new MamAnDb(name);
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const reopened = new MamAnDb(name);
        const result = await new DexieMealRepository(reopened).list();
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe('MIGRATION_FAILED');
        reopened.close();
      }
      await old.open();
      expect(old.verno).toBe(1);
      expect(
        await Promise.all(
          Object.keys(stores).map((table) => old.table(table).toArray()),
        ),
      ).toEqual(before);
    } finally {
      old.close();
      await db.delete();
    }
  },
);

it.each([
  'carbEstimate',
  'portionMultiplier',
  'displayName',
  'includedInTotal',
])('rejects corrupt v2 compatibility projection: %s', async (field) => {
  const name = await oldDatabase([fixture]);
  const db = new MamAnDb(name);
  try {
    await db.open();
    const row = (await db.meals.get(fixture.id))!;
    Object.assign(row.value.items[0]!, {
      [field]:
        field === 'carbEstimate'
          ? 99
          : field === 'portionMultiplier'
            ? 2
            : field === 'displayName'
              ? 'changed'
              : false,
    });
    await db.meals.put(row);
    const result = await new DexieMealRepository(db).list();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('STORAGE_READ_FAILED');
    expect(await db.meals.count()).toBe(1);
  } finally {
    await db.delete();
  }
});
