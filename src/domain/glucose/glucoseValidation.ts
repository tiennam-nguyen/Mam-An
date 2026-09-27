import type { GlucoseReading, GlucoseUnit } from './glucoseReading';
// Entry capacity/precision limits, not diagnostic thresholds. Historical rows
// retain their original values; the same predicate governs statistical eligibility.
export function isGlucoseValueUsable(
  value: number,
  unit: GlucoseUnit,
): boolean {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    return false;
  if (unit === 'MG_DL') return value <= 999 && Number.isInteger(value);
  if (unit !== 'MMOL_L') return false;
  return value >= 0.1 && value <= 99.9 && Number(value.toFixed(1)) === value;
}
export const glucoseInputHint = (unit: GlucoseUnit) =>
  unit === 'MMOL_L'
    ? 'Nhập từ 0,1 đến 99,9 mmol/L, tối đa 1 số sau dấu phẩy (ví dụ 6,7).'
    : 'Nhập số nguyên từ 1 đến 999 mg/dL (ví dụ 120).';
export function parseGlucoseInput(
  text: string,
  unit: GlucoseUnit,
): number | null {
  if (typeof text !== 'string' || text !== text.trim()) return null;
  // Validate the whole string before Number: no exponent, signs, grouping,
  // whitespace or mixed separators; comma and dot each mean decimal separator.
  const pattern = unit === 'MMOL_L' ? /^\d{1,2}(?:[.,]\d)?$/ : /^\d{1,3}$/;
  if (!pattern.test(text)) return null;
  const value = Number(text.replace(',', '.'));
  return isGlucoseValueUsable(value, unit) ? value : null;
}
export function isValidGlucose(reading: GlucoseReading): boolean {
  return (
    isGlucoseValueUsable(reading.value, reading.unit) &&
    ['MG_DL', 'MMOL_L'].includes(reading.unit) &&
    Number.isFinite(Date.parse(reading.measuredAt)) &&
    (reading.timingTag === null ||
      ['BEFORE_MEAL', 'AFTER_MEAL', 'OTHER'].includes(reading.timingTag))
  );
}
