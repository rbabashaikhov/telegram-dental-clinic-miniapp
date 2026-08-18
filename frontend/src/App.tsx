import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DemoChrome } from './demo-tour/DemoChrome';
import { isSalesDemoAdminPath } from './demo-tour/eligibility';
import { useDemoTour } from './demo-tour/context';
import { AdminPage, DemoAdminPage } from './pages/AdminPage';
import { BookDonePage, BookPage } from './pages/BookPage';
import { ChartPage } from './pages/ChartPage';
import { FamilyPage } from './pages/FamilyPage';
import { FormsPage } from './pages/FormsPage';
import { HistoryDetailPage, HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { PlanPage } from './pages/PlanPage';
import { RecallsPage } from './pages/RecallsPage';

export default function App() {
  const location = useLocation();
  const isAdmin = isSalesDemoAdminPath(location.pathname);
  const tour = useDemoTour();

  return (
    <div className={isAdmin ? undefined : 'app-shell'}>
      {tour.showChrome && (
        <DemoChrome
          showTour={tour.demoTourEnabled}
          showAdmin={tour.demoAdminPreviewEnabled}
          onStartTour={tour.start}
        />
      )}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/chart" element={<ChartPage />} />
        <Route path="/book" element={<BookPage />} />
        <Route path="/book/done" element={<BookDonePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<HistoryDetailPage />} />
        <Route path="/family" element={<FamilyPage />} />
        <Route path="/recalls" element={<RecallsPage />} />
        <Route path="/forms" element={<FormsPage />} />
        <Route path="/demo/admin" element={<DemoAdminPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
