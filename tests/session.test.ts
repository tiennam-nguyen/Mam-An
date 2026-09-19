import { it, expect, vi } from 'vitest';
import { AnalysisSessionService } from '../src/application/services/analysisSessionService';
import { MockLLM } from '../src/infrastructure/demo/mockLlm';
import { catalog, now } from './fixtures/helpers';
import { ok } from '../src/domain/common/result';
import { fail } from '../src/shared/errors/appError';
import type {
  AiGateway,
  AnalysisResult,
} from '../src/application/ports/aiGateway';
import type { MealRepository } from '../src/application/ports/mealRepository';
import type { Result } from '../src/domain/common/result';
import type { AppError } from '../src/shared/errors/appError';
function setup(live: AiGateway = new MockLLM(), repo?: MealRepository) {
  let n = 0;
  const meals: MealRepository = repo ?? {
    save: vi.fn(async () => ok(undefined)),
    getById: async () => ok(null),
    list: async () => ok([]),
  };
  const images = {
    prepare: async () =>
      ok({
        analysisBlob: new Blob(['pixels'], { type: 'image/jpeg' }),
        thumbnail: null,
      }),
  };
  return {
    service: new AnalysisSessionService(
      catalog,
      live,
      new MockLLM(),
      images,
      meals,
      { now: () => now },
      () => String(++n),
    ),
    meals,
  };
}
it('sample never calls live and double submit saves once', async () => {
  const live = {
      analyzeMealImage: vi.fn(async () => fail('AI_UNAVAILABLE', 'AI')),
    },
    { service, meals } = setup(live);
  await service.sample();
  expect(live.analyzeMealImage).not.toHaveBeenCalled();
  expect(service.getSnapshot().draft?.analysisState).toBe('REVIEW_READY');
  await Promise.all([service.save(), service.save()]);
  expect(meals.save).toHaveBeenCalledTimes(1);
});
it('late success after manual correction or replacement is discarded', async () => {
  let resolve: (r: Result<AnalysisResult, AppError>) => void = () => {};
  const live = {
      analyzeMealImage: vi.fn(
        () =>
          new Promise<Result<AnalysisResult, AppError>>((r) => {
            resolve = r;
          }),
      ),
    },
    { service } = setup(live);
  await service.select(new Blob(['x']), 'FILE');
  const pending = service.analyze();
  service.manual();
  const current = service.getSnapshot().draft!;
  service.edit([
    {
      itemId: 'custom' as (typeof current.items)[number]['itemId'],
      foodId: null,
      displayName: 'User choice',
      portionMultiplier: 1,
      portionLabel: '1 phần',
      carbEstimate: null,
      kcalEstimate: null,
      nutritionState: 'UNKNOWN',
      userCorrected: true,
      includedInTotal: true,
    },
  ]);
  resolve(
    ok({
      requestId: 'late',
      candidates: [
        {
          rawName: 'Cơm trắng',
          suggestedPortionMultiplier: 1,
          suggestedPortionLabel: null,
          providerConfidence: null,
        },
      ],
    }),
  );
  await pending;
  expect(service.getSnapshot().draft?.items[0]?.displayName).toBe(
    'User choice',
  );
});
it('failed save keeps draft and retry uses the same ID', async () => {
  const savedIds: string[] = [],
    repo: MealRepository = {
      save: async (meal) => {
        savedIds.push(meal.id);
        return savedIds.length === 1
          ? fail('STORAGE_WRITE_FAILED', 'STORAGE', true)
          : ok(undefined);
      },
      getById: async () => ok(null),
      list: async () => ok([]),
    },
    { service } = setup(new MockLLM(), repo);
  await service.sample();
  await service.save();
  expect(service.getSnapshot().draft?.analysisState).toBe('SAVE_ERROR');
  expect(service.getSnapshot().draft?.items).toHaveLength(3);
  await service.save();
  expect(savedIds[0]).toBe(savedIds[1]);
  expect(service.getSnapshot().draft?.analysisState).toBe('SAVED');
});
it('live failure preserves selected image, retry succeeds, edits/add/remove recompute', async () => {
  let calls = 0;
  const live: AiGateway = { analyzeMealImage: async input => ++calls === 1 ? fail('AI_TIMEOUT', 'AI', true) : new MockLLM().analyzeMealImage(input) };
  const { service } = setup(live);
  expect(service.getSnapshot().draft).toBeNull();
  await service.select(new Blob(['x']), 'FILE');
  expect(service.getSnapshot().draft?.analysisState).toBe('IMAGE_SELECTED');
  await service.analyze();
  expect(service.getSnapshot().draft?.analysisState).toBe('ANALYSIS_ERROR');
  expect(service.getSnapshot().draft?.imagePreviewUrl).toMatch(/^blob:/);
  await service.analyze();
  expect(service.getSnapshot().draft?.analysisState).toBe('REVIEW_READY');
  const items = service.getSnapshot().draft!.items;
  service.edit([{ ...items[0]!, portionMultiplier: 0.5, userCorrected: true }]);
  expect(service.getSnapshot().draft?.totalCarbEstimate).toBe(14.7);
  service.edit([]);
  expect(service.getSnapshot().draft?.totalCarbEstimate).toBeNull();
  service.edit(items);
  expect(service.getSnapshot().draft?.items.length).toBe(items.length);
  service.cancel();
  expect(service.getSnapshot().draft).toBeNull();
});
