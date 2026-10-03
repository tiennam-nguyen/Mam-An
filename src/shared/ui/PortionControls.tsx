import { useState } from 'react';
import type { FoodItem } from '../../domain/food/foodItem';
import type { PortionSelection } from '../../domain/meal/mealEntry';
import { selectPortion } from '../../domain/food/portionResolver';
import { formatNumber } from './common';

export function portionLabel(
  portion: PortionSelection,
  quantity = portion.quantity,
) {
  const label = portion.displayLabelSnapshot;
  const mass = label.match(/^(\d+(?:[.,]\d+)?)\s+(g|ml)\b(.*)$/);
  if (mass)
    return `${formatNumber(Number(mass[1]!.replace(',', '.')) * quantity)} ${mass[2]}${mass[3]}`;
  // Parenthetical mass describes the source unit; keep it in the guide, not a scaled chip.
  const compact = label
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/ theo nguồn$/, '');
  return /^1\s/.test(label)
    ? compact.replace(/^1\s/, formatNumber(quantity) + ' ')
    : `${formatNumber(quantity)} × ${label}`;
}

/** All inputs select the same persisted unit/quantity contract. No UI arithmetic. */
export function PortionControls({
  food,
  portion,
  onChange,
}: {
  food: FoodItem | null;
  portion: PortionSelection;
  onChange: (portion: PortionSelection) => void;
}) {
  const [invalid, setInvalid] = useState(false);
  const units = food?.portionUnits ?? [];
  const selected = units.find((u) => u.id === portion.unitId);
  const metric = selected?.kind === 'METRIC';
  const quantities = metric ? [50, 100, 150, 200] : [0.5, 1, 1.5, 2];
  return (
    <div className="portion-controls">
      <p className="portion-guide">Đang chọn: {portionLabel(portion)}</p>
      {!metric && (
        <small>
          Đơn vị gốc: {portion.displayLabelSnapshot}. Khối lượng trong ngoặc áp
          dụng cho đơn vị gốc.
        </small>
      )}
      {selected?.conversionQuality === 'ESTIMATED' && (
        <p className="muted">
          Quy đổi ước tính theo nguồn; kích cỡ thực tế có thể khác. Bạn có thể
          nhập lượng đã cân bên dưới.
        </p>
      )}
      {(portion.unitId.startsWith('describe:') || !food) && (
        <p>Chưa có quy đổi cho lượng này; dinh dưỡng chưa biết.</p>
      )}
      <div
        className="chips"
        aria-label={`Khẩu phần ${food?.nameVi ?? 'tự nhập'}`}
      >
        {quantities.map((quantity) => (
          <button
            key={quantity}
            aria-pressed={portion.quantity === quantity}
            onClick={() => onChange({ ...portion, quantity })}
          >
            {portionLabel(portion, quantity)}
          </button>
        ))}
      </div>
      <details>
        <summary>Nhập lượng cụ thể hoặc đổi đơn vị</summary>
        {units.length > 0 && (
          <label>
            Đơn vị khẩu phần
            <select
              value={portion.unitId}
              onChange={(e) => {
                const unit = units.find((u) => u.id === e.target.value);
                if (unit) {
                  onChange(
                    selectPortion(unit, unit.kind === 'METRIC' ? 100 : 1),
                  );
                  setInvalid(false);
                }
              }}
            >
              {!selected && (
                <option value={portion.unitId}>
                  {portion.displayLabelSnapshot}
                </option>
              )}
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.labelVi}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Số lượng
          <input
            key={portion.unitId + ':' + portion.quantity}
            type="number"
            inputMode="decimal"
            min="0.01"
            step="any"
            defaultValue={portion.quantity}
            onBlur={(e) => {
              const n = Number(e.target.value);
              const valid =
                e.target.value.trim() !== '' &&
                Number.isFinite(n) &&
                n > 0 &&
                n <= 10000;
              setInvalid(!valid);
              if (valid) onChange({ ...portion, quantity: n });
            }}
          />
        </label>
        {invalid && <p role="alert">Nhập số lớn hơn 0 và không quá 10.000.</p>}
        {selected?.sourceRef && (
          <details>
            <summary>Nguồn quy đổi</summary>
            <small>{selected.sourceRef}</small>
          </details>
        )}
      </details>
    </div>
  );
}
