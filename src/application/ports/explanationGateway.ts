import type { ExplanationResult, ExplanationTransportPayload } from '../../domain/explanation/explanation';
export interface ExplanationGateway { generateExplanation(payload:ExplanationTransportPayload,signal?:AbortSignal):Promise<ExplanationResult> }
