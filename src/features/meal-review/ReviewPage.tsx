import { useState, useSyncExternalStore } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useServices } from '../../shared/ui/ServicesContext';
import {
  formatNumber,
  ErrorNotice,
  SafetyNote,
  Completeness,
  DemoBadge,
} from '../../shared/ui/common';
import { newId } from '../../shared/ids/newId';
import type { FoodId } from '../../domain/common/brandedIds';
import type { MealDraftItem } from '../../domain/meal/mealDraft';
export function ReviewPage() {
  const { session, catalog } = useServices(),
    { draft, error } = useSyncExternalStore(
      session.subscribe,
      session.getSnapshot,
    ),
    navigate = useNavigate(),
    [query, setQuery] = useState(''),
    [delta, setDelta] = useState<number | null>(null);
  if (
    !draft ||
    !['REVIEW_REQUIRED', 'REVIEW_READY', 'SAVE_ERROR', 'SAVING'].includes(
      draft.analysisState,
    )
  )
    return <Navigate to="/analyze" replace />;
  const busy = draft.analysisState === 'SAVING';
  function edit(id: string, patch: Partial<MealDraftItem>) {
    if (!draft) return;
    const before = draft.totalCarbEstimate;
    session.edit(
      draft.items.map((i) =>
        i.itemId === id ? { ...i, ...patch, userCorrected: true } : i,
      ),
    );
    const after = session.getSnapshot().draft?.totalCarbEstimate ?? null;
    setDelta(before === null || after === null ? null : after - before);
  }
  function add(foodId: FoodId | null) {
    if (!draft) return;
    const food = foodId ? catalog.getFoodById(foodId) : null;
    session.edit([
      ...draft.items,
      {
        itemId: newId<'MealDraftItemId'>(),
        foodId,
        displayName: food?.nameVi ?? 'Món tự nhập',
        portionMultiplier: 1,
        portionLabel: food?.servingLabel ?? '1 phần chưa xác định',
        carbEstimate: null,
        kcalEstimate: null,
        nutritionState: 'UNKNOWN',
        userCorrected: true,
        includedInTotal: true,
      },
    ]);
  }
  return (
    <>
      <p className="eyebrow">XEM LẠI & ĐIỀU CHỈNH</p>
      <h1>Bữa ăn theo cách của bạn</h1>
      {draft.source === 'DEMO_SAMPLE' && <DemoBadge />}
      <p>Kiểm tra từng món và khẩu phần trước khi lưu.</p>
      <div className="review-layout">
        <section>
          <fieldset disabled={busy} className="bare">
            {draft.items.map((item) => (
              <article className="card food-card" key={item.itemId}>
                <div className="food-heading">
                  <h2>{item.displayName}</h2>
                  <button
                    className="quiet"
                    onClick={() =>
                      session.edit(
                        draft.items.filter((i) => i.itemId !== item.itemId),
                      )
                    }
                    aria-label={'Xóa ' + item.displayName}
                  >
                    Xóa
                  </button>
                </div>
                <label>
                  Món tham chiếu
                  <select
                    value={item.foodId ?? ''}
                    onChange={(e) => {
                      const food = catalog.getFoodById(
                        e.target.value as FoodId,
                      );
                      edit(item.itemId, {
                        foodId: food?.id ?? null,
                        displayName: food?.nameVi ?? item.displayName,
                        portionLabel:
                          food?.servingLabel ?? '1 phần chưa xác định',
                      });
                    }}
                  >
                    <option value="">Món tự nhập · chưa có dinh dưỡng</option>
                    {catalog.listDemoFoods().map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nameVi}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tên hiển thị
                  <input
                    value={item.displayName}
                    maxLength={120}
                    onChange={(e) =>
                      edit(item.itemId, { displayName: e.target.value })
                    }
                  />
                </label>
                <p className="muted">{item.portionLabel}</p>
                <div className="portion-row">
                  <span>Khẩu phần</span>
                  <div className="chips">
                    {[0.5, 1, 1.5, 2].map((p) => (
                      <button
                        key={p}
                        aria-pressed={item.portionMultiplier === p}
                        onClick={() =>
                          edit(item.itemId, { portionMultiplier: p })
                        }
                      >
                        {p}×
                      </button>
                    ))}
                  </div>
                </div>
                <p>
                  <strong>{formatNumber(item.carbEstimate)}</strong>
                  {item.carbEstimate !== null ? ' g carb ước tính' : ''}{' '}
                  <span className="muted">
                    {' '}
                    · {formatNumber(item.kcalEstimate)}
                    {item.kcalEstimate !== null ? ' kcal' : ''}
                  </span>
                </p>
                {item.foodId && (
                  <details>
                    <summary>Nguồn tham chiếu</summary>
                    <small>
                      {catalog
                        .getFoodById(item.foodId)
                        ?.sourceRefs.join(' · ') || 'Chưa có nguồn dinh dưỡng'}
                    </small>
                  </details>
                )}
                {!item.foodId && !item.userCorrected && (
                  <button onClick={() => edit(item.itemId, {})}>
                    Giữ món này với dinh dưỡng chưa biết
                  </button>
                )}
              </article>
            ))}
            <div className="card">
              <h2>Thêm một món</h2>
              <label>
                Tìm trong danh mục
                <input
                  placeholder="Tên món…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="chips">
                {catalog.search(query).map((f) => (
                  <button key={f.id} onClick={() => add(f.id)}>
                    ＋ {f.nameVi}
                  </button>
                ))}
              </div>
              <button className="quiet" onClick={() => add(null)}>
                ＋ Món tự nhập
              </button>
            </div>
          </fieldset>
        </section>
        <aside>
          <div className="card totals">
            <p className="eyebrow">CARBOHYDRATE ƯỚC TÍNH</p>
            <p className="big-number" data-testid="carb-total">
              {formatNumber(draft.totalCarbEstimate)}
              {draft.totalCarbEstimate !== null && <small> g</small>}
            </p>
            <p>
              {formatNumber(draft.totalKcalEstimate)}
              {draft.totalKcalEstimate !== null ? ' kcal ước tính' : ''}
            </p>
            <Completeness value={draft.completeness} />
            {delta !== null && (
              <p className="delta" role="status">
                Thay đổi vừa rồi: {delta > 0 ? '+' : ''}
                {formatNumber(delta)} g carb ước tính
              </p>
            )}
            <label>
              Ghi chú (không bắt buộc)
              <textarea
                maxLength={2000}
                disabled={busy}
                value={draft.note ?? ''}
                onChange={(e) => session.note(e.target.value)}
              />
            </label>
            <ErrorNotice error={error} />
            <button
              className="primary full"
              disabled={
                busy ||
                !draft.items.length ||
                draft.analysisState === 'REVIEW_REQUIRED' ||
                draft.items.some((i) => !i.displayName.trim())
              }
              onClick={async () => {
                const id = await session.save();
                if (id) navigate('/history/' + id);
              }}
            >
              {busy ? 'Đang lưu…' : 'Lưu bữa ăn'}
            </button>
            <SafetyNote />
            <button
              className="quiet"
              disabled={busy}
              onClick={() => {
                session.cancel();
                navigate('/analyze');
              }}
            >
              Hủy bữa chưa lưu
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
