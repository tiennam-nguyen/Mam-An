export const publicConfig = {
  appVersion: '0.2.0', dataSchemaVersion: 2 as const, catalogVersion: 'v2', knowledgeVersion: 'knowledge-v1', minPatternMeals: 3, similarityRuleVersion: 'meal-similarity-v1', glucoseObservationRuleVersion: 'glucose-observation-v1',
  textExplanationEnabled: import.meta.env.VITE_ENABLE_TEXT_EXPLANATION === 'true',
  features: { liveVision: import.meta.env.VITE_ENABLE_LIVE_AI === 'true', textExplanation: import.meta.env.VITE_ENABLE_TEXT_EXPLANATION === 'true', voiceInput: true, reportExport: true, deviceGlucose: false },
  liveEnabled: import.meta.env.VITE_ENABLE_LIVE_AI === 'true',
  buildId: import.meta.env.VITE_BUILD_ID || 'local',
  pwaEnabled: import.meta.env.VITE_ENABLE_PWA !== 'false',
};
