import { BrowserRouter, Link, NavLink } from 'react-router-dom';
import { AppRoutes } from './routes';
import { ServicesContext } from '../shared/ui/ServicesContext';
import type { AppServices } from '../application/services/appServices';
import { PwaUpdateNotice } from '../shared/ui/PwaUpdateNotice';
export function App({ services }: { services: AppServices }) {
  return (
    <ServicesContext.Provider value={services}>
      <BrowserRouter>
        <a className="skip-link" href="#main">
          Đến nội dung
        </a>
        <header className="site-header no-print">
          <Link className="brand" to="/">
            <img src="/icons/icon.svg" alt="" />
            Mâm An<span>CHẬM MỘT CHÚT, HIỂU NHIỀU HƠN</span>
          </Link>
          <nav aria-label="Điều hướng chính">
            <NavLink to="/" end>
              Trang chủ
            </NavLink>
            <NavLink to="/history">Nhật ký</NavLink>
            <NavLink to="/weekly">Tuần của tôi</NavLink>
            <NavLink to="/settings">Thiết lập</NavLink>
          </nav>
          <Link className="button header-add" to="/analyze">
            ＋ Ghi bữa
          </Link>
        </header>
        <main id="main">
          <PwaUpdateNotice />
          <AppRoutes />
        </main>
        <footer className="site-footer no-print">
          <span>Mâm An</span>
          <Link to="/demo">Dữ liệu mẫu</Link>
          <Link to="/about">Nguồn tham chiếu</Link>
          <span>Riêng tư trên thiết bị</span>
        </footer>
      </BrowserRouter>
    </ServicesContext.Provider>
  );
}
