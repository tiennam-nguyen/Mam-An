import { expect, it, vi } from 'vitest';
import {
  isValidGlucose,
  parseGlucoseInput,
  isGlucoseValueUsable,
} from '../src/domain/glucose/glucoseValidation';
import { addGlucoseReading } from '../src/application/usecases/addGlucoseReading';
import { ok } from '../src/domain/common/result';
import type { GlucoseReading } from '../src/domain/glucose/glucoseReading';
const reading = (value: number): GlucoseReading => ({
  id: 'g' as never,
  value,
  unit: 'MMOL_L',
  measuredAt: '2026-09-26T10:00:00Z',
  mealId: null,
  timingTag: null,
  note: null,
  isDemo: false,
});
it.each([1e9, 1e308, 6.123456789, 6.70000000001, 100])(
  'rejects unsafe new measurement %s at domain and use case',
  async (value) => {
    const save = vi.fn(async () => ok(undefined));
    expect(isValidGlucose(reading(value))).toBe(false);
    expect(
      (await addGlucoseReading(reading(value), { save } as never, {} as never))
        .ok,
    ).toBe(false);
    expect(save).not.toHaveBeenCalled();
  },
);
it.each([
  '1e9',
  '1E+9',
  '1e-2',
  '2e309',
  '1e309',
  '',
  ' ',
  '6\n',
  '120\r\n',
  '\t6',
  '6 7',
  '-1',
  '0',
  'NaN',
  'Infinity',
  '12345678901234567890',
  '6.123',
  '6,7.1',
  '6x',
  ' 6.7',
  '6.7 ',
  '1,000',
])('rejects complete malformed input %j', (text) => {
  expect(parseGlucoseInput(text, 'MMOL_L')).toBeNull();
  expect(parseGlucoseInput(text, 'MG_DL')).toBeNull();
});
it.each([
  ['6,7', 6.7],
  ['6.7', 6.7],
  ['0,1', 0.1],
  ['99.9', 99.9],
])('parses accepted decimal %s exactly', (text, value) => {
  expect(parseGlucoseInput(String(text), 'MMOL_L')).toBe(value);
});
it('uses unit-aware precision without ceil or silent conversion', () => {
  expect(parseGlucoseInput('120', 'MG_DL')).toBe(120);
  expect(parseGlucoseInput('999', 'MG_DL')).toBe(999);
  expect(parseGlucoseInput('120.1', 'MG_DL')).toBeNull();
  expect(isGlucoseValueUsable(120.1, 'MG_DL')).toBe(false);
  expect(isGlucoseValueUsable('6.7' as never, 'MMOL_L')).toBe(false);
});
