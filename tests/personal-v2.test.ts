import { it, expect } from 'vitest';
import { meal } from './fixtures/helpers';
import { buildPatternEvidence, findSimilarMeals, median, normalizeGlucoseToMgDl } from '../src/domain/personal/personalResponse';
import type { Meal } from '../src/domain/meal/meal';
import type { GlucoseReading } from '../src/domain/glucose/glucoseReading';
import type { MealId, GlucoseReadingId } from '../src/domain/common/brandedIds';
function history(): Meal[] { return [0,1,2].map(i => { const m = meal(); return { ...m, id: ('m'+i) as MealId, isDemo:false, entries:m.entries.map(e => ({ ...e, dishTemplateId:'rice-plate', components:e.components.map(c => ({...c, role:c.foodId === 'rice' ? 'STARCH' : 'OTHER'})) })) }; }); }
function readings(meals: Meal[], minutes = [120,120,120]): GlucoseReading[] { return meals.map((m,i) => ({ id:('g'+i) as GlucoseReadingId, mealId:m.id, value:100+i*10, unit:'MG_DL', measuredAt:new Date(Date.parse(m.createdAt)+minutes[i]!*60000).toISOString(), timingTag:'AFTER_MEAL', note:null, isDemo:false })); }
it('matches versioned ratio boundaries, deterministic order, unknown and demo isolation', () => {
  const h = history(), q = h[0]!;
  expect(findSimilarMeals(q, h, 'USER').map(m => m.mealId)).toEqual(['m0','m1','m2']);
  expect(findSimilarMeals(q,h,'DEMO')).toEqual([]);
  expect(findSimilarMeals(q,[{...h[1]!,totalCarbEstimate:q.totalCarbEstimate!*1.25}],'USER')[0]!.tier).toBe('TIER_1');
  expect(findSimilarMeals(q,[{...h[1]!,totalCarbEstimate:q.totalCarbEstimate!*1.3}],'USER')[0]!.tier).toBe('TIER_2');
  expect(findSimilarMeals(q,[{...h[1]!,totalCarbEstimate:q.totalCarbEstimate!*1.36}],'USER')).toHaveLength(0);
  expect(findSimilarMeals({...q,totalCarbEstimate:null},h,'USER')[0]!.matchReasons).toContain('CARB_NOT_COMPARABLE');
});
it('selects comparable distinct meals; exposes four states without sparse statistics', () => {
  const h=history(), q=h[0]!;
  expect(buildPatternEvidence(q,h,[],'USER').dataQuality).toBe('NO_DATA');
  expect(buildPatternEvidence(q,h,readings(h).slice(0,1),'USER').dataQuality).toBe('SPARSE');
  expect(buildPatternEvidence(q,h,readings(h,[30,60,90]),'USER').dataQuality).toBe('NONCOMPARABLE');
  const p=buildPatternEvidence(q,h,readings(h),'USER');
  expect(p.dataQuality).toBe('SUFFICIENT_FOR_DESCRIPTION'); expect(p.sampleCount).toBe(3); expect(p.statistics.medianPostMealMgDl).toBe(110); expect(p.statistics.medianDeltaFromPremealMgDl).toBeNull();
  expect(p.glucoseObservations[0]!.minutesFromMeal).toBe(120);
  const repeated = readings(h.slice(0,1)); repeated.push({...repeated[0]!,id:'repeat' as GlucoseReadingId});
  expect(buildPatternEvidence(q,h,repeated,'USER').sampleCount).toBe(1);
});
it('normalizes units, picks closest non-positive premeal and excludes positive BEFORE readings', () => {
  const h=history(), post=readings(h), pre=post.flatMap(g => [-30,-5,5].map(t => ({...g,id:(g.id+t) as GlucoseReadingId,value:t===-5?90:80,timingTag:'BEFORE_MEAL' as const,measuredAt:new Date(Date.parse(h[0]!.createdAt)+t*60000).toISOString()})));
  const p=buildPatternEvidence(h[0]!,h,[...post,...pre],'USER');
  expect(p.statistics.medianDeltaFromPremealMgDl).toBe(20); expect(p.premealTrace.every(t => t.minutesFromMeal===-5)).toBe(true);
  expect(normalizeGlucoseToMgDl(5,'MMOL_L')).toBe(90); expect(median([4,1,3,2])).toBe(2.5); expect(median([])).toBeNull();
});
