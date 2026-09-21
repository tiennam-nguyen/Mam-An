import { useCallback } from 'react';
import { useServices } from '../../shared/ui/ServicesContext';
import { useQuery } from '../../shared/ui/useQuery';
import { ErrorNotice } from '../../shared/ui/common';
import { getPersonalResponse } from '../../application/usecases/getPersonalResponse';
import { buildEvidenceBundle, minimizeEvidence, templateExplanation } from '../../domain/explanation/explanation';
import type { MealDraft } from '../../domain/meal/mealDraft';
import type { MealScenario } from '../../domain/meal/decisionSimulator';
import type { PatternEvidence } from '../../domain/personal/personalResponse';
import { patternCopy } from '../../domain/explanation/explanation';
export function PatternCard({ pattern }: { pattern:PatternEvidence }) {
  const p=pattern;
  return <section className="card"><h2>Từ các lần đã ghi</h2><p>{patternCopy({ evidenceKey:'pattern.summary',sampleCount:p.sampleCount,timingBucketMinutes:p.statistics.timingBucketMinutes,medianPostMealMgDl:p.statistics.medianPostMealMgDl,medianDeltaFromPremealMgDl:p.statistics.medianDeltaFromPremealMgDl,dataQuality:p.dataQuality,caveats:p.caveats })}</p><p>{p.sampleCount} bữa góp số đo vào nhóm thời điểm này. Các nhóm cách nhau 30 phút chỉ để so sánh thời điểm.</p><details><summary>Xem thời điểm ghi nhận</summary><ul>{p.glucoseObservations.map(o=><li key={o.readingId}>{o.minutesFromMeal} phút so với bữa · {o.valueNormalized.toLocaleString('vi-VN')} mg/dL · {o.source==='DEMO'?'Mẫu':o.source==='DEVICE'?'Thiết bị':'Tự nhập'}</li>)}</ul></details></section>;
}
export function MealEvidence({ draft, mode, excludeId, scenario=null }: { draft:Pick<MealDraft,'entries'|'totalCarbEstimate'|'totalKcalEstimate'|'completeness'>;mode:'USER'|'DEMO';excludeId?:string;scenario?:MealScenario|null }) {
  const { meals,glucose,knowledge }=useServices();
  const load=useCallback(()=>getPersonalResponse(draft,meals,glucose,mode,excludeId),[draft,meals,glucose,mode,excludeId]);
  const state=useQuery(load);
  const bundle=buildEvidenceBundle(draft,state.data??null,knowledge,scenario), payload=minimizeEvidence(bundle), explanation=templateExplanation(payload);
  return <><ErrorNotice error={state.error} />{state.loading&&<p role="status">Đang xem dữ liệu trên thiết bị…</p>}{state.data&&<PatternCard pattern={state.data} />}<section className="card"><h2>Giải thích từ dữ liệu</h2><small>Mẫu trên thiết bị</small><p>{explanation.summaryVi}</p>{explanation.optionExplanationsVi.map((s,i)=><p key={i}>{s}</p>)}{bundle.retrievedKnowledge.map(k=><details key={k.id}><summary>{k.title}</summary><p>{k.body}</p><small>{k.sourceLabel} · {k.knowledgeVersion}</small></details>)}<p className="muted">{explanation.uncertaintyNoteVi}</p></section></>;
}
