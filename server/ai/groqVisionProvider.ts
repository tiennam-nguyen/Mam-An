import { ChatVisionProvider } from './chatVisionProvider';
export class GroqVisionProvider extends ChatVisionProvider {
  constructor(key: string, model: string, send?: typeof fetch) {
    super(
      'groq',
      'https://api.groq.com/openai/v1/chat/completions',
      key,
      model,
      null,
      send,
    );
  }
}
