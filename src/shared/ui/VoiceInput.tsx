import { useState, useEffect, useRef } from 'react';
import { useServices } from './ServicesContext';
export function VoiceInput({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: (transcript: string) => boolean | void;
}) {
  const { voice, settings } = useServices(),
    [transcript, setTranscript] = useState(''),
    [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false),
    controller = useRef<AbortController | null>(null),
    [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () => {
      void settings.get().then((r) => {
        if (active) setEnabled(r.ok && r.value.voiceInputEnabled === true);
      });
    };
    load();
    window.addEventListener('mam-an-settings', load);
    return () => {
      active = false;
      window.removeEventListener('mam-an-settings', load);
    };
  }, [settings]);
  useEffect(() => () => controller.current?.abort(), []);
  if (!enabled || !voice.isSupported()) return null;
  return (
    <details className="no-print">
      <summary>Nhập giọng nói: {label}</summary>
      <p>
        Trình duyệt có thể dùng dịch vụ nhận dạng trực tuyến. Bạn sẽ xem và xác
        nhận bản chép trước khi áp dụng.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          controller.current?.abort();
          const active = new AbortController();
          controller.current = active;
          setBusy(true);
          setStatus('Đang nghe…');
          try {
            const text = await voice.transcribe(active.signal);
            if (!active.signal.aborted) {
              setTranscript(text);
              setStatus('Kiểm tra nội dung trước khi áp dụng.');
            }
          } catch {
            if (!active.signal.aborted)
              setStatus(
                'Không nhận dạng được. Bạn vẫn có thể nhập bằng bàn phím.',
              );
          } finally {
            if (!active.signal.aborted) setBusy(false);
          }
        }}
      >
        Bắt đầu nói
      </button>
      {busy && (
        <button
          onClick={() => {
            controller.current?.abort();
            setBusy(false);
            setStatus('Đã dừng.');
          }}
        >
          Dừng
        </button>
      )}
      <p role="status">{status}</p>
      {transcript && (
        <>
          <label>
            Bản chép
            <input
              value={transcript}
              maxLength={2000}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </label>
          <button
            onClick={() => {
              if (onConfirm(transcript) !== false) {
                setTranscript('');
                setStatus('Đã áp dụng nội dung bạn xác nhận.');
              } else
                setStatus(
                  'Chưa hiểu khẩu phần. Chọn đơn vị có sẵn hoặc sửa bản chép.',
                );
            }}
          >
            Xác nhận áp dụng
          </button>
          <button onClick={() => setTranscript('')}>Bỏ bản chép</button>
        </>
      )}
    </details>
  );
}
