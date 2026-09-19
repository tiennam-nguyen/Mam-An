export type MealAnalysisState = 'IDLE' | 'IMAGE_SELECTED' | 'ANALYZING' | 'REVIEW_REQUIRED' | 'REVIEW_READY' | 'ANALYSIS_ERROR' | 'SAVING' | 'SAVED' | 'SAVE_ERROR';
export type MealAnalysisEvent = 'IMAGE_SELECTED' | 'ANALYZE_REQUESTED' | 'ANALYSIS_SUCCEEDED' | 'ANALYSIS_FAILED' | 'MANUAL_REVIEW_READY' | 'DRAFT_CHANGED' | 'SAVE_REQUESTED' | 'SAVE_SUCCEEDED' | 'SAVE_FAILED' | 'RETRY_ANALYSIS' | 'RETRY_SAVE' | 'CANCEL';
export function transition(state: MealAnalysisState, event: MealAnalysisEvent, requiresReview = false): MealAnalysisState {
  if (event === 'CANCEL' && state !== 'SAVING') return 'IDLE';
  const next: Partial<Record<MealAnalysisState, Partial<Record<MealAnalysisEvent, MealAnalysisState>>>> = {
    IDLE: { IMAGE_SELECTED: 'IMAGE_SELECTED', MANUAL_REVIEW_READY: 'REVIEW_READY' },
    IMAGE_SELECTED: { ANALYZE_REQUESTED: 'ANALYZING', MANUAL_REVIEW_READY: 'REVIEW_READY' },
    ANALYZING: { ANALYSIS_SUCCEEDED: requiresReview ? 'REVIEW_REQUIRED' : 'REVIEW_READY', ANALYSIS_FAILED: 'ANALYSIS_ERROR' },
    ANALYSIS_ERROR: { RETRY_ANALYSIS: 'ANALYZING', MANUAL_REVIEW_READY: 'REVIEW_READY' },
    REVIEW_REQUIRED: { DRAFT_CHANGED: requiresReview ? 'REVIEW_REQUIRED' : 'REVIEW_READY' },
    REVIEW_READY: { DRAFT_CHANGED: 'REVIEW_READY', SAVE_REQUESTED: 'SAVING' },
    SAVING: { SAVE_SUCCEEDED: 'SAVED', SAVE_FAILED: 'SAVE_ERROR' },
    SAVE_ERROR: { RETRY_SAVE: 'SAVING', DRAFT_CHANGED: 'REVIEW_READY' },
  };
  const target = next[state]?.[event];
  if (!target) throw new Error(`Illegal transition: ${state}/${event}`);
  return target;
}
