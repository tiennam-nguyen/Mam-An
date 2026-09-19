import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '../../shared/ui/ServicesContext';
import { seedDemoData } from '../../application/usecases/seedDemoData';
import { ErrorNotice } from '../../shared/ui/common';
import type { AppError } from '../../shared/errors/appError';
export function DemoPage() {
  const { demo, catalog, clock } = useServices(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<AppError | null>(null),
    [message, setMessage] = useState(''),
    [confirm, setConfirm] = useState(false);
  async function seed(force: boolean) {
    setBusy(true);
    setMessage('');
    setError(null);
    const result = await seedDemoData(demo, catalog, clock.now(), force);
    setBusy(false);
    setConfirm(false);
    if (!result.ok) setError(result.error);
    else setMessage('Đã chuẩn bị 7 ngày dữ liệu mẫu.');
  }
  return (
    <section className="narrow">
      <p className="eyebrow">KHÁM PHÁ BẰNG DỮ LIỆU MẪU</p>
      <h1>Một tuần để khám phá</h1>
      <div className="card">
        <h2>Dữ liệu mẫu, được ghi rõ</h2>
        <p>
          Tạo 7 bữa ăn và 7 số đo giả lập trong tuần hiện tại. Các số đo này chỉ
          dùng minh họa thao tác.
        </p>
        <p>
          Đặt lại chỉ thay các bản ghi mẫu. Bản ghi tự nhập được giữ nguyên; số
          đo tự nhập vẫn còn nếu bữa mẫu liên kết bị xóa.
        </p>
        <ErrorNotice error={error} />
        <p role="status">{message}</p>
        <div className="actions">
          <button
            className="primary"
            disabled={busy}
            onClick={() => void seed(false)}
          >
            Tạo dữ liệu mẫu
          </button>
          <button disabled={busy} onClick={() => setConfirm(true)}>
            Đặt lại dữ liệu mẫu
          </button>
        </div>
        {confirm && (
          <div className="notice">
            <p>
              Thay các bản ghi mẫu bằng bộ mẫu ban đầu? Có thể tạo lại bộ mẫu,
              nhưng chỉnh sửa trên bữa mẫu cũ sẽ không được giữ.
            </p>
            <button disabled={busy} onClick={() => void seed(true)}>
              Xác nhận đặt lại mẫu
            </button>
            <button onClick={() => setConfirm(false)}>Hủy</button>
          </div>
        )}
        <p>
          <Link to="/weekly">Xem tuần của tôi →</Link>
        </p>
      </div>
    </section>
  );
}
