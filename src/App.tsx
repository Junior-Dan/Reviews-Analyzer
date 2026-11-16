import { useLayoutEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AlertsPage } from './pages/AlertsPage';
import { DashboardPage } from './pages/DashboardPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { LoginPage } from './pages/LoginPage';
import { MessagesPage } from './pages/MessagesPage';
import { MonitoredAppsPage } from './pages/MonitoredAppsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';
import { TeamPage } from './pages/TeamPage';
import { TermsPage } from './pages/TermsPage';

export function App() {
  useLayoutEffect(() => {
    document.documentElement.style.backgroundColor = '';
    document.documentElement.classList.add('app-ready');
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/reviews" element={<MessagesPage />} />
        <Route path="/messages" element={<Navigate to="/reviews" replace />} />
        <Route path="/monitored-apps" element={<MonitoredAppsPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/teams" element={<Navigate to="/team" replace />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Redirect legacy .html URLs to clean SPA routes */}
        <Route path="/dashboard.html" element={<Navigate to="/dashboard" replace />} />
        <Route path="/messages.html" element={<Navigate to="/reviews" replace />} />
        <Route path="/monitored-apps.html" element={<Navigate to="/monitored-apps" replace />} />
        <Route path="/integrations.html" element={<Navigate to="/integrations" replace />} />
        <Route path="/alerts.html" element={<Navigate to="/alerts" replace />} />
        <Route path="/settings.html" element={<Navigate to="/settings" replace />} />
        <Route path="/login.html" element={<Navigate to="/" replace />} />
        <Route path="/register.html" element={<Navigate to="/register" replace />} />
        <Route path="/privacy.html" element={<Navigate to="/privacy" replace />} />
        <Route path="/terms.html" element={<Navigate to="/terms" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
