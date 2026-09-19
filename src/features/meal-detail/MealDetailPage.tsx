import { useCallback } from 'react';
import { Link,useParams } from 'react-router-dom';
import { useServices } from '../../shared/ui/ServicesContext';
import { useQuery } from '../../shared/ui/useQuery';
import { ErrorNotice,DemoBadge,formatNumber,formatTime,Completeness,SafetyNote } from '../../shared/ui/common';
import { MealThumbnail } from '../../shared/ui/MealThumbnail';
import type { MealId } from '../../domain/common/brandedIds';
import { ok } from '../../domain/common/result';
export function MealDetailPage(){
 const {mealId}=useParams(),{meals,glucose}=useServices(),load=useCallback(async()=>{const m=await meals.getById(mealId as MealId);if(!m.ok)return m;const g=await glucose.list({mealId:mealId as MealId});if(!g.ok)return g;return ok({meal:m.value,readings:g.value});},[mealId,meals,glucose]),state=useQuery(load),meal=state.data?.meal;
 return <section className="narrow"><Link to="/history">← Nhật ký</Link><h1>Bữa ăn đã lưu</h1><ErrorNotice error={state.error} retry={state.retry}/>{state.loading&&<p role="status">Đang đọc bữa ăn…</p>}{state.data&&!meal&&<p>Không tìm thấy bữa ăn này.</p>}{meal&&<><div className="card"><MealThumbnail reference={meal.thumbnailRef}/><p>{formatTime(meal.createdAt)} {meal.isDemo&&<DemoBadge/>}</p><p className="big-number">{formatNumber(meal.totalCarbEstimate)}{meal.totalCarbEstimate!==null&&<small> g carb</small>}</p><Completeness value={meal.completeness}/>{meal.items.map(i=><div className="detail-row" key={i.itemId}><div><strong>{i.displayName}</strong><p className="muted">{i.portionMultiplier}× {i.portionLabel}{i.userCorrected?' · Đã chỉnh sửa':''}</p></div><span>{formatNumber(i.carbEstimate)}{i.carbEstimate!==null?' g':''}</span></div>)}{meal.note&&<p>Ghi chú: {meal.note}</p>}<p className="muted">Bản ghi tham chiếu · Danh mục {meal.catalogVersion}</p><SafetyNote/></div><div className="page-heading"><h2>Số đo liên kết</h2><Link className="button" to={'/glucose/new?mealId='+meal.id}>Thêm số đo</Link></div><SafetyNote kind="glucose"/>{state.data?.readings.length===0&&<p>Chưa có số đo liên kết.</p>}{state.data?.readings.map(g=><div className="card" key={g.id}><strong>{formatNumber(g.value)} {g.unit==='MG_DL'?'mg/dL':'mmol/L'}</strong><p>{formatTime(g.measuredAt)} {g.isDemo&&<DemoBadge/>}</p>{g.note&&<p>{g.note}</p>}</div>)}</>}</section>;
}
