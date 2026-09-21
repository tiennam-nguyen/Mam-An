import { instantiateTemplate } from '../../domain/meal/dishTemplate';
import { selectPortion } from '../../domain/food/portionResolver';
import { useState } from 'react';
import type { FoodCatalog } from '../../application/ports/foodCatalog';
import type { FoodId } from '../../domain/common/brandedIds';
import { componentRoles, referencePortion, type MealComponent, type MealEntry } from '../../domain/meal/mealEntry';
import { newId } from '../../shared/ids/newId';
import { formatNumber } from '../../shared/ui/common';
export const roleLabels = { STARCH: 'Tinh bột', PROTEIN: 'Đạm', VEGETABLE: 'Rau', BROTH: 'Nước dùng', CONDIMENT: 'Gia vị / sốt', BEVERAGE: 'Đồ uống', TOPPING: 'Ăn kèm', OTHER: 'Khác' };
export function newComponent(catalog: FoodCatalog, foodId: FoodId | null = null): MealComponent {
  const food = foodId ? catalog.getFoodById(foodId) : null;
  return { componentId: newId(), foodId, displayName: food?.nameVi ?? 'Thành phần tự nhập', role: 'OTHER', portion: referencePortion(food), carbEstimate: null, kcalEstimate: null, nutritionState: 'UNKNOWN', source: 'USER', userCorrected: true, includedInTotal: true, matchState: food ? 'MATCHED' : 'UNMATCHED' };
}
export function EntryEditor({ entries, catalog, onChange, disabled = false }: { entries: readonly MealEntry[]; catalog: FoodCatalog; onChange: (entries: readonly MealEntry[]) => void; disabled?: boolean }) {
  const [query, setQuery] = useState('');
  const change = (id: string, patch: Partial<MealComponent>) => onChange(entries.map(e => ({ ...e, userCorrected: e.components.some(c => c.componentId === id) || e.userCorrected, components: e.components.map(c => c.componentId === id ? { ...c, ...patch, userCorrected: true } : c) })));
  return <fieldset className="bare" disabled={disabled}>
    {entries.map(entry => <article className="card" key={entry.entryId}>
      <label>Tên món / nhóm<input value={entry.displayName} maxLength={120} onChange={e => onChange(entries.map(x => x.entryId === entry.entryId ? { ...x, displayName: e.target.value, userCorrected: true } : x))} /></label>
      {entry.components.map(c => <details key={c.componentId} open className="food-card">
        <summary>{c.displayName} · {formatNumber(c.carbEstimate)} {c.carbEstimate !== null ? 'g carb' : ''}</summary>
        <label>Tên thành phần<input value={c.displayName} maxLength={120} onChange={e => change(c.componentId, { displayName: e.target.value })} /></label>
        <label>Vai trò<select value={c.role} onChange={e => change(c.componentId, { role: e.target.value as MealComponent['role'] })}>{componentRoles.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}</select></label>
        <label>Món tham chiếu<select value={c.foodId ?? ''} onChange={e => { const f = catalog.getFoodById(e.target.value as FoodId); change(c.componentId, { foodId: f?.id ?? null, displayName: f?.nameVi ?? c.displayName, portion: referencePortion(f), matchState: f ? 'MATCHED' : 'UNMATCHED' }); }}><option value="">Tự nhập · dinh dưỡng chưa biết</option>{catalog.listDemoFoods().map(f => <option key={f.id} value={f.id}>{f.nameVi}</option>)}</select></label>
        <label>Đơn vị khẩu phần<select value={c.portion.unitId} onChange={e => { const unit = c.foodId && catalog.getPortionUnits?.(c.foodId).find(u => u.id === e.target.value); if (unit) change(c.componentId, { portion: selectPortion(unit, c.portion.quantity) }); }}><option value={c.portion.unitId}>{c.portion.displayLabelSnapshot}</option>{(c.foodId ? catalog.getPortionUnits?.(c.foodId) ?? [] : []).filter(u => u.id !== c.portion.unitId).map(u => <option key={u.id} value={u.id}>{u.labelVi}</option>)}</select></label><div className="chips">{[0.5, 1, 1.5, 2].map(quantity => <button key={quantity} aria-pressed={c.portion.quantity === quantity} onClick={() => change(c.componentId, { portion: { ...c.portion, quantity } })}>{quantity} phần</button>)}</div>
        <p>{formatNumber(c.carbEstimate)} g carb · {formatNumber(c.kcalEstimate)} kcal ước tính</p>
        {!c.userCorrected && <button onClick={() => change(c.componentId, {})}>Xác nhận thành phần này</button>}
        <button className="quiet" onClick={() => onChange(entries.map(e => ({ ...e, components: e.components.filter(x => x.componentId !== c.componentId) })))}>Xóa {c.displayName}</button>
      </details>)}
      <button onClick={() => onChange(entries.map(e => e.entryId === entry.entryId ? { ...e, components: [...e.components, newComponent(catalog)] } : e))}>＋ Thành phần</button>
      <button className="quiet" onClick={() => onChange(entries.filter(e => e.entryId !== entry.entryId))}>Xóa nhóm</button>
    </article>)}
    <div className="card"><h2>Thêm món</h2><div className="chips">{catalog.listDishTemplates?.().map(t => <button key={t.id} onClick={() => onChange([...entries, instantiateTemplate(t, newId(), id => catalog.getFoodById(id as FoodId))])}>＋ Cấu trúc {t.nameVi}</button>)}</div><label>Tìm danh mục<input value={query} onChange={e => setQuery(e.target.value)} /></label><div className="chips">{catalog.search(query).map(f => <button key={f.id} onClick={() => onChange([...entries, { entryId: newId(), dishTemplateId: null, displayName: f.nameVi, components: [newComponent(catalog, f.id)], userCorrected: true }])}>＋ {f.nameVi}</button>)}</div><button onClick={() => onChange([...entries, { entryId: newId(), dishTemplateId: null, displayName: 'Món tự nhập', components: [newComponent(catalog)], userCorrected: true }])}>＋ Món tự nhập</button></div>
  </fieldset>;
}
