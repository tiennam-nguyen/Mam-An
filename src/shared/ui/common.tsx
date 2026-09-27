import type { AppError } from '../errors/appError';
import { errorPresenter } from '../../application/services/errorPresenter';
import { safetyCopy } from '../content/safetyCopy';
import type { GlucoseReading } from '../../domain/glucose/glucoseReading';
import { isGlucoseValueUsable } from '../../domain/glucose/glucoseValidation';
export function GlucoseValue({ reading }: { reading: GlucoseReading }) {
  const unit = reading.unit === 'MG_DL' ? 'mg/dL' : 'mmol/L';
  if (!isGlucoseValueUsable(reading.value, reading.unit))
    return (
      <div className="glucose-value">
        <strong>Giá trị cần kiểm tra</strong>
        <small> Số đo gốc được giữ nguyên; không dùng để tổng hợp.</small>
        <details>
          <summary>Xem giá trị đã lưu</summary>
          <span>
            {String(reading.value)} {unit}
          </span>
        </details>
      </div>
    );
  return (
    <span className="glucose-value">
      {new Intl.NumberFormat('vi-VN', {
        maximumFractionDigits: reading.unit === 'MG_DL' ? 0 : 1,
      }).format(reading.value)}{' '}
      {unit}
    </span>
  );
}
export const formatNumber = (value: number | null) =>
  value === null
    ? 'Chưa có dữ liệu'
    : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(
        value,
      );
export const formatTime = (value: string) =>
  new Date(value).toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
export function ErrorNotice({
  error,
  retry,
}: {
  error: AppError | null;
  retry?: () => void;
}) {
  return error ? (
    <div className="notice error" role="alert">
      <p>{errorPresenter(error)}</p>
      {retry && <button onClick={retry}>Thử lại</button>}
    </div>
  ) : null;
}
export function SafetyNote({
  kind = 'estimate',
}: {
  kind?: keyof typeof safetyCopy;
}) {
  return <p className="safety">{safetyCopy[kind]}</p>;
}
export function DemoBadge() {
  return <span className="badge">Dữ liệu mẫu</span>;
}
export function Completeness({ value }: { value: string }) {
  return value === 'COMPLETE' ? null : (
    <p className="notice">
      {value === 'UNKNOWN' ? safetyCopy.unknown : safetyCopy.partial}
    </p>
  );
}
