import Dexie, { type Table } from 'dexie';
import type { MealRowV1, GlucoseRowV1 } from './persistenceSchemas';
import type { ThumbnailRecord } from '../../application/ports/thumbnailRepository';
export class MamAnDb extends Dexie {
  meals!: Table<MealRowV1, string>;
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
  }
}
