import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useServices } from '../../shared/ui/ServicesContext';
import { useQuery } from '../../shared/ui/useQuery';
import { ErrorNotice, SafetyNote, formatTime } from '../../shared/ui/common';
import type { AppError } from '../../shared/errors/appError';
import type {
  GlucoseReading,
  GlucoseUnit,
} from '../../domain/glucose/glucoseReading';
import type { MealId } from '../../domain/common/brandedIds';
import { newId } from '../../shared/ids/newId';
import { addGlucoseReading } from '../../application/usecases/addGlucoseReading';
import { ok } from '../../domain/common/result';
import {
  glucoseInputHint,
  parseGlucoseInput,
} from '../../domain/glucose/glucoseValidation';
function localInput() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
export function GlucosePage() {
  const { meals, glucose, settings } = useServices(),
    [params] = useSearchParams(),
    navigate = useNavigate(),
    [value, setValue] = useState(''),
    [unit, setUnit] = useState<GlucoseUnit>('MMOL_L'),
    [time, setTime] = useState(localInput),
    [mealId, setMealId] = useState(params.get('mealId') ?? ''),
    [timing, setTiming] = useState<GlucoseReading['timingTag']>(null),
    [touched, setTouched] = useState(false),
    [unitNotice, setUnitNotice] = useState(''),
    [note, setNote] = useState(''),
    [error, setError] = useState<AppError | null>(null),
    [busy, setBusy] = useState(false),
    saving = useRef(false),
    id = useRef(newId<'GlucoseReadingId'>());
  const load = useCallback(async () => {
      const [m, s] = await Promise.all([meals.list(), settings.get()]);
      if (!m.ok) return m;
      if (!s.ok) return s;
      return ok({ meals: m.value, settings: s.value });
    }, [meals, settings]),
    state = useQuery(load);
  useEffect(() => {
    if (state.data) setUnit(state.data.settings.glucoseUnit);
  }, [state.data]);
  const parsed = parseGlucoseInput(value, unit);
  const selectedMeal = state.data?.meals.find((m) => m.id === mealId);
  return (
    <section className="narrow">
      <p className="eyebrow">GHI NHẬN CỦA BẠN</p>
      <h1>Thêm số đo đường huyết</h1>
      <SafetyNote kind="glucose" />
      <ErrorNotice error={state.error} retry={state.retry} />
      <form
        className="card form-grid"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving.current) return;
          setTouched(true);
          if (parsed === null) return;
          saving.current = true;
          setBusy(true);
          const result = await addGlucoseReading(
            {
              id: id.current,
              value: parsed,
              unit,
              measuredAt: time,
              mealId: (mealId as MealId) || null,
              timingTag: timing,
              note: note || null,
              isDemo:
                state.data?.meals.find((m) => m.id === mealId)?.isDemo ?? false,
            },
            glucose,
            meals,
          );
          setBusy(false);
          saving.current = false;
          if (!result.ok) setError(result.error);
          else navigate(mealId ? '/history/' + mealId : '/weekly');
        }}
      >
        <label>
          Giá trị
          <input
            required
            type="text"
            disabled={state.loading || !!state.error}
            inputMode="decimal"
            autoComplete="off"
            aria-describedby="glucose-hint glucose-error"
            aria-invalid={touched && parsed === null}
            value={value}
            onBlur={() => setTouched(true)}
            onPaste={(e) => {
              const input = e.currentTarget;
              const candidate =
                value.slice(0, input.selectionStart ?? 0) +
                e.clipboardData.getData('text') +
                value.slice(input.selectionEnd ?? value.length);
              // Text inputs strip pasted newlines before onChange. Reject the
              // original complete text so "6\n7" cannot become a different 67.
              if (parseGlucoseInput(candidate, unit) === null) {
                e.preventDefault();
                setValue('');
                setTouched(true);
              }
            }}
            onChange={(e) => {
              setValue(e.target.value);
              setTouched(true);
            }}
          />
        </label>
        <small id="glucose-hint">{glucoseInputHint(unit)}</small>
        <p
          id="glucose-error"
          role={touched && parsed === null ? 'alert' : undefined}
        >
          {touched && parsed === null
            ? `Số đo chưa hợp lệ. ${glucoseInputHint(unit)}`
            : ''}
        </p>
        <label>
          Đơn vị
          <select
            value={unit}
            disabled={state.loading || !!state.error}
            onChange={(e) => {
              if (e.target.value === unit) return;
              setUnit(e.target.value as GlucoseUnit);
              setValue('');
              setTouched(false);
              setUnitNotice(
                'Đã đổi đơn vị. Hãy nhập lại số đo theo đơn vị mới.',
              );
            }}
          >
            <option value="MMOL_L">mmol/L</option>
            <option value="MG_DL">mg/dL</option>
          </select>
        </label>
        {unitNotice && <p role="status">{unitNotice}</p>}
        <label>
          Thời điểm đo
          <input
            required
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        <p>
          {selectedMeal
            ? `Gắn với bữa: ${selectedMeal.entries.map((e) => e.displayName).join(' · ')} · ${formatTime(selectedMeal.createdAt)}${selectedMeal.isDemo ? ' · Dữ liệu mẫu' : ''}`
            : 'Số đo riêng, chưa gắn với bữa ăn.'}
        </p>
        <details>
          <summary>Thêm thông tin (tùy chọn)</summary>
          <label>
            Liên kết bữa ăn (tùy chọn)
            <select value={mealId} onChange={(e) => setMealId(e.target.value)}>
              <option value="">Không liên kết</option>
              {state.data?.meals.map((m) => (
                <option value={m.id} key={m.id}>
                  {formatTime(m.createdAt)} · {m.items[0]?.displayName}
                  {m.isDemo ? ' · Mẫu' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Thời điểm so với bữa
            <select
              value={timing ?? ''}
              onChange={(e) =>
                setTiming(
                  (e.target.value || null) as GlucoseReading['timingTag'],
                )
              }
            >
              <option value="">Chưa chọn</option>
              <option value="BEFORE_MEAL">Trước bữa</option>
              <option value="AFTER_MEAL">Sau bữa</option>
              <option value="OTHER">Khác</option>
            </select>
          </label>
          <label>
            Ghi chú
            <textarea
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </details>
        <ErrorNotice error={error} />
        <button
          className="primary"
          disabled={busy || state.loading || !!state.error}
        >
          {busy ? 'Đang lưu…' : 'Lưu số đo'}
        </button>
        <SafetyNote />
      </form>
    </section>
  );
}
