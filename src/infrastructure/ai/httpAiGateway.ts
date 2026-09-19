import type { AiGateway } from '../../application/ports/aiGateway';
import { ok } from '../../domain/common/result';
import { fail } from '../../shared/errors/appError';
import { AnalysisApiSchema,ApiErrorSchema } from './analysisApiSchemas';
export class HttpAiGateway implements AiGateway {
 constructor(private send:typeof fetch=fetch){}
 async analyzeMealImage(input:{image:Blob;locale:'vi-VN'},signal?:AbortSignal){
  const form=new FormData();form.set('image',input.image,'meal.jpg');form.set('locale',input.locale);
  try{
   const response=await this.send('/api/v1/analyze-meal',{method:'POST',body:form,signal,cache:'no-store'});
   let data:unknown;try{data=await response.json();}catch{return fail('AI_INVALID_RESPONSE','AI');}
   if(!response.ok){const parsed=ApiErrorSchema.safeParse(data);if(!parsed.success)return fail('AI_INVALID_RESPONSE','AI');return {ok:false as const,error:{code:parsed.data.error.code,retryable:parsed.data.error.retryable,source:'AI' as const,requestId:parsed.data.request_id,detail:null}};}
   const parsed=AnalysisApiSchema.safeParse(data);if(!parsed.success)return fail('AI_INVALID_RESPONSE','AI');
   return ok({requestId:parsed.data.request_id,candidates:parsed.data.candidates.map(c=>({rawName:c.raw_name,suggestedPortionMultiplier:c.suggested_portion_multiplier,suggestedPortionLabel:c.suggested_portion_label,providerConfidence:c.provider_confidence}))});
  }catch{return fail('NETWORK_UNAVAILABLE','AI',true);}
 }
}
