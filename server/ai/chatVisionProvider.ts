import type {
  VisionAnalysisProvider,
  ProviderAnalyzeInput,
  ProviderId,
} from './visionAnalysisProvider.js';
import { parseProviderResult } from './providerResponseSchema.js';
import { visionPrompt } from './prompt.js';
import { ok } from '../../src/domain/common/result.js';
import { fail } from '../../src/shared/errors/appError.js';
import { httpProviderFailure, providerFailure } from './providerFailure.js';
export class ChatVisionProvider implements VisionAnalysisProvider {
  constructor(
    readonly id: Exclude<ProviderId, 'gemini'>,
    private endpoint: string,
    private key: string,
    private model: string,
    private privacy: Record<string, unknown> | null,
    private send: typeof fetch = fetch,
  ) {}
  isConfigured() {
    return !!this.key.trim() && !!this.model.trim();
  }
  async analyze(input: ProviderAnalyzeInput, signal: AbortSignal) {
    if (!this.isConfigured()) return fail('AI_UNAVAILABLE', 'AI', true);
    try {
      const response = await this.send(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + this.key,
        },
        signal,
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: visionPrompt },
                {
                  type: 'image_url',
                  image_url: {
                    url:
                      'data:' +
                      input.image.mimeType +
                      ';base64,' +
                      Buffer.from(input.image.bytes).toString('base64'),
                  },
                },
              ],
            },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 2048,
          stream: false,
          ...(this.privacy ? { provider: this.privacy } : {}),
        }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        return httpProviderFailure(response.status);
      }
      try {
        return ok({ candidates: parseProviderResult(await response.json()) });
      } catch {
        return signal.aborted
          ? providerFailure('AI_TIMEOUT', 'TIMEOUT', true)
          : providerFailure('AI_INVALID_RESPONSE', 'MALFORMED_RESPONSE');
      }
    } catch {
      return signal.aborted
        ? fail('AI_TIMEOUT', 'AI', true)
        : providerFailure('AI_UNAVAILABLE', 'NETWORK', true);
    }
  }
}
