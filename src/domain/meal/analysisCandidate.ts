export interface RawAnalysisCandidate {
  rawName: string;
  suggestedPortionMultiplier: number | null;
  suggestedPortionLabel: string | null;
  providerConfidence: number | null;
}
