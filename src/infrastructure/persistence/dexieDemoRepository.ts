import { isMigrationFailure } from './migrateV1';
import type { DemoRepository } from '../../application/ports/demoRepository';
import type { Meal } from '../../domain/meal/meal';
import type { GlucoseReading } from '../../domain/glucose/glucoseReading';
import { MamAnDb } from './mamAnDb';
import {
  parseMeal,
  parseGlucose,
  toMealRow,
  toGlucoseRow,
} from './persistenceSchemas';
import { ok } from '../../domain/common/result';
import { fail } from '../../shared/errors/appError';
export class DexieDemoRepository implements DemoRepository {
  constructor(private db: MamAnDb) {}
  async seed(
    version: string,
    meals: readonly Meal[],
    readings: readonly GlucoseReading[],
    force: boolean,
  ) {
    try {
      if (meals.some((m) => !m.isDemo) || readings.some((g) => !g.isDemo))
        throw new Error('Demo rows only');
      await this.db.transaction(
        'rw',
        [
          this.db.meals,
          this.db.glucoseReadings,
          this.db.thumbnails,
          this.db.meta,
        ],
        async () => {
          const marker = await this.db.meta.get('demo-seed-version');
          const existing = await this.db.meals.bulkGet(meals.map((m) => m.id)),
            existingGlucose = await this.db.glucoseReadings.bulkGet(
              readings.map((g) => g.id),
            );
          if (
            existing.some((r) => r && !r.value.isDemo) ||
            existingGlucose.some((r) => r && !r.value.isDemo)
          )
            throw new Error('User ID collision');
          if (
            !force &&
            marker?.value === version &&
            existing.every(Boolean) &&
            existingGlucose.every(Boolean)
          )
            return;
          const removed = await this.db.meals
            .filter((r) => r.value.isDemo)
            .primaryKeys();
          await this.db.meals.bulkDelete(removed);
          await this.db.glucoseReadings.filter((r) => r.value.isDemo).delete();
          await this.db.thumbnails.filter((r) => r.isDemo).delete();
          await this.db.meals.bulkPut(
            meals.map((m) => toMealRow(parseMeal(m))),
          );
          await this.db.glucoseReadings.bulkPut(
            readings.map((g) => toGlucoseRow(parseGlucose(g))),
          );
          await this.db.meta.put({ key: 'demo-seed-version', value: version });
        },
      );
      return ok(undefined);
    } catch (error) {
      return fail(isMigrationFailure(error) ? 'MIGRATION_FAILED' : 'STORAGE_WRITE_FAILED', 'STORAGE', true);
    }
  }
}
