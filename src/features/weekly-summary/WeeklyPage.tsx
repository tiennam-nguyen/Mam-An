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
  GlucoseValue,
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
          <section className="card">
            <h2>Tóm tắt những điều đã ghi</h2>
            {summary.narrative.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </section>
          <section className="card report-meals">
            <h2>Bữa ăn trong báo cáo</h2>
            <p>
              Mã M1, M2… theo thời gian ghi bữa; chỉ dùng trong báo cáo này.
            </p>
            {summary.mealRows.map(
              ({ meal, reference, label, outsidePeriod }) => (
                <article key={meal.id} className="report-meal">
                  <h3>
                    <Link to={'/history/' + meal.id}>
                      {reference} · {label}
                    </Link>
                  </h3>
                  <p>
                    {formatTime(meal.createdAt)} {meal.isDemo && <DemoBadge />}
                    {outsidePeriod ? ' · Ngoài kỳ, chỉ để đối chiếu số đo' : ''}
                  </p>
                  <ul>
                    {meal.entries
                      .flatMap((e) => e.components)
                      .filter((c) => c.includedInTotal)
                      .map((c) => (
                        <li key={c.componentId}>
                          {c.displayName}: {formatNumber(c.portion.quantity)} ×{' '}
                          {c.portion.displayLabelSnapshot}
                        </li>
                      ))}
                  </ul>
                  <p>
                    {formatNumber(meal.totalCarbEstimate)}{' '}
                    {meal.totalCarbEstimate === null ? '' : 'g carb'} ·{' '}
                    {formatNumber(meal.totalKcalEstimate)}{' '}
                    {meal.totalKcalEstimate === null ? '' : 'kcal'} ·{' '}
                    {meal.completeness === 'COMPLETE'
                      ? 'Đủ dữ liệu cho thành phần đã ghi'
                      : 'Dinh dưỡng chưa đầy đủ'}
                  </p>
                </article>
              ),
            )}
          </section>
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
          <div className="card report-readings">
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
                    {summary.readingRows.map(
                      ({ reading: g, meal, linkLabel, timingLabel }) => (
                        <tr key={g.id}>
                          <td data-label="Thời điểm">
                            {formatTime(g.measuredAt)}
                          </td>
                          <td data-label="Số đo">
                            <GlucoseValue reading={g} />
                          </td>
                          <td data-label="Ghi nhận">
                            {g.isDemo ? <DemoBadge /> : 'Tự ghi'}
                            <div>
                              {meal ? (
                                <Link to={'/history/' + meal.meal.id}>
                                  {linkLabel}
                                </Link>
                              ) : (
                                linkLabel
                              )}
                            </div>
                          </td>
                          <td data-label="Thời gian so với bữa">
                            {timingLabel}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <section className="card">
            <h2>Thành phần thường ghi</h2>
            <ul>
              {summary.frequentComponents.map(([name, count]) => (
                <li key={name}>
                  {name}: {count} bữa đã ghi
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2>Ghi nhận từ các bữa tương tự</h2>
            {summary.observedPatternCards.map((p) => (
              <div key={p.mealId} className="report-pattern">
                {p.isDemo && <DemoBadge />}
                <PatternCard pattern={p.pattern} title={p.mealLabel} />
              </div>
            ))}
          </section>
          <SafetyNote kind="weekly" />
          <p className="muted">
            Dinh dưỡng từ bản chụp đã lưu của từng bữa; không tính lại theo danh
            mục mới. Nguồn danh mục: ASEANFOODS 2014 và USDA SR Legacy 2018. Lưu
            tại thiết bị.
          </p>
        </>
      )}
    </section>
  );
}
