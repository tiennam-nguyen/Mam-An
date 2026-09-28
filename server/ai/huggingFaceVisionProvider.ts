import { ChatVisionProvider } from './chatVisionProvider.js';
export class HuggingFaceVisionProvider extends ChatVisionProvider {
  constructor(key: string, model: string, send?: typeof fetch) {
    super(
      'huggingface',
      'https://router.huggingface.co/v1/chat/completions',
      key,
      model,
      null,
      send,
    );
  }
}
