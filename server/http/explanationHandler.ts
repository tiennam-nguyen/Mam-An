import { z } from 'zod';
import type { CapabilityRouter } from '../ai/capabilityRouter.js';
import { ExplanationTransportSchema, ExplanationOutputSchema } from '../../src/infrastructure/ai/explanationSchemas.js';
import { validateGeneratedExplanation } from '../../src/domain/explanation/explanation.js';
const schema=z.strictObject({request_id:z.string().regex(/^[a-zA-Z0-9:_-]{1,100}$/),evidence:ExplanationTransportSchema});
export function createExplanationHandler(router:CapabilityRouter){return async(request:Request):Promise<Response>=>{
 let requestId=crypto.randomUUID() as string;
 const error=(code:string,status=400)=>Response.json({request_id:requestId,error:{code,retryable:false}},{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return error('INVALID_INPUT',405);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return error('INVALID_INPUT',403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return error('INVALID_INPUT');
 try{
  const reader=request.body?.getReader();if(!reader)return error('INVALID_INPUT');let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768){await reader.cancel();return error('INVALID_INPUT',413);}chunks.push(value);}}finally{reader.releaseLock();}
  const parsed=schema.safeParse(JSON.parse(Buffer.concat(chunks).toString('utf8')));if(!parsed.success)return error('INVALID_INPUT');
  requestId=parsed.data.request_id;const result=await router.route('TEXT_EXPLANATION_VI',parsed.data.evidence,request.signal);
  if(!result.ok)return error(result.error.code,503);
  const output=ExplanationOutputSchema.safeParse(result.value);
  if(!output.success||!validateGeneratedExplanation(output.data,parsed.data.evidence))return error('EXPLANATION_INVALID',502);
  return Response.json({request_id:requestId,explanation:output.data},{headers:{'Cache-Control':'no-store'}});
 }catch{return error('INVALID_INPUT');}
};}
