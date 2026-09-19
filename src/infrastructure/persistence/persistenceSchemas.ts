import { z } from 'zod';
import type { Meal } from '../../domain/meal/meal';
import type { GlucoseReading, UserSettings } from '../../domain/glucose/glucoseReading';
import type { FoodId, MealDraftItemId, MealId, ThumbnailId, GlucoseReadingId } from '../../domain/common/brandedIds';
const id=z.string().min(1), nutrient=z.number().finite().nonnegative().nullable(), instant=z.iso.datetime();
const item=z.object({itemId:id,foodId:id.nullable(),displayName:z.string().trim().min(1),portionMultiplier:z.number().finite().positive(),portionLabel:z.string().min(1),carbEstimate:nutrient,kcalEstimate:nutrient,userCorrected:z.boolean(),includedInTotal:z.boolean(),nutritionState:z.enum(['KNOWN','UNKNOWN'])}).refine(i=>(i.nutritionState==='UNKNOWN')===(i.carbEstimate===null));
const thumbnail=z.discriminatedUnion('kind',[z.object({kind:z.literal('IDB_BLOB'),id}),z.object({kind:z.literal('BUNDLED_ASSET'),path:z.literal('/demo/images/meal.svg')})]);
export const MealSchema=z.object({id,createdAt:instant,source:z.enum(['CAMERA','FILE','DEMO_SAMPLE']),thumbnailRef:thumbnail.nullable(),catalogVersion:z.string().min(1),items:z.array(item).min(1),totalCarbEstimate:nutrient,totalKcalEstimate:nutrient,completeness:z.enum(['COMPLETE','PARTIAL','UNKNOWN']),note:z.string().max(2000).nullable(),isDemo:z.boolean()});
export const GlucoseSchema=z.object({id,value:z.number().finite().positive(),unit:z.enum(['MG_DL','MMOL_L']),measuredAt:instant,mealId:id.nullable(),timingTag:z.enum(['BEFORE_MEAL','AFTER_MEAL','OTHER']).nullable(),note:z.string().max(2000).nullable(),isDemo:z.boolean()});
export const SettingsSchema=z.object({glucoseUnit:z.enum(['MG_DL','MMOL_L']),demoModeEnabled:z.boolean()});
export interface MealRowV1 { id:string;createdAt:string;isDemo:0|1;schemaVersion:1;value:Meal }
export interface GlucoseRowV1 { id:string;measuredAt:string;mealId:string|null;isDemo:0|1;schemaVersion:1;value:GlucoseReading }
export const toMealRow=(m:Meal):MealRowV1=>({id:m.id,createdAt:m.createdAt,isDemo:m.isDemo?1:0,schemaVersion:1,value:m});
export const toGlucoseRow=(g:GlucoseReading):GlucoseRowV1=>({id:g.id,measuredAt:g.measuredAt,mealId:g.mealId,isDemo:g.isDemo?1:0,schemaVersion:1,value:g});
export function parseMeal(value:unknown):Meal {const m=MealSchema.parse(value); return {...m,id:m.id as MealId,thumbnailRef:m.thumbnailRef?.kind==='IDB_BLOB'?{kind:'IDB_BLOB',id:m.thumbnailRef.id as ThumbnailId}:m.thumbnailRef,items:m.items.map(i=>({...i,itemId:i.itemId as MealDraftItemId,foodId:i.foodId as FoodId|null}))};}
export function parseGlucose(value:unknown):GlucoseReading {const g=GlucoseSchema.parse(value);return {...g,id:g.id as GlucoseReadingId,mealId:g.mealId as MealId|null};}
export function readMealRow(row:unknown):Meal {const r=z.object({id,createdAt:instant,isDemo:z.union([z.literal(0),z.literal(1)]),schemaVersion:z.literal(1),value:MealSchema}).parse(row);if(r.id!==r.value.id||r.createdAt!==r.value.createdAt||Boolean(r.isDemo)!==r.value.isDemo)throw new Error('Invalid row mapping');return parseMeal(r.value);}
export function readGlucoseRow(row:unknown):GlucoseReading {const r=z.object({id,measuredAt:instant,mealId:id.nullable(),isDemo:z.union([z.literal(0),z.literal(1)]),schemaVersion:z.literal(1),value:GlucoseSchema}).parse(row);if(r.id!==r.value.id||r.measuredAt!==r.value.measuredAt||r.mealId!==r.value.mealId||Boolean(r.isDemo)!==r.value.isDemo)throw new Error('Invalid row mapping');return parseGlucose(r.value);}
export const parseSettings=(s:unknown):UserSettings=>SettingsSchema.parse(s);
