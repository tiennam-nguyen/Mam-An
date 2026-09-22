import { VoiceInput } from '../../shared/ui/VoiceInput';
import { MealEvidence } from '../personal-response/MealEvidence';
import { useSyncExternalStore } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useServices } from '../../shared/ui/ServicesContext';
import {
  formatNumber,
  ErrorNotice,
  SafetyNote,
  Completeness,
  DemoBadge,
} from '../../shared/ui/common';
import { EntryEditor } from './EntryEditor';
export function ReviewPage() {
  const { session, catalog } = useServices();
  const { draft, error } = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
  );
  const navigate = useNavigate();
  if (
    !draft ||
    !['REVIEW_REQUIRED', 'REVIEW_READY', 'SAVE_ERROR', 'SAVING'].includes(
      draft.analysisState,
    )
  )
    return <Navigate to="/meal/new" replace />;
  const busy = draft.analysisState === 'SAVING';
  return (
    <div className="review-page">
      <p className="eyebrow">XEM LẠI & ĐIỀU CHỈNH</p>
      <h1>Bữa ăn theo cách của bạn</h1>
      {draft.source === 'DEMO_SAMPLE' && <DemoBadge />}
      <p>Kiểm tra từng thành phần và khẩu phần trước khi lưu.</p>
      <div className="review-layout">
        <section>
          <EntryEditor
            entries={draft.entries}
            catalog={catalog}
            onChange={(e) => session.editEntries(e)}
            disabled={busy}
          />
        </section>
        <aside>
          <div className="card totals">
            <h2>Ước tính bữa ăn</h2>
            <p className="big-number" data-testid="carb-total">
              {formatNumber(draft.totalCarbEstimate)}
              {draft.totalCarbEstimate !== null ? ' g' : ''}
            </p>
            <p>{formatNumber(draft.totalKcalEstimate)} kcal</p>
            <Completeness value={draft.completeness} />
            <button
              disabled={
                busy ||
                draft.analysisState === 'REVIEW_REQUIRED' ||
                !draft.items.length
              }
              onClick={() => {
                session.discardSimulation();
                navigate('/meal/simulate');
              }}
            >
              Thử phương án khác
            </button>
            <label>
              Ghi chú
              <textarea
                maxLength={2000}
                disabled={busy}
                value={draft.note ?? ''}
                onChange={(e) => session.note(e.target.value)}
              />
            </label>
            <VoiceInput
              label="ghi chú"
              onConfirm={(text) => session.note(text)}
            />
            <ErrorNotice error={error} />
            <div className="review-save">
              <span className="mobile-total">
                Ước tính
                <br />
                <strong>
                  {formatNumber(draft.totalCarbEstimate)}
                  {draft.totalCarbEstimate !== null ? ' g carb' : ''}
                </strong>
              </span>
              <button
                className="primary full"
                disabled={
                  busy ||
                  !draft.items.length ||
                  draft.analysisState === 'REVIEW_REQUIRED' ||
                  draft.items.some((i) => !i.displayName.trim()) ||
                  draft.entries.some((e) => !e.displayName.trim())
                }
                onClick={async () => {
                  const id = await session.save();
                  if (id) navigate('/meal/' + id);
                }}
              >
                {busy ? 'Đang lưu…' : 'Lưu bữa ăn'}
              </button>
            </div>
            {draft.analysisState === 'REVIEW_REQUIRED' && (
              <p role="status">
                Xác nhận các thành phần chưa rõ để lưu bữa ăn.
              </p>
            )}
            <SafetyNote />
            <button
              className="quiet"
              disabled={busy}
              onClick={() => {
                session.cancel();
                navigate('/meal/new');
              }}
            >
              Hủy bữa chưa lưu
            </button>
          </div>
          <MealEvidence
            draft={draft}
            mode={draft.source === 'DEMO_SAMPLE' ? 'DEMO' : 'USER'}
          />
        </aside>
      </div>
    </div>
  );
}
