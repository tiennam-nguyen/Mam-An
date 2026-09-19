import type {
  GlucoseRepository,
  GlucoseListQuery,
} from '../../application/ports/glucoseRepository';
import type { GlucoseReadingId } from '../../domain/common/brandedIds';
import type { GlucoseReading } from '../../domain/glucose/glucoseReading';
import { ok } from '../../domain/common/result';
import { fail } from '../../shared/errors/appError';
import { MamAnDb } from './mamAnDb';
import {
  parseGlucose,
  readGlucoseRow,
  toGlucoseRow,
} from './persistenceSchemas';
export class DexieGlucoseRepository implements GlucoseRepository {
  constructor(private db: MamAnDb) {}
  async save(reading: GlucoseReading) {
    try {
      await this.db.glucoseReadings.put(toGlucoseRow(parseGlucose(reading)));
      return ok(undefined);
    } catch {
      return fail('STORAGE_WRITE_FAILED', 'STORAGE', true);
    }
  }
  async getById(id: GlucoseReadingId) {
    try {
      const row = await this.db.glucoseReadings.get(id);
      return ok(row ? readGlucoseRow(row) : null);
    } catch {
      return fail('STORAGE_READ_FAILED', 'STORAGE', true);
    }
  }
  async list(query: GlucoseListQuery = {}) {
    try {
      const rows = await this.db.glucoseReadings.toArray();
      return ok(
        rows
          .map(readGlucoseRow)
          .filter(
            (g) =>
              (!query.fromInclusive || g.measuredAt >= query.fromInclusive) &&
              (!query.toExclusive || g.measuredAt < query.toExclusive) &&
              (!query.mealId || g.mealId === query.mealId) &&
              (query.isDemo === undefined || g.isDemo === query.isDemo),
          )
          .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt)),
      );
    } catch {
      return fail('STORAGE_READ_FAILED', 'STORAGE', true);
    }
  }
}
