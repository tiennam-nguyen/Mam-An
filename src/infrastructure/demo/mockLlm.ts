import type { AiGateway } from '../../application/ports/aiGateway';
import { ok } from '../../domain/common/result';
import { fail } from '../../shared/errors/appError';
export class MockLLM implements AiGateway {
 async analyzeMealImage(_input: {image:Blob;locale:'vi-VN'},signal?:AbortSignal){
   if(signal?.aborted)return fail('AI_UNAVAILABLE','AI');
   return ok({requestId:'mock:sample-v1',candidates:['Cơm trắng','Trứng gà luộc','Dưa chuột'].map(rawName=>({rawName,suggestedPortionMultiplier:1,suggestedPortionLabel:null,providerConfidence:null}))});
 }
}
