import v2Catalog from '../infrastructure/catalog/generated/catalog.v2.json';
import { newId } from '../shared/ids/newId';
import { StaticFoodCatalog } from '../infrastructure/catalog/staticFoodCatalog';
import { MamAnDb } from '../infrastructure/persistence/mamAnDb';
import { DexieMealRepository } from '../infrastructure/persistence/dexieMealRepository';
import { DexieGlucoseRepository } from '../infrastructure/persistence/dexieGlucoseRepository';
import { DexieSettingsRepository } from '../infrastructure/persistence/dexieSettingsRepository';
import { DexieThumbnailRepository } from '../infrastructure/persistence/dexieThumbnailRepository';
import { DexieDemoRepository } from '../infrastructure/persistence/dexieDemoRepository';
import { BrowserImageProcessor } from '../infrastructure/image/imagePreprocessor';
import { HttpAiGateway } from '../infrastructure/ai/httpAiGateway';
import { MockLLM } from '../infrastructure/demo/mockLlm';
import { AnalysisSessionService } from '../application/services/analysisSessionService';
import type { AppServices } from '../application/services/appServices';
import { publicConfig } from './config/publicConfig';
export function createServices(): AppServices {
  const db = new MamAnDb(),
    catalog = new StaticFoodCatalog(),
    meals = new DexieMealRepository(db),
    clock = { now: () => new Date() };
  return {
    catalog,
    knowledge: v2Catalog.knowledge,
    explanations: new HttpAiGateway(),
    meals,
    clock,
    glucose: new DexieGlucoseRepository(db),
    settings: new DexieSettingsRepository(db),
    thumbnails: new DexieThumbnailRepository(db),
    demo: new DexieDemoRepository(db),
    session: new AnalysisSessionService(
      catalog,
      new HttpAiGateway(),
      new MockLLM(),
      new BrowserImageProcessor(),
      meals,
      clock,
      () => newId(),
    ),
    ...publicConfig,
  };
}
