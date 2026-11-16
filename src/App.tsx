import { useEffect, useLayoutEffect, useRef } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AlertsPage } from './pages/AlertsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { LoginPage } from './pages/LoginPage';
import { MessagesPage } from './pages/MessagesPage';
import { MonitoredAppsPage } from './pages/MonitoredAppsPage';
import { PairDevicePage } from './pages/PairDevicePage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';
import { TeamPage } from './pages/TeamPage';
import { TermsPage } from './pages/TermsPage';

function SilentAutoUpdater() {
  const location = useLocation();
  const initialVersionRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkVersion(isInitial = false) {
      try {
        const res = await fetch('/api/app-version', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { version?: string };
        const ver = data.version;
        if (!ver || ver === 'dev') return;
        if (!initialVersionRef.current) {
          initialVersionRef.current = ver;
          return;
        }
        if (!isInitial && ver !== initialVersionRef.current) {
          window.location.reload();
        }
      } catch {
        // ignore network errors
      }
    }

    checkVersion(initialVersionRef.current === null);
    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        void checkVersion(false);
      }
    };
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void checkVersion(false);
      }
    }, 30000);

    document.addEventListener('visibilitychange', onFocusOrVisible);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, [location.pathname]);

  return null;
}

export function App() {
  useLayoutEffect(() => {
    document.documentElement.style.backgroundColor = '';
    document.documentElement.classList.add('app-ready');
  }, []);

  return (
    <BrowserRouter>
      <SilentAutoUpdater />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/reviews" element={<MessagesPage />} />
        <Route path="/messages" element={<Navigate to="/reviews" replace />} />
        <Route path="/monitored-apps" element={<MonitoredAppsPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/pair-device" element={<PairDevicePage />} />
        <Route path="/profile" element={<ProfilePage />} />
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
