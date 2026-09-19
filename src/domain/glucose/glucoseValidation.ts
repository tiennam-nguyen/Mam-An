import type { GlucoseReading } from './glucoseReading';
export function isValidGlucose(reading: GlucoseReading): boolean {
  return Number.isFinite(reading.value) && reading.value > 0 && ['MG_DL', 'MMOL_L'].includes(reading.unit) && Number.isFinite(Date.parse(reading.measuredAt)) && (reading.timingTag === null || ['BEFORE_MEAL', 'AFTER_MEAL', 'OTHER'].includes(reading.timingTag));
}
