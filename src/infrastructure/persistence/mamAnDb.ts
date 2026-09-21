import { migrateV1Meal, MigrationFailure } from './migrateV1';
import { readGlucoseRow } from './legacyV1Schemas';
import Dexie, { type Table } from 'dexie';
import type { MealRowV2, GlucoseRowV1 } from './persistenceSchemas';
import type { ThumbnailRecord } from '../../application/ports/thumbnailRepository';
export class MamAnDb extends Dexie {
  meals!: Table<MealRowV2, string>;
  glucoseReadings!: Table<GlucoseRowV1, string>;
  thumbnails!: Table<ThumbnailRecord, string>;
  settings!: Table<{ key: string; value: unknown }, string>;
  meta!: Table<{ key: string; value: unknown }, string>;
  constructor(name = 'mam-an') {
    super(name);
    this.version(1).stores({
      meals: 'id, createdAt, isDemo',
      glucoseReadings: 'id, measuredAt, mealId, isDemo',
      thumbnails: 'id, mealId, isDemo',
      settings: 'key',
      meta: 'key',
    });
    this.version(2).stores({
      meals: 'id, createdAt, isDemo', glucoseReadings: 'id, measuredAt, mealId, isDemo', thumbnails: 'id, mealId, isDemo', settings: 'key', meta: 'key',
    }).upgrade(async tx => {
      try {
        const rows = await tx.table('meals').toArray();
        const migrated = rows.map(migrateV1Meal);
        (await tx.table('glucoseReadings').toArray()).forEach(readGlucoseRow);
        await tx.table('meals').bulkPut(migrated);
        await tx.table('meta').put({ key: 'data-schema-version', value: 2 });
      } catch { throw new MigrationFailure(); }
    });
  }
}
