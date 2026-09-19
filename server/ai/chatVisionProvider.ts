import type {
  VisionAnalysisProvider,
  ProviderAnalyzeInput,
} from './visionAnalysisProvider';
import { parseProviderResult } from './providerResponseSchema';
import { visionPrompt } from './prompt';
import { ok } from '../../src/domain/common/result';
import { fail } from '../../src/shared/errors/appError';
export class ChatVisionProvider implements VisionAnalysisProvider {
  constructor(
    readonly id: 'groq' | 'openrouter',
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
          stream: false,
          ...(this.privacy ? { provider: this.privacy } : {}),
        }),
      });
      if (!response.ok) {
        if (response.status === 429) return fail('AI_RATE_LIMITED', 'AI', true);
        if (response.status === 408 || response.status === 504)
          return fail('AI_TIMEOUT', 'AI', true);
        if (response.status >= 500) return fail('AI_UNAVAILABLE', 'AI', true);
        return fail('AI_UPSTREAM_ERROR', 'AI', false);
      }
      try {
        return ok({ candidates: parseProviderResult(await response.json()) });
      } catch {
        return fail('AI_INVALID_RESPONSE', 'AI');
      }
    } catch {
      return signal.aborted
        ? fail('AI_TIMEOUT', 'AI', true)
        : fail('AI_UNAVAILABLE', 'AI', true);
    }
  }
}
