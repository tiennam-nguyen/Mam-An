import type {
  ProviderAnalyzeInput,
  ProviderAnalysisResult,
} from './visionAnalysisProvider.js';
import type {
  ExplanationTransportPayload,
  ExplanationResult,
} from '../../src/domain/explanation/explanation.js';
import type { Result } from '../../src/domain/common/result.js';
import type { AppError } from '../../src/shared/errors/appError.js';
import { fail } from '../../src/shared/errors/appError.js';
export interface CapabilityMap {
  VISION_MEAL_UNDERSTANDING: {
    input: ProviderAnalyzeInput;
    output: ProviderAnalysisResult;
  };
  TEXT_EXPLANATION_VI: {
    input: ExplanationTransportPayload;
    output: Omit<ExplanationResult, 'generationMode'>;
  };
  SPEECH_TO_TEXT_VI: { input: Blob; output: { transcript: string } };
  EMBEDDING_OR_RETRIEVAL: {
    input: { tags: string[] };
    output: { chunkIds: string[] };
  };
}
export type AiCapability = keyof CapabilityMap;
export interface CapabilityCandidate<K extends AiCapability> {
  providerId: string;
  modelId: string;
  enabled: boolean;
  timeoutMs: number;
  run(
    input: CapabilityMap[K]['input'],
    signal: AbortSignal,
  ): Promise<Result<CapabilityMap[K]['output'], AppError>>;
}
export interface CapabilityPolicy<K extends AiCapability> {
  candidates: readonly CapabilityCandidate<K>[];
  maxProviderAttempts: number;
}
export type CapabilityPolicies = { [K in AiCapability]: CapabilityPolicy<K> };
export class CapabilityRouter {
  constructor(private policies: CapabilityPolicies) {}
  async route<K extends AiCapability>(
    capability: K,
    input: CapabilityMap[K]['input'],
    parent: AbortSignal,
  ): Promise<Result<CapabilityMap[K]['output'], AppError>> {
    const policy = this.policies[capability];
    let last: Result<CapabilityMap[K]['output'], AppError> = fail(
      'CAPABILITY_UNAVAILABLE',
      'AI',
    );
    const candidates = policy.candidates
      .filter((c) => c.enabled)
      .slice(0, policy.maxProviderAttempts);
    const expires = Date.now() + 25000;
    for (const candidate of candidates) {
      if (parent.aborted) return fail('AI_UNAVAILABLE', 'AI');
      const remaining = expires - Date.now();
      if (remaining <= 0) return fail('AI_TIMEOUT', 'AI', true);
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let cancel: () => void = () => {};
      const canceled = new Promise<
        Result<CapabilityMap[K]['output'], AppError>
      >((resolve) => {
        cancel = () => {
          controller.abort();
          resolve(fail('AI_UNAVAILABLE', 'AI'));
        };
      });
      parent.addEventListener('abort', cancel, { once: true });
      try {
        last = await Promise.race([
          candidate.run(input, controller.signal),
          canceled,
          new Promise<Result<CapabilityMap[K]['output'], AppError>>(
            (resolve) => {
              timer = setTimeout(
                () => {
                  controller.abort();
                  resolve(fail('AI_TIMEOUT', 'AI', true));
                },
                Math.min(candidate.timeoutMs, remaining),
              );
            },
          ),
        ]);
      } catch {
        last = fail('AI_UNAVAILABLE', 'AI', true);
      } finally {
        clearTimeout(timer);
        parent.removeEventListener('abort', cancel);
      }
      if (parent.aborted) return fail('AI_UNAVAILABLE', 'AI');
      if (
        last.ok ||
        ![
          'AI_UNAVAILABLE',
          'AI_TIMEOUT',
          'AI_RATE_LIMITED',
          'AI_INVALID_RESPONSE',
          'AI_UPSTREAM_ERROR',
          'NETWORK_UNAVAILABLE',
          'CAPABILITY_UNAVAILABLE',
        ].includes(last.error.code)
      )
        return last;
    }
    return last;
  }
}
