import { MealEvidence } from '../personal-response/MealEvidence';
import { useCallback, useState } from 'react';
import type { AppError } from '../../shared/errors/appError';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useServices } from '../../shared/ui/ServicesContext';
import { useQuery } from '../../shared/ui/useQuery';
import {
  ErrorNotice,
  DemoBadge,
  formatNumber,
  formatTime,
  Completeness,
  SafetyNote,
} from '../../shared/ui/common';
import { MealThumbnail } from '../../shared/ui/MealThumbnail';
import type { MealId } from '../../domain/common/brandedIds';
import { ok } from '../../domain/common/result';
export function MealDetailPage() {
  const [saveError, setSaveError] = useState<AppError | null>(null);
  const { mealId } = useParams(),
    navigate = useNavigate(),
    { meals, glucose, session, settings } = useServices(),
    load = useCallback(async () => {
      const m = await meals.getById(mealId as MealId);
      if (!m.ok) return m;
      const g = await glucose.list({ mealId: mealId as MealId });
      if (!g.ok) return g;
      const preferences = await settings.get();
      if (!preferences.ok) return preferences;
      return ok({
        meal: m.value,
        readings: g.value,
        settings: preferences.value,
      });
    }, [mealId, meals, glucose, settings]),
    state = useQuery(load),
    meal = state.data?.meal;
  return (
    <section className="narrow">
      <Link to="/history">← Nhật ký</Link>
      <h1>Bữa ăn đã lưu</h1>
      <ErrorNotice error={state.error} retry={state.retry} />
      <ErrorNotice error={saveError} />
      {state.loading && <p role="status">Đang đọc bữa ăn…</p>}
      {state.data && !meal && <p>Không tìm thấy bữa ăn này.</p>}
      {meal && (
        <>
          <div className="card">
            <MealThumbnail reference={meal.thumbnailRef} />
            <p>
              {formatTime(meal.createdAt)} {meal.isDemo && <DemoBadge />}
            </p>
            <p className="big-number">
              {formatNumber(meal.totalCarbEstimate)}
              {meal.totalCarbEstimate !== null && <small> g carb</small>}
            </p>
            <Completeness value={meal.completeness} />
            <button
              onClick={() => {
                session.reuse(meal);
                navigate('/meal/review');
              }}
            >
              Dùng lại làm bữa mới
            </button>
            <button
              onClick={async () => {
                const current = state.data!.settings;
                const ids = current.favouriteMealIds ?? [];
                const result = await settings.save({
                  ...current,
                  favouriteMealIds: ids.includes(meal.id)
                    ? ids.filter((id) => id !== meal.id)
                    : [...ids, meal.id].slice(-100),
                });
                if (result.ok) {
                  setSaveError(null);
                  state.retry();
                } else setSaveError(result.error);
              }}
            >
              {state.data?.settings.favouriteMealIds?.includes(meal.id)
                ? 'Bỏ yêu thích'
                : 'Đánh dấu yêu thích'}
            </button>
            {meal.entries.map((e) => (
              <section key={e.entryId}>
                <h2>{e.displayName}</h2>
                <ul>
                  {e.components.map((c) => (
                    <li key={c.componentId}>
                      {c.displayName} · {c.portion.quantity} ×{' '}
                      {c.portion.displayLabelSnapshot} ·{' '}
                      {c.carbEstimate === null
                        ? 'Carb chưa biết'
                        : `${formatNumber(c.carbEstimate)} g carb ước tính`}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {meal.note && <p>Ghi chú: {meal.note}</p>}
            <p className="muted">
              Ước tính được giữ nguyên theo dữ liệu tại thời điểm lưu.
            </p>
            <SafetyNote />
          </div>
          <MealEvidence
            draft={meal}
            mode={meal.isDemo ? 'DEMO' : 'USER'}
            excludeId={meal.id}
          />
          <div className="page-heading">
            <h2>Số đo liên kết</h2>
            <Link className="button" to={'/glucose/new?mealId=' + meal.id}>
              Thêm số đo
            </Link>
          </div>
          <SafetyNote kind="glucose" />
          {state.data?.readings.length === 0 && <p>Chưa có số đo liên kết.</p>}
          {state.data?.readings.map((g) => (
            <div className="card" key={g.id}>
              <strong>
                {formatNumber(g.value)}{' '}
                {g.unit === 'MG_DL' ? 'mg/dL' : 'mmol/L'}
              </strong>
              <p>
                {formatTime(g.measuredAt)} {g.isDemo && <DemoBadge />}
              </p>
              {g.note && <p>{g.note}</p>}
            </div>
          ))}
        </>
      )}
    </section>
  );
}
