import type { MealDraft } from '../../domain/meal/mealDraft';
import type { AnalysisResult } from '../ports/aiGateway';
import type { FoodCatalog } from '../ports/foodCatalog';
import {
  foodRole,
  calculateComponent,
  flattenEntries,
  entryTotals,
  referencePortion,
  type MealEntry,
  type MealComponent,
} from '../../domain/meal/mealEntry';
import { instantiateTemplate } from '../../domain/meal/dishTemplate';
import {
  resolvePortionPhrase,
  selectPortion,
} from '../../domain/food/portionResolver';
import { normalizeFoodName } from '../../domain/food/normalizeFoodName';
import type { FoodId } from '../../domain/common/brandedIds';
export function applyAnalysisResult(
  draft: MealDraft,
  result: AnalysisResult,
  catalog: FoodCatalog,
): MealDraft {
  if (
    draft.analysisState !== 'ANALYZING' ||
    draft.entries.some(
      (e) => e.userCorrected || e.components.some((c) => c.userCorrected),
    )
  )
    return draft;
  const entries: MealEntry[] = result.candidates.map((candidate, index) => {
    const id = draft.sessionId + ':' + index;
    const templates = catalog.listDishTemplates?.() ?? [];
    const exact = templates.filter((t) =>
      [t.nameVi, ...t.aliases].some(
        (a) => normalizeFoodName(a) === normalizeFoodName(candidate.rawName),
      ),
    );
    const template =
      templates.find((t) => t.id === candidate.candidateDishTemplateId) ??
      (exact.length === 1 ? exact[0] : undefined);
    let entry: MealEntry = template
      ? instantiateTemplate(template, id, (foodId) =>
          catalog.getFoodById(foodId as FoodId),
        )
      : {
          entryId: id,
          dishTemplateId: null,
          displayName: candidate.rawName,
          userCorrected: false,
          components: [],
        };
    const suggestions = candidate.suggestedComponents?.length
      ? candidate.suggestedComponents
      : template
        ? []
        : [{ ...candidate, role: 'OTHER' as const }];
    for (const [i, s] of suggestions.entries()) {
      const matches = catalog.findExactByAlias(s.rawName),
        food = matches.length === 1 ? matches[0]! : null;
      let portion = referencePortion(food),
        portionNeedsReview = false;
      if (s.suggestedPortionLabel) {
        const resolution = resolvePortionPhrase(
          s.suggestedPortionLabel,
          food ? (catalog.getPortionUnits?.(food.id) ?? []) : [],
        );
        if (resolution.state === 'RESOLVED')
          portion = selectPortion(resolution.matches[0]!);
        else portionNeedsReview = true;
      }
      if (
        s.suggestedPortionMultiplier !== null &&
        Number.isFinite(s.suggestedPortionMultiplier) &&
        s.suggestedPortionMultiplier > 0
      )
        portion = { ...portion, quantity: s.suggestedPortionMultiplier };
      const role = s.role === 'OTHER' ? foodRole(food) : s.role;
      const current = entry.components.find(
        (c) => c.role === role && food && c.foodId === food.id,
      );
      const component: MealComponent = calculateComponent(
        {
          componentId: current?.componentId ?? id + ':component:' + i,
          foodId: food?.id ?? null,
          displayName: food?.nameVi ?? s.rawName,
          role,
          portion,
          source: 'AI',
          userCorrected: false,
          includedInTotal: true,
          carbEstimate: null,
          kcalEstimate: null,
          nutritionState: 'UNKNOWN',
          matchState:
            portionNeedsReview || matches.length > 1
              ? 'AMBIGUOUS'
              : food
                ? 'MATCHED'
                : 'UNMATCHED',
        },
        food,
      );
      entry = {
        ...entry,
        components: current
          ? entry.components.map((c) =>
              c.componentId === current.componentId ? component : c,
            )
          : [...entry.components, component],
      };
    }
    return entry;
  });
  const requiresReview = entries.some((e) =>
    e.components.some(
      (c) => c.matchState !== 'MATCHED' || c.source === 'TEMPLATE',
    ),
  );
  return {
    ...draft,
    entries,
    items: flattenEntries(entries),
    ...entryTotals(entries),
    analysisState: requiresReview ? 'REVIEW_REQUIRED' : 'REVIEW_READY',
  };
}
