import type { MealDraft } from '../../domain/meal/mealDraft';
import type { MealId, ThumbnailId } from '../../domain/common/brandedIds';
import type { MealRepository } from '../ports/mealRepository';
import type { ThumbnailRecord } from '../ports/thumbnailRepository';
import { buildSnapshot } from '../../domain/meal/snapshotBuilder';
import { ok } from '../../domain/common/result';
import { fail } from '../../shared/errors/appError';
export async function saveMeal(
  draft: MealDraft,
  id: MealId,
  createdAt: string,
  version: string,
  repository: MealRepository,
) {
  if (
    !['REVIEW_READY', 'SAVE_ERROR'].includes(draft.analysisState) ||
    !draft.items.length
  )
    return fail('INVALID_INPUT');
  const thumbnail: ThumbnailRecord | null = draft.pendingThumbnail
    ? {
        id: (id + ':thumbnail') as ThumbnailId,
        mealId: id,
        blob: draft.pendingThumbnail,
        mimeType: 'image/jpeg',
        createdAt,
        isDemo: draft.source === 'DEMO_SAMPLE',
      }
    : null;
  try {
    const meal = buildSnapshot(
      draft,
      id,
      createdAt,
      version,
      thumbnail
        ? { kind: 'IDB_BLOB', id: thumbnail.id }
        : draft.source === 'DEMO_SAMPLE'
          ? { kind: 'BUNDLED_ASSET', path: '/demo/images/meal.svg' }
          : null,
    );
    const result = await repository.save(meal, thumbnail);
    return result.ok ? ok(meal) : result;
  } catch {
    return fail('INVALID_INPUT');
  }
}
