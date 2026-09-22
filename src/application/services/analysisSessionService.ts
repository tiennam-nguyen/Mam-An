import type { Meal } from '../../domain/meal/meal';
import { cloneEntries } from '../../domain/meal/mealEntry';
import {
  createScenario,
  applyScenario,
  type MealScenario,
  type ScenarioOperation,
} from '../../domain/meal/decisionSimulator';
import type { MealEntry } from '../../domain/meal/mealEntry';
import { correctMealEntries } from '../usecases/correctMealEntries';
import type {
  MealDraft,
  MealSource,
  MealDraftItem,
} from '../../domain/meal/mealDraft';
import type { MealId, AnalysisSessionId } from '../../domain/common/brandedIds';
import type { AppError } from '../../shared/errors/appError';
import { fail } from '../../shared/errors/appError';
import type { AiGateway } from '../ports/aiGateway';
import type { FoodCatalog } from '../ports/foodCatalog';
import type { MealRepository } from '../ports/mealRepository';
import type { ImageProcessor } from '../ports/imageProcessor';
import type { Clock } from '../ports/clock';
import { transition } from '../../domain/meal/mealAnalysisState';
import { applyAnalysisResult } from '../usecases/applyAnalysisResult';
import { correctMealItems } from '../usecases/correctMealItem';
import { saveMeal } from '../usecases/saveMeal';
export interface SessionView {
  draft: MealDraft | null;
  error: AppError | null;
  preparing: boolean;
  revision: number;
}
export class AnalysisSessionService {
  private view: SessionView = {
    draft: null,
    error: null,
    preparing: false,
    revision: 0,
  };
  private listeners = new Set<() => void>();
  private scenario: MealScenario | null = null;
  private token = 0;
  private controller: AbortController | null = null;
  private image: Blob | null = null;
  private saveId: MealId | null = null;
  private saveTime: string | null = null;
  constructor(
    private catalog: FoodCatalog,
    private live: AiGateway,
    private mock: AiGateway,
    private images: ImageProcessor,
    private meals: MealRepository,
    private clock: Clock,
    private id: () => string,
  ) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.view;
  private publish(patch: Partial<SessionView>) {
    this.view = { ...this.view, ...patch, revision: this.view.revision + 1 };
    this.listeners.forEach((f) => f());
  }
  private release() {
    this.scenario = null;
    this.controller?.abort();
    this.controller = null;
    const url = this.view.draft?.imagePreviewUrl;
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    this.image = null;
    this.saveId = null;
    this.saveTime = null;
  }
  private fresh(source: MealSource, url: string | null): MealDraft {
    return {
      sessionId: this.id() as AnalysisSessionId,
      source,
      analysisState: 'IDLE',
      imagePreviewUrl: url,
      pendingThumbnail: null,
      entries: [],
      items: [],
      totalCarbEstimate: null,
      totalKcalEstimate: null,
      completeness: 'UNKNOWN',
      note: null,
    };
  }
  cancel() {
    if (this.view.draft?.analysisState === 'SAVING') return;
    this.token++;
    this.release();
    this.publish({ draft: null, error: null, preparing: false });
  }
  async select(file: Blob, source: 'FILE' | 'CAMERA') {
    if (this.view.draft?.analysisState === 'SAVING') return;
    this.token++;
    const token = this.token;
    this.controller?.abort();
    this.publish({ preparing: true, error: null });
    const result = await this.images.prepare(file);
    if (token !== this.token) return;
    if (!result.ok) {
      this.publish({ error: result.error, preparing: false });
      return;
    }
    this.release();
    this.image = result.value.analysisBlob;
    const draft = this.fresh(
      source,
      URL.createObjectURL(result.value.analysisBlob),
    );
    this.publish({
      preparing: false,
      draft: {
        ...draft,
        analysisState: transition('IDLE', 'IMAGE_SELECTED'),
        pendingThumbnail: result.value.thumbnail,
      },
    });
  }
  async sample() {
    if (this.view.draft?.analysisState === 'SAVING') return;
    this.token++;
    this.release();
    this.image = new Blob(['sample'], { type: 'image/jpeg' });
    this.publish({
      draft: {
        ...this.fresh('DEMO_SAMPLE', '/demo/images/meal.svg'),
        analysisState: 'IMAGE_SELECTED',
      },
      error: null,
      preparing: false,
    });
    await this.analyze();
  }
  reuse(meal: Meal) {
    if (this.view.draft?.analysisState === 'SAVING') return;
    this.token++;
    this.release();
    const fresh = {
      ...this.fresh(meal.isDemo ? 'DEMO_SAMPLE' : 'FILE', null),
      analysisState: 'REVIEW_READY' as const,
    };
    const entries = cloneEntries(meal.entries).map((e) => ({
      ...e,
      userCorrected: true,
      components: e.components.map((c) => ({
        ...c,
        userCorrected: true,
        source: 'USER' as const,
      })),
    }));
    this.publish({
      draft: correctMealEntries(fresh, entries, this.catalog),
      error: null,
      preparing: false,
    });
  }
  manual() {
    if (this.view.draft?.analysisState === 'SAVING') return;
    this.token++;
    this.controller?.abort();
    const d =
      this.view.draft?.analysisState === 'SAVED'
        ? this.fresh('FILE', null)
        : (this.view.draft ?? this.fresh('FILE', null));
    this.publish({
      draft: { ...d, analysisState: 'REVIEW_READY' },
      error: null,
      preparing: false,
    });
  }
  async analyze() {
    const draft = this.view.draft;
    if (
      !draft ||
      !this.image ||
      !['IMAGE_SELECTED', 'ANALYSIS_ERROR'].includes(draft.analysisState)
    )
      return;
    this.controller?.abort();
    this.controller = new AbortController();
    const token = ++this.token,
      sessionId = draft.sessionId;
    this.publish({
      error: null,
      draft: {
        ...draft,
        analysisState: transition(
          draft.analysisState,
          draft.analysisState === 'ANALYSIS_ERROR'
            ? 'RETRY_ANALYSIS'
            : 'ANALYZE_REQUESTED',
        ),
      },
    });
    const gateway = draft.source === 'DEMO_SAMPLE' ? this.mock : this.live;
    const result = await (
      gateway.understandMealImage ?? gateway.analyzeMealImage
    ).call(
      gateway,
      { image: this.image, locale: 'vi-VN' },
      this.controller.signal,
    );
    if (token !== this.token || sessionId !== this.view.draft?.sessionId)
      return;
    if (!result.ok)
      this.publish({
        error: result.error,
        draft: {
          ...this.view.draft,
          analysisState: transition('ANALYZING', 'ANALYSIS_FAILED'),
        },
      });
    else
      this.publish({
        draft: applyAnalysisResult(this.view.draft, result.value, this.catalog),
      });
  }
  edit(items: readonly MealDraftItem[]) {
    const draft = this.view.draft;
    if (!draft) return;
    try {
      this.publish({
        draft: correctMealItems(draft, items, this.catalog),
        error: null,
      });
    } catch {
      const result = fail('INVALID_INPUT');
      if (!result.ok) this.publish({ error: result.error });
    }
  }
  editEntries(entries: readonly MealEntry[]) {
    if (!this.view.draft) return;
    try {
      this.publish({
        draft: correctMealEntries(this.view.draft, entries, this.catalog),
        error: null,
      });
    } catch {
      const result = fail('INVALID_INPUT');
      if (!result.ok) this.publish({ error: result.error });
    }
  }
  getScenario() {
    return this.scenario;
  }
  simulate(operations: readonly ScenarioOperation[]) {
    if (!this.view.draft) return;
    try {
      this.scenario = createScenario(
        this.view.draft,
        operations,
        this.catalog,
        this.scenario?.id ?? this.id(),
      );
      this.publish({ error: null });
    } catch {
      const r = fail('SCENARIO_INVALID');
      if (!r.ok) this.publish({ error: r.error });
    }
  }
  applySimulation() {
    if (!this.view.draft || !this.scenario) return;
    try {
      const draft = applyScenario(this.view.draft, this.scenario);
      this.scenario = null;
      this.publish({ draft, error: null });
    } catch {
      const r = fail('INVALID_INPUT');
      if (!r.ok) this.publish({ error: r.error });
    }
  }
  discardSimulation() {
    this.scenario = null;
    this.publish({ error: null });
  }
  note(note: string) {
    if (
      this.view.draft &&
      !['SAVING', 'SAVED'].includes(this.view.draft.analysisState)
    )
      this.publish({ draft: { ...this.view.draft, note } });
  }
  async save() {
    const draft = this.view.draft;
    if (
      !draft ||
      !['REVIEW_READY', 'SAVE_ERROR'].includes(draft.analysisState) ||
      !draft.items.length
    )
      return null;
    this.saveId ??= this.id() as MealId;
    this.saveTime ??= this.clock.now().toISOString();
    this.publish({
      error: null,
      draft: {
        ...draft,
        analysisState: transition(
          draft.analysisState,
          draft.analysisState === 'SAVE_ERROR'
            ? 'RETRY_SAVE'
            : 'SAVE_REQUESTED',
        ),
      },
    });
    const result = await saveMeal(
      draft,
      this.saveId,
      this.saveTime,
      this.catalog.getCatalogVersion(),
      this.meals,
    );
    if (result.ok) {
      this.release();
      this.publish({
        draft: {
          ...draft,
          pendingThumbnail: null,
          imagePreviewUrl: null,
          analysisState: 'SAVED',
        },
      });
      return result.value.id;
    }
    this.publish({
      error: result.error,
      draft: { ...draft, analysisState: 'SAVE_ERROR' },
    });
    return null;
  }
}
