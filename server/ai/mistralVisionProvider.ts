import { ChatVisionProvider } from './chatVisionProvider.js';
export class MistralVisionProvider extends ChatVisionProvider {
  constructor(key: string, model: string, send?: typeof fetch) {
    super('mistral', 'https://api.mistral.ai/v1/chat/completions', key, model, null, send);
  }
}
