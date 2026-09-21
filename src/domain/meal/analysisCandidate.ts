import type { ComponentRole } from './mealEntry';
export interface RawAnalysisCandidate {
  candidateDishTemplateId?: string | null;
  suggestedComponents?: readonly {
    rawName: string;
    role: ComponentRole;
    suggestedPortionMultiplier: number | null;
    suggestedPortionLabel: string | null;
  }[];
  rawName: string;
  suggestedPortionMultiplier: number | null;
  suggestedPortionLabel: string | null;
  providerConfidence: number | null;
}
