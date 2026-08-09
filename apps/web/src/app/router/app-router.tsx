import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { LoginPage } from '@/features/auth/login-page';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { IntentSearchPage } from '@/features/intent/intent-search-page';
import { ReadinessPage } from '@/features/transactions/readiness-page';
import { WorkspacePage } from '@/features/transactions/workspace-page';
import { FinalReviewPage } from '@/features/review/final-review-page';
import { PaymentReviewPage } from '@/features/payment/payment-review-page';
import { MonitorPage } from '@/features/monitoring/monitor-page';
import { CopilotPage } from '@/features/copilot/copilot-page';
import { HistoryPage } from '@/features/history/history-page';
import { SettingsPage } from '@/features/settings/settings-page';
import { DemoPage } from '@/features/demo/demo-page';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/search" element={<IntentSearchPage />} />
          <Route path="/transactions/:id/readiness" element={<ReadinessPage />} />
          <Route path="/transactions/:id/review" element={<FinalReviewPage />} />
          <Route path="/transactions/:id/payment" element={<PaymentReviewPage />} />
          <Route path="/transactions/:id/monitor" element={<MonitorPage />} />
          <Route path="/copilot" element={<CopilotPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route element={<AppShell focused />}>
          <Route path="/transactions/:id/workspace" element={<WorkspacePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
