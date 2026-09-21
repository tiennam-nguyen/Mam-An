import { isMigrationFailure } from './migrateV1';
import { MamAnDb } from './mamAnDb';
import type { SettingsRepository } from '../../application/ports/settingsRepository';
import type { UserSettings } from '../../domain/glucose/glucoseReading';
import { parseSettings } from './persistenceSchemas';
import { ok } from '../../domain/common/result';
import { fail } from '../../shared/errors/appError';
export class DexieSettingsRepository implements SettingsRepository {
  constructor(private db: MamAnDb) {}
  async get() {
    try {
      const row = await this.db.settings.get('user-settings');
      return ok(
        row
          ? parseSettings(row.value)
          : { glucoseUnit: 'MMOL_L' as const, demoModeEnabled: false },
      );
    } catch (error) {
      return fail(isMigrationFailure(error) ? 'MIGRATION_FAILED' : 'STORAGE_READ_FAILED', 'STORAGE', true);
    }
  }
  async save(settings: UserSettings) {
    try {
      await this.db.settings.put({
        key: 'user-settings',
        value: parseSettings(settings),
      });
      return ok(undefined);
    } catch (error) {
      return fail(isMigrationFailure(error) ? 'MIGRATION_FAILED' : 'STORAGE_WRITE_FAILED', 'STORAGE', true);
    }
  }
}
