import { ChatVisionProvider } from './chatVisionProvider.js';
export class CohereVisionProvider extends ChatVisionProvider {
  constructor(key: string, model: string, send?: typeof fetch) {
    super('cohere', 'https://api.cohere.ai/compatibility/v1/chat/completions', key, model, null, send);
  }
}
