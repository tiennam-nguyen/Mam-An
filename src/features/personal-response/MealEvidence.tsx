import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useServices } from '../../shared/ui/ServicesContext';
import { useQuery } from '../../shared/ui/useQuery';
import { ErrorNotice } from '../../shared/ui/common';
import { getPersonalResponse } from '../../application/usecases/getPersonalResponse';
import {
  buildEvidenceBundle,
  minimizeEvidence,
  templateExplanation,
} from '../../domain/explanation/explanation';
import type { MealDraft } from '../../domain/meal/mealDraft';
import type { MealScenario } from '../../domain/meal/decisionSimulator';
import type { PatternEvidence } from '../../domain/personal/personalResponse';
import type { ExplanationResult } from '../../domain/explanation/explanation';
import { patternCopy } from '../../domain/explanation/explanation';
import { Link } from 'react-router-dom';
export function PatternCard({
  pattern,
  title = 'Quan sát từ các bữa tương tự',
}: {
  pattern: PatternEvidence;
  title?: string;
}) {
  const p = pattern;
  return (
    <section className="card">
      <h2>{title}</h2>
      <p>
        {patternCopy({
          evidenceKey: 'pattern.summary',
          sampleCount: p.sampleCount,
          timingBucketMinutes: p.statistics.timingBucketMinutes,
          medianPostMealMgDl: p.statistics.medianPostMealMgDl,
          medianDeltaFromPremealMgDl: p.statistics.medianDeltaFromPremealMgDl,
          dataQuality: p.dataQuality,
          caveats: p.caveats,
        })}
      </p>
      {p.dataQuality === 'SUFFICIENT_FOR_DESCRIPTION' && (
        <>
          <p>
            Khoảng quan sát giữa các bữa:{' '}
            {p.statistics.minMgDl?.toLocaleString('vi-VN')}–
            {p.statistics.maxMgDl?.toLocaleString('vi-VN')} mg/dL (trung vị số
            đo của từng bữa).
          </p>
          <p>
            {p.statistics.medianDeltaFromPremealMgDl === null
              ? 'Chưa đủ số đo trước bữa để mô tả mức thay đổi.'
              : `Chênh lệch trung vị so với trước bữa: ${p.statistics.medianDeltaFromPremealMgDl.toLocaleString('vi-VN')} mg/dL, từ ${p.premealTrace.length} bữa có mốc trước bữa.`}
          </p>
        </>
      )}
      <p className="muted">
        So sánh theo món, thành phần và lượng carb đã ghi. Đây là quan sát cá
        nhân, không phải dự đoán hoặc khuyến nghị điều trị.
      </p>
      {p.sampleCount > 0 && (
        <p>
          {p.sampleCount} bữa góp số đo vào nhóm thời điểm này. Các nhóm cách
          nhau 30 phút chỉ để so sánh thời điểm.
        </p>
      )}
      {p.glucoseObservations.length > 0 && (
        <details>
          <summary>Xem thời điểm ghi nhận</summary>
          <ul>
            {p.matches.map((m) => (
              <li key={m.mealId}>
                <Link to={'/history/' + m.mealId}>
                  {m.mealLabel || 'Bữa tương tự'}
                  {m.createdAt
                    ? ' · ' + new Date(m.createdAt).toLocaleString('vi-VN')
                    : ''}
                </Link>
              </li>
            ))}
          </ul>
          <ul>
            {p.glucoseObservations.map((o) => (
              <li key={o.readingId}>
                {o.minutesFromMeal} phút so với bữa ·{' '}
                {o.valueNormalized.toLocaleString('vi-VN')} mg/dL ·{' '}
                {o.source === 'DEMO'
                  ? 'Mẫu'
                  : o.source === 'DEVICE'
                    ? 'Thiết bị'
                    : 'Tự nhập'}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
export function MealEvidence({
  draft,
  mode,
  excludeId,
  scenario = null,
}: {
  draft: Pick<
    MealDraft,
    'entries' | 'totalCarbEstimate' | 'totalKcalEstimate' | 'completeness'
  >;
  mode: 'USER' | 'DEMO';
  excludeId?: string;
  scenario?: MealScenario | null;
}) {
  const { meals, glucose, knowledge, explanations, textExplanationEnabled } =
    useServices();
  const [generated, setGenerated] = useState<{
      key: string;
      value: ExplanationResult;
    } | null>(null),
    [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const compared = useMemo(
    () =>
      scenario
        ? { ...draft, ...scenario.after, entries: scenario.resultingEntries }
        : draft,
    [draft, scenario],
  );
  const load = useCallback(
    () => getPersonalResponse(compared, meals, glucose, mode, excludeId),
    [compared, meals, glucose, mode, excludeId],
  );
  const state = useQuery(load);
  const bundle = buildEvidenceBundle(
      draft,
      state.data ?? null,
      knowledge,
      scenario,
    ),
    payload = minimizeEvidence(bundle),
    fallback = templateExplanation(payload);
  const payloadKey = JSON.stringify(payload);
  useEffect(() => {
    controller.current?.abort();
    setLoading(false);
    return () => controller.current?.abort();
  }, [payloadKey]);
  const explanation =
    generated?.key === payloadKey ? generated.value : fallback;
  return (
    <>
      <ErrorNotice error={state.error} />
      {state.loading && <p role="status">Đang xem dữ liệu trên thiết bị…</p>}
      {state.data && <PatternCard pattern={state.data} />}
      <section className="card">
        <h2>Giải thích từ dữ liệu</h2>
        <small>
          {explanation.generationMode === 'TEMPLATE'
            ? 'Mẫu trên thiết bị'
            : 'Diễn đạt tự động từ dữ liệu'}
        </small>
        {textExplanationEnabled && (
          <>
            <p>
              Chỉ khi bạn chọn: gửi phần tóm tắt và số liệu tổng hợp để diễn
              đạt. Không gửi ghi chú hoặc toàn bộ nhật ký.
            </p>
            <button
              disabled={loading}
              onClick={async () => {
                controller.current?.abort();
                const active = new AbortController();
                controller.current = active;
                setLoading(true);
                const value = await explanations.generateExplanation(
                  payload,
                  active.signal,
                );
                if (!active.signal.aborted) {
                  setGenerated({ key: payloadKey, value });
                  setLoading(false);
                }
              }}
            >
              {loading ? 'Đang diễn đạt…' : 'Diễn đạt lại bằng AI'}
            </button>
          </>
        )}
        <p>{explanation.summaryVi}</p>
        {explanation.optionExplanationsVi.map((s, i) => (
          <p key={i}>{s}</p>
        ))}
        {bundle.retrievedKnowledge.map((k) => (
          <details key={k.id}>
            <summary>{k.title}</summary>
            <p>{k.body}</p>
            <small>{k.sourceLabel}</small>
          </details>
        ))}
        <p className="muted">{explanation.uncertaintyNoteVi}</p>
      </section>
    </>
  );
}
