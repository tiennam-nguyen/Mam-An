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
    <section className="narrow settings-page">
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
          <p className="settings-help">
            Tăng cỡ chữ để đọc và thao tác dễ hơn.
          </p>
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
            Nhập bằng giọng nói
          </label>
          <p className="settings-help">
            Nếu thiết bị hỗ trợ, nút nói sẽ xuất hiện khi chỉnh món. Chỉ nghe
            khi bạn bấm bắt đầu; bạn xem và xác nhận lời ghi lại trước khi dùng.
          </p>
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
          Danh mục bổ sung 26 thực phẩm cơ bản từ{' '}
          <a
            href="https://fdc.nal.usda.gov/download-datasets/"
            target="_blank"
            rel="noreferrer"
          >
            USDA FoodData Central, SR Legacy 2018
          </a>{' '}
          (dữ liệu công cộng). Carb khả dụng được tính bằng carb tổng trừ chất
          xơ; năng lượng giữ theo nguồn. Không coi thực phẩm cơ bản là tương
          đương một công thức món Việt.
        </p>
        <p>
          Khối lượng cốc/quả theo nguồn chỉ là ước tính cho lượng thực tế của
          bạn. Có thể nhập g/ml khi đã biết lượng; ml chỉ có khi có dữ liệu khối
          lượng riêng. Bát hoặc tô chưa có quy đổi vẫn giữ dinh dưỡng chưa biết.
          Giá trị bữa đã lưu không đổi khi danh mục được cập nhật.
        </p>
        <p>
          Prototype phi thương mại; quyền phân phối công khai/thương mại cần
          được xem xét trước khi mở rộng.
        </p>
      </div>
    </section>
  );
}
