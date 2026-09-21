import { it, expect } from 'vitest';
import sharp from 'sharp';
import { createAnalyzeMealHandler } from '../../server/http/analyzeMealHandler';
import { createExplanationHandler } from '../../server/http/explanationHandler';
import { CapabilityRouter, type CapabilityPolicies } from '../../server/ai/capabilityRouter';
import { ok } from '../../src/domain/common/result';
import { fail } from '../../src/shared/errors/appError';
import { buildEvidenceBundle, minimizeEvidence } from '../../src/domain/explanation/explanation';
import { draft } from '../fixtures/helpers';
const empty:CapabilityPolicies={VISION_MEAL_UNDERSTANDING:{candidates:[],maxProviderAttempts:0},TEXT_EXPLANATION_VI:{candidates:[],maxProviderAttempts:0},SPEECH_TO_TEXT_VI:{candidates:[],maxProviderAttempts:0},EMBEDDING_OR_RETRIEVAL:{candidates:[],maxProviderAttempts:0}};
it('v2 image multipart returns components without nutrition and echoes a bounded request id',async()=>{
 const bytes=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).jpeg().toBuffer();
 const form=new FormData();form.set('image',new Blob([new Uint8Array(bytes)],{type:'image/jpeg'}));form.set('request_id','v2-test');
 const handler=createAnalyzeMealHandler({analyze:async()=>ok({candidates:[{rawName:'Phở',suggestedPortionMultiplier:1,suggestedPortionLabel:null,providerConfidence:null,suggestedComponents:[{rawName:'Bánh phở',role:'STARCH',suggestedPortionMultiplier:1,suggestedPortionLabel:null}]}]})},3000000,2);
 const response=await handler(new Request('http://localhost/api/v2/vision/analyze-meal',{method:'POST',body:form}));
 expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');const body=await response.json();expect(body.request_id).toBe('v2-test');expect(body.candidates[0].suggested_components[0].role).toBe('STARCH');expect(JSON.stringify(body)).not.toMatch(/carb|kcal/);
});
it('capability fallback is bounded and empty capabilities are independently unavailable',async()=>{
 let calls=0;const router=new CapabilityRouter({...empty,TEXT_EXPLANATION_VI:{maxProviderAttempts:2,candidates:[0,1,2].map(i=>({providerId:'fixture',modelId:String(i),enabled:true,timeoutMs:100,run:async()=>{calls++;return fail('AI_RATE_LIMITED','AI',true);}}))}});
 await router.route('TEXT_EXPLANATION_VI',minimizeEvidence(buildEvidenceBundle(draft(),null,[])),new AbortController().signal);expect(calls).toBe(2);
 const result=await router.route('SPEECH_TO_TEXT_VI',new Blob(),new AbortController().signal);expect(result.ok).toBe(false);if(!result.ok)expect(result.error.code).toBe('CAPABILITY_UNAVAILABLE');
});
it('explanation rejects extra private fields and unsafe generated prose',async()=>{
 const payload=minimizeEvidence(buildEvidenceBundle(draft(),null,[]));let calls=0;
 const router=new CapabilityRouter({...empty,TEXT_EXPLANATION_VI:{maxProviderAttempts:1,candidates:[{providerId:'fixture',modelId:'fixture',enabled:true,timeoutMs:100,run:async()=>{calls++;return ok({summaryVi:'Dùng 10 đơn vị insulin',personalObservationVi:null,optionExplanationsVi:[],uncertaintyNoteVi:'x',evidenceRefs:['meal.current']});}}]}});
 const handler=createExplanationHandler(router);const request=(evidence:unknown)=>new Request('http://localhost/api/v2/explanations/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request_id:'test',evidence})});
 expect((await handler(request({...payload,rawHistory:['private']}))).status).toBe(400);expect(calls).toBe(0);
 const response=await handler(request(payload));expect(response.status).toBe(502);expect(JSON.stringify(await response.json())).not.toContain('insulin');
});
