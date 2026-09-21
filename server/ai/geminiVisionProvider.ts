import type { ProviderAnalyzeInput, VisionAnalysisProvider } from './visionAnalysisProvider.js';
import { parseProviderResult } from './providerResponseSchema.js';
import { visionPrompt, componentPrompt } from './prompt.js';
import { ok } from '../../src/domain/common/result.js';
import { httpProviderFailure, providerFailure } from './providerFailure.js';
export class GeminiVisionProvider implements VisionAnalysisProvider {
  readonly id = 'gemini' as const;
  constructor(private key: string, private model: string, private send: typeof fetch = fetch) {}
  isConfigured() { return !!this.key.trim() && !!this.model.trim(); }
  async analyze(input: ProviderAnalyzeInput, signal: AbortSignal) {
    if (!this.isConfigured()) return providerFailure('AI_UNAVAILABLE', 'CONFIG_MISSING');
    try {
      const response = await this.send(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`, {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.key },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: visionPrompt + componentPrompt }, { inline_data: { mime_type: input.image.mimeType, data: Buffer.from(input.image.bytes).toString('base64') } }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2048 },
        }),
      });
      if (!response.ok) { await response.body?.cancel(); return httpProviderFailure(response.status); }
      try {
        const body = await response.json();
        const content = body.candidates?.[0]?.content?.parts?.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? '').join('');
        return ok({ candidates: parseProviderResult({ choices: [{ message: { content } }] }) });
      } catch {
        return signal.aborted ? providerFailure('AI_TIMEOUT', 'TIMEOUT', true) : providerFailure('AI_INVALID_RESPONSE', 'MALFORMED_RESPONSE');
      }
    } catch {
      return signal.aborted ? providerFailure('AI_TIMEOUT', 'TIMEOUT', true) : providerFailure('AI_UNAVAILABLE', 'NETWORK', true);
    }
  }
}
