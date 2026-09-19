import { ChatVisionProvider } from './chatVisionProvider.js';
export class OpenRouterVisionProvider extends ChatVisionProvider {
  constructor(
    key: string,
    model: string,
    privacy: { denyDataCollection: boolean; requireZdr: boolean },
    send?: typeof fetch,
  ) {
    super(
      'openrouter',
      'https://openrouter.ai/api/v1/chat/completions',
      key,
      model,
      {
        data_collection: privacy.denyDataCollection ? 'deny' : 'allow',
        zdr: privacy.requireZdr,
      },
      send,
    );
  }
}
