import { z } from 'zod';
export const CandidateSchema=z.object({raw_name:z.string().trim().min(1).max(120),suggested_portion_multiplier:z.number().finite().positive().nullable(),suggested_portion_label:z.string().trim().max(80).nullable(),provider_confidence:z.number().finite().nullable().transform(v=>v!==null&&v>=0&&v<=1?v:null)});
export const AnalysisApiSchema=z.object({request_id:z.string().min(1),schema_version:z.literal('1'),candidates:z.array(CandidateSchema).min(1).max(20)});
export const ApiErrorSchema=z.object({request_id:z.string().min(1),error:z.object({code:z.enum(['INVALID_IMAGE','IMAGE_TOO_LARGE','INVALID_INPUT','AI_TIMEOUT','AI_RATE_LIMITED','AI_UNAVAILABLE','AI_INVALID_RESPONSE','AI_UPSTREAM_ERROR','INTERNAL_ERROR']),retryable:z.boolean()})});
