import { Route, Routes } from 'react-router-dom';
import { HomePage } from '../features/home/HomePage';
import { AnalyzePage } from '../features/meal-analysis/AnalyzePage';
import { ReviewPage } from '../features/meal-review/ReviewPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { MealDetailPage } from '../features/meal-detail/MealDetailPage';
import { GlucosePage } from '../features/glucose-entry/GlucosePage';
import { WeeklyPage } from '../features/weekly-summary/WeeklyPage';
import { DemoPage } from '../features/demo/DemoPage';
import { SettingsPage, AboutPage } from '../features/settings/SettingsPage';
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/analyze" element={<AnalyzePage />} />
      <Route path="/review" element={<ReviewPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/history/:mealId" element={<MealDetailPage />} />
      <Route path="/glucose/new" element={<GlucosePage />} />
      <Route path="/weekly" element={<WeeklyPage />} />
      <Route path="/report/weekly" element={<WeeklyPage report />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<p>Trang không tồn tại.</p>} />
    </Routes>
  );
}
