import type { VoiceInputAdapter } from '../ports/voiceInputAdapter';
import type { ExplanationGateway } from '../ports/explanationGateway';
import type { KnowledgeChunk } from '../../domain/explanation/explanation';
import type { FoodCatalog } from '../ports/foodCatalog';
import type { MealRepository } from '../ports/mealRepository';
import type { GlucoseRepository } from '../ports/glucoseRepository';
import type { SettingsRepository } from '../ports/settingsRepository';
import type { ThumbnailRepository } from '../ports/thumbnailRepository';
import type { DemoRepository } from '../ports/demoRepository';
import type { Clock } from '../ports/clock';
import type { AnalysisSessionService } from './analysisSessionService';
export interface AppServices {
  explanations: ExplanationGateway;
  textExplanationEnabled: boolean;
  knowledge: readonly KnowledgeChunk[];
  voice: VoiceInputAdapter;
  catalog: FoodCatalog;
  meals: MealRepository;
  glucose: GlucoseRepository;
  settings: SettingsRepository;
  thumbnails: ThumbnailRepository;
  demo: DemoRepository;
  clock: Clock;
  session: AnalysisSessionService;
  liveEnabled: boolean;
  buildId: string;
}
