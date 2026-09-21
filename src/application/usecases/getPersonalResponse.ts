import type { MealDraft } from '../../domain/meal/mealDraft';
import type { MealRepository } from '../ports/mealRepository';
import type { GlucoseRepository } from '../ports/glucoseRepository';
import { buildPatternEvidence } from '../../domain/personal/personalResponse';
import { ok } from '../../domain/common/result';
export async function getPersonalResponse(query: Pick<MealDraft, 'entries' | 'totalCarbEstimate'>, meals: MealRepository, glucose: GlucoseRepository, mode: 'USER' | 'DEMO', excludeId?: string) {
  const [m, g] = await Promise.all([meals.list({ isDemo: mode === 'DEMO' }), glucose.list({ isDemo: mode === 'DEMO' })]);
  if (!m.ok) return m; if (!g.ok) return g;
  return ok(buildPatternEvidence(query, m.value, g.value, mode, 3, excludeId));
}
