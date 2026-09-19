import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '../../shared/ui/ServicesContext';
import { useQuery } from '../../shared/ui/useQuery';
import {
  ErrorNotice,
  DemoBadge,
  formatNumber,
  formatTime,
  Completeness,
} from '../../shared/ui/common';
import { MealThumbnail } from '../../shared/ui/MealThumbnail';
import { ok } from '../../domain/common/result';
export function HistoryPage() {
  const { meals, glucose } = useServices(),
    load = useCallback(async () => {
      const [m, g] = await Promise.all([meals.list(), glucose.list()]);
      if (!m.ok) return m;
      if (!g.ok) return g;
      return ok({ meals: m.value, readings: g.value });
    }, [meals, glucose]),
    state = useQuery(load);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DỮ LIỆU TRÊN THIẾT BỊ</p>
          <h1>Nhật ký của bạn</h1>
        </div>
        <Link className="button primary" to="/analyze">
          ＋ Ghi bữa ăn
        </Link>
      </div>
      <ErrorNotice error={state.error} retry={state.retry} />
      {state.loading && <p role="status">Đang đọc nhật ký…</p>}
      {state.data?.meals.length === 0 && (
        <div className="card empty">
          <h2>Một bữa ăn là khởi đầu</h2>
          <p>Chưa có bữa nào được lưu trên thiết bị này.</p>
          <Link to="/analyze">Ghi bữa đầu tiên →</Link>
        </div>
      )}
      <div className="history-list">
        {state.data?.meals.map((meal) => (
          <Link
            className="card history-row"
            key={meal.id}
            to={'/history/' + meal.id}
          >
            <MealThumbnail reference={meal.thumbnailRef} />
            <div>
              <p className="muted">
                {formatTime(meal.createdAt)} {meal.isDemo && <DemoBadge />}
              </p>
              <h2>{meal.items.map((i) => i.displayName).join(' · ')}</h2>
              <p>
                {formatNumber(meal.totalCarbEstimate)}
                {meal.totalCarbEstimate !== null
                  ? ' g carb ước tính'
                  : ''} ·{' '}
                {
                  state.data?.readings.filter((g) => g.mealId === meal.id)
                    .length
                }{' '}
                số đo liên kết
              </p>
              <Completeness value={meal.completeness} />
            </div>
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
    </>
  );
}
