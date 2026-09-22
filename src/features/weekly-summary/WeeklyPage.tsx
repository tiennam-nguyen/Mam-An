import { localDate } from '../../domain/summary/weeklyAggregator';
import { PatternCard } from '../personal-response/MealEvidence';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '../../shared/ui/ServicesContext';
import { useQuery } from '../../shared/ui/useQuery';
import {
  ErrorNotice,
  SafetyNote,
  DemoBadge,
  formatNumber,
  formatTime,
} from '../../shared/ui/common';
import { getWeeklySummary } from '../../application/usecases/getWeeklySummary';
export function WeeklyPage({ report = false }: { report?: boolean }) {
  const { meals, glucose, clock } = useServices(),
    [endDay, setEndDay] = useState(localDate(clock.now())),
    load = useCallback(
      () =>
        getWeeklySummary(
          meals,
          glucose,
          report ? new Date(endDay + 'T12:00:00') : clock.now(),
        ),
      [meals, glucose, clock, report, endDay],
    ),
    state = useQuery(load),
    summary = state.data;
  return (
    <section className={report ? 'report' : ''}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">BẢY NGÀY · TỪ NHỮNG ĐIỀU ĐÃ GHI</p>
          <h1>{report ? 'Báo cáo tuần · Mâm An' : 'Tuần của tôi'}</h1>
        </div>
        {report ? (
          <button
            className="primary no-print"
            disabled={!summary}
            onClick={() => window.print()}
          >
            In / Lưu PDF
          </button>
        ) : (
          <Link className="button" to="/report/weekly">
            Xem báo cáo ↗
          </Link>
        )}
      </div>
      {report && (
        <label className="no-print">
          Ngày kết thúc khoảng 7 ngày
          <input
            type="date"
            value={endDay}
            onChange={(e) => {
              if (e.target.value) setEndDay(e.target.value);
            }}
          />
        </label>
      )}
      <ErrorNotice error={state.error} retry={state.retry} />
      {state.loading && <p role="status">Đang tổng hợp…</p>}
      {summary && (
        <>
          <p>
            {new Date(summary.periodStart).toLocaleDateString('vi-VN')} –{' '}
            {new Date(
              new Date(summary.periodEnd).getTime() - 1,
            ).toLocaleDateString('vi-VN')}
          </p>
          <div className="metric-grid">
            <div className="card">
              <span className="big-number">{summary.loggedMealCount}</span>
              <p>bữa đã ghi</p>
            </div>
            <div className="card">
              <span className="big-number">
                {summary.glucoseReadings.length}
              </span>
              <p>số đo đã nhập</p>
            </div>
            <div className="card">
              <h2>Dữ liệu của bạn</h2>
              <p>
                {summary.meals.filter((m) => m.isDemo).length} bữa mẫu ·{' '}
                {summary.meals.filter((m) => !m.isDemo).length} bữa tự ghi
              </p>
            </div>
          </div>
          <div className="card">
            <h2>Carb ước tính theo ngày</h2>
            <p className="muted">
              Từ các bữa đã ghi. Không có bản ghi không có nghĩa là không ăn.
            </p>
            <div className="daily-list">
              {summary.dailyLoggedCarbEstimates.map((day) => (
                <div className="daily-row" key={day.localDate}>
                  <span>
                    {day.localDate.slice(8)}/{day.localDate.slice(5, 7)}
                  </span>
                  <div className="bar-track">
                    <div
                      className="bar"
                      style={{
                        width:
                          (day.totalKnownCarb === null
                            ? 0
                            : Math.max(
                                2,
                                (day.totalKnownCarb /
                                  Math.max(
                                    1,
                                    ...summary.dailyLoggedCarbEstimates.map(
                                      (d) => d.totalKnownCarb ?? 0,
                                    ),
                                  )) *
                                  100,
                              )) + '%',
                      }}
                    />
                  </div>
                  <span>
                    {day.mealCount === 0
                      ? 'Chưa ghi'
                      : day.totalKnownCarb === null
                        ? 'Chưa biết'
                        : formatNumber(day.totalKnownCarb) + ' g'}
                    {day.hasPartialMeals ? ' · Chưa đầy đủ' : ''}
                  </span>
                </div>
              ))}
            </div>
            {summary.hasPartialMeals && <SafetyNote kind="partial" />}
          </div>
          <div className="card">
            <h2>Các số đo đã nhập</h2>
            <SafetyNote kind="glucose" />
            {!summary.glucoseReadings.length ? (
              <p>Chưa có số đo trong tuần này.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Thời điểm</th>
                      <th>Số đo</th>
                      <th>Ghi nhận</th>
                      <th>Thời gian so với bữa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.glucoseReadings.map((g) => (
                      <tr key={g.id}>
                        <td>{formatTime(g.measuredAt)}</td>
                        <td>
                          {formatNumber(g.value)}{' '}
                          {g.unit === 'MG_DL' ? 'mg/dL' : 'mmol/L'}
                        </td>
                        <td>
                          {g.isDemo ? <DemoBadge /> : 'Tự ghi'}
                          {g.mealId ? ' · Có liên kết bữa' : ''}
                        </td>
                        <td>
                          {g.mealId &&
                          summary.meals.some((m) => m.id === g.mealId)
                            ? Math.round(
                                (Date.parse(g.measuredAt) -
                                  Date.parse(
                                    summary.meals.find(
                                      (m) => m.id === g.mealId,
                                    )!.createdAt,
                                  )) /
                                  60000,
                              ) + ' phút'
                            : 'Chưa có liên kết trong kỳ'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <section className="card">
            <h2>Thành phần thường ghi</h2>
            <ul>
              {Object.entries(
                summary.meals
                  .flatMap((m) => [
                    ...new Set(
                      m.entries.flatMap((e) =>
                        e.components
                          .filter((c) => c.includedInTotal)
                          .map((c) => c.displayName),
                      ),
                    ),
                  ])
                  .reduce<Record<string, number>>(
                    (counts, name) => ({
                      ...counts,
                      [name]: (counts[name] ?? 0) + 1,
                    }),
                    {},
                  ),
              )
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .slice(0, 5)
                .map(([name, count]) => (
                  <li key={name}>
                    {name}: {count} bữa đã ghi
                  </li>
                ))}
            </ul>
          </section>
          <section>
            <h2>Ghi nhận từ các bữa tương tự</h2>
            {summary.observedPatternCards.map((p) => (
              <div key={p.mealId}>
                {p.isDemo && <DemoBadge />}
                <PatternCard pattern={p.pattern} />
              </div>
            ))}
          </section>
          <SafetyNote kind="weekly" />
          <p className="muted">
            Nguồn dinh dưỡng: ASEANFOODS 2014 · Lưu tại thiết bị
          </p>
        </>
      )}
    </section>
  );
}
