import { handleAiRequest } from '../../../server/compositionRoot.js';
export const maxDuration = 60;
export default {
  fetch: (request: Request) => handleAiRequest(request, 'explanation'),
};
