import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { useServices } from './ServicesContext';
import { publicConfig } from '../../app/config/publicConfig';

export function PwaUpdateNotice() {
  const { session } = useServices();
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const { pathname } = useLocation();
  const [available, setAvailable] = useState(false);
  const update = useRef<ReturnType<typeof registerSW> | null>(null);
  useEffect(() => {
    if (publicConfig.pwaEnabled && !update.current)
      update.current = registerSW({ immediate: true, onNeedRefresh: () => setAvailable(true) });
  }, []);
  const editing = state.preparing || (!!state.draft && state.draft.analysisState !== 'SAVED') || pathname.startsWith('/glucose');
  if (!available) return null;
  return <div className="notice no-print" role="status">
    <p>Có phiên bản mới.{editing ? ' Hãy lưu hoặc hủy phần đang nhập trước khi tải lại.' : ''}</p>
    <button disabled={editing} onClick={() => void update.current?.(true)}>Tải phiên bản mới</button>
  </div>;
}
