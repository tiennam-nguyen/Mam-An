import { isMigrationFailure } from './migrateV1';
import type {
  MealRepository,
  MealListQuery,
} from '../../application/ports/mealRepository';
import type { MealId } from '../../domain/common/brandedIds';
import type { Meal } from '../../domain/meal/meal';
import type { ThumbnailRecord } from '../../application/ports/thumbnailRepository';
import { ok } from '../../domain/common/result';
import { fail } from '../../shared/errors/appError';
import { MamAnDb } from './mamAnDb';
import { parseMeal, readMealRow, toMealRow } from './persistenceSchemas';
export class DexieMealRepository implements MealRepository {
  constructor(private db: MamAnDb) {}
  async save(meal: Meal, thumbnail: ThumbnailRecord | null) {
    try {
      const m = parseMeal(meal);
      if (
        thumbnail &&
        (thumbnail.mealId !== m.id ||
          m.thumbnailRef?.kind !== 'IDB_BLOB' ||
          m.thumbnailRef.id !== thumbnail.id ||
          thumbnail.isDemo !== m.isDemo ||
          thumbnail.blob.size === 0 ||
          thumbnail.blob.size > 200000 ||
          thumbnail.mimeType !== thumbnail.blob.type)
      )
        throw new Error('Thumbnail mismatch');
      if (m.thumbnailRef?.kind === 'IDB_BLOB' && !thumbnail)
        throw new Error('Missing thumbnail');
      await this.db.transaction(
        'rw',
        this.db.meals,
        this.db.thumbnails,
        async () => {
          if (thumbnail) await this.db.thumbnails.put(thumbnail);
          await this.db.meals.put(toMealRow(m));
        },
      );
      return ok(undefined);
    } catch (error) {
      return fail(isMigrationFailure(error) ? 'MIGRATION_FAILED' : 'STORAGE_WRITE_FAILED', 'STORAGE', true);
    }
  }
  async getById(id: MealId) {
    try {
      const row = await this.db.meals.get(id);
      return ok(row ? readMealRow(row) : null);
    } catch (error) {
      return fail(isMigrationFailure(error) ? 'MIGRATION_FAILED' : 'STORAGE_READ_FAILED', 'STORAGE', true);
    }
  }
  async list(query: MealListQuery = {}) {
    try {
      const rows = await this.db.meals.toArray();
      const meals = rows
        .map(readMealRow)
        .filter(
          (m) =>
            (!query.fromInclusive || m.createdAt >= query.fromInclusive) &&
            (!query.toExclusive || m.createdAt < query.toExclusive) &&
            (query.isDemo === undefined || m.isDemo === query.isDemo),
        );
      return ok(meals.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (error) {
      return fail(isMigrationFailure(error) ? 'MIGRATION_FAILED' : 'STORAGE_READ_FAILED', 'STORAGE', true);
    }
  }
}
