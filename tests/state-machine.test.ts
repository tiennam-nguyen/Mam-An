import { expect, it } from 'vitest';
import { transition, type MealAnalysisState, type MealAnalysisEvent } from '../src/domain/meal/mealAnalysisState';
const cases: [MealAnalysisState, MealAnalysisEvent, MealAnalysisState][] = [
  ['IDLE','IMAGE_SELECTED','IMAGE_SELECTED'], ['IDLE','MANUAL_REVIEW_READY','REVIEW_READY'],
  ['IMAGE_SELECTED','ANALYZE_REQUESTED','ANALYZING'], ['IMAGE_SELECTED','MANUAL_REVIEW_READY','REVIEW_READY'],
  ['ANALYZING','ANALYSIS_SUCCEEDED','REVIEW_READY'], ['ANALYZING','ANALYSIS_FAILED','ANALYSIS_ERROR'],
  ['ANALYSIS_ERROR','RETRY_ANALYSIS','ANALYZING'], ['ANALYSIS_ERROR','MANUAL_REVIEW_READY','REVIEW_READY'],
  ['REVIEW_REQUIRED','DRAFT_CHANGED','REVIEW_READY'], ['REVIEW_READY','DRAFT_CHANGED','REVIEW_READY'],
  ['REVIEW_READY','SAVE_REQUESTED','SAVING'], ['SAVING','SAVE_SUCCEEDED','SAVED'],
  ['SAVING','SAVE_FAILED','SAVE_ERROR'], ['SAVE_ERROR','RETRY_SAVE','SAVING'], ['SAVE_ERROR','DRAFT_CHANGED','REVIEW_READY'],
];
it.each(cases)('%s + %s → %s', (state, event, next) => expect(transition(state,event)).toBe(next));
it.each(['IDLE','IMAGE_SELECTED','ANALYZING','REVIEW_REQUIRED','REVIEW_READY','SAVED','ANALYSIS_ERROR','SAVE_ERROR'] as const)('can cancel %s', state => expect(transition(state,'CANCEL')).toBe('IDLE'));
it('saving cannot be canceled, and unresolved review cannot save', () => {
  expect(() => transition('SAVING','CANCEL')).toThrow();
  expect(() => transition('REVIEW_REQUIRED','SAVE_REQUESTED')).toThrow();
  expect(transition('ANALYZING','ANALYSIS_SUCCEEDED',true)).toBe('REVIEW_REQUIRED');
  expect(transition('REVIEW_REQUIRED','DRAFT_CHANGED',true)).toBe('REVIEW_REQUIRED');
});
