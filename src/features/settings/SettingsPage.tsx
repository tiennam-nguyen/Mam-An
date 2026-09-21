import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '../../shared/ui/ServicesContext';
import { useQuery } from '../../shared/ui/useQuery';
import { ErrorNotice } from '../../shared/ui/common';
import type { GlucoseUnit } from '../../domain/glucose/glucoseReading';
import type { AppError } from '../../shared/errors/appError';
export function SettingsPage() {
  const { settings } = useServices(),
    load = useCallback(() => settings.get(), [settings]),
    state = useQuery(load),
    [error, setError] = useState<AppError | null>(null),
    [message, setMessage] = useState('');
  return (
    <section className="narrow">
      <h1>Thiết lập</h1>
      <ErrorNotice error={state.error} retry={state.retry} />
      <ErrorNotice error={error} />
      {state.data && (
        <div className="card">
          <label>
            Đơn vị cho số đo mới
            <select
              value={state.data.glucoseUnit}
              onChange={async (e) => {
                const result = await settings.save({
                  ...state.data!,
                  glucoseUnit: e.target.value as GlucoseUnit,
                });
                if (result.ok) {
                  setMessage('Đã lưu thiết lập.');
                  state.retry();
                } else setError(result.error);
              }}
            >
              <option value="MMOL_L">mmol/L</option>
              <option value="MG_DL">mg/dL</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.data.largeTextEnabled ?? false}
              onChange={async (e) => {
                const result = await settings.save({
                  ...state.data!,
                  largeTextEnabled: e.target.checked,
                });
                if (result.ok) {
                  window.dispatchEvent(new Event('mam-an-settings'));
                  state.retry();
                } else setError(result.error);
              }}
            />{' '}
            Chữ lớn
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.data.voiceInputEnabled ?? false}
              onChange={async (e) => {
                const result = await settings.save({
                  ...state.data!,
                  voiceInputEnabled: e.target.checked,
                });
                if (result.ok) {
                  window.dispatchEvent(new Event('mam-an-settings'));
                  state.retry();
                } else setError(result.error);
              }}
            />{' '}
            Hiện nhập giọng nói khi trình duyệt hỗ trợ
          </label>
          <p role="status">{message}</p>
          <p>Giá trị và đơn vị của số đo cũ luôn được giữ nguyên.</p>
        </div>
      )}
      <div className="card">
        <h2>Dữ liệu nằm tại đây</h2>
        <p>
          Nhật ký lưu trong trình duyệt này. Xóa dữ liệu trình duyệt sẽ làm mất
          nhật ký; hiện chưa có đồng bộ hoặc sao lưu.
        </p>
        <Link to="/demo">Khám phá dữ liệu mẫu →</Link>
      </div>
      <Link to="/about">Thông tin & nguồn dữ liệu →</Link>
    </section>
  );
}
export function AboutPage() {
  const { liveEnabled } = useServices();
  return (
    <section className="narrow">
      <h1>Về Mâm An</h1>
      <div className="card">
        <p>
          Phân tích ảnh: {liveEnabled ? 'sẵn sàng' : 'chưa bật'}. Bạn luôn có
          thể nhập món thủ công hoặc thử bữa ăn mẫu ngay trên thiết bị.
        </p>
        <h2>Nguồn & khẩu phần</h2>
        <p>
          Ba món tham chiếu từ{' '}
          <a
            href="https://inmu.mahidol.ac.th/aseanfoods/doc/OnlineASEAN_FCD_V1_2014.pdf"
            target="_blank"
            rel="noreferrer"
          >
            ASEANFOODS 2014
          </a>
          : cơm trắng chín (AAA63), trứng luộc (AAH15), dưa chuột (AAD46). Xin
          ghi nhận ASEANFOODS / Institute of Nutrition, Mahidol University.
        </p>
        <p>
          Các phần 100 g / 50 g / 100 g là phần tham chiếu minh họa; không khẳng
          định một bát hoặc quả thực tế luôn có khối lượng đó. Phở chưa có định
          lượng đã xác minh nên giữ dinh dưỡng chưa biết.
        </p>
        <p>
          Prototype phi thương mại; quyền phân phối công khai/thương mại cần
          được xem xét trước khi mở rộng.
        </p>
      </div>
    </section>
  );
}
