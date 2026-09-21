import type { GlucoseReadingId, MealId } from '../common/brandedIds';
export type GlucoseUnit = 'MG_DL' | 'MMOL_L';
export interface GlucoseReading {
  id: GlucoseReadingId;
  source?: 'MANUAL' | 'DEVICE' | 'DEMO';
  value: number;
  unit: GlucoseUnit;
  measuredAt: string;
  mealId: MealId | null;
  timingTag: 'BEFORE_MEAL' | 'AFTER_MEAL' | 'OTHER' | null;
  note: string | null;
  isDemo: boolean;
}
export interface UserSettings {
  glucoseUnit: GlucoseUnit;
  demoModeEnabled: boolean;
}
