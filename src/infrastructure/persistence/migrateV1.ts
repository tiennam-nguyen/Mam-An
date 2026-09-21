import { readMealRow } from './legacyV1Schemas';
import { entriesFromItems } from '../../domain/meal/mealEntry';
export class MigrationFailure extends Error {
  constructor() {
    super('MIGRATION_FAILED');
    this.name = 'MigrationFailure';
  }
}
export function migrateV1Meal(row: unknown) {
  try {
    const old = readMealRow(row);
    return {
      id: old.id,
      createdAt: old.createdAt,
      isDemo: (old.isDemo ? 1 : 0) as 0 | 1,
      schemaVersion: 2 as const,
      value: {
        ...old,
        schemaVersion: 2 as const,
        entries: entriesFromItems(old.items, 'MIGRATION'),
      },
    };
  } catch {
    throw new MigrationFailure();
  }
}
export function isMigrationFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'MigrationFailure' ||
      error.message.includes('MIGRATION_FAILED'))
  );
}
