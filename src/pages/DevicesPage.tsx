import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { usePageMeta } from '../hooks/usePageMeta';
import { getToken } from '../utils/api';
import { initTheme } from '../utils/theme';
import '../styles/monitored-apps.css';

export function DevicesPage() {
  usePageMeta('monitored-apps', 'Devices | Reviews Analyzer');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    initTheme();
    if (!getToken()) {
      navigate('/');
    }
  }, [navigate]);

  return (
    <>
      <Sidebar
        activePage="devices"
        onOpenDevices={() => navigate('/devices')}
        onOpenSyncScheduler={() => navigate('/settings')}
        onOpenProfile={() => navigate('/settings')}
        onOpenTeams={() => navigate('/team')}
        onOpenHelpCentre={() => navigate('/settings')}
      />

      <main className="main-wrapper">
        <div className="canvas-container">
          <TopBar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchInputId="devicesSearch"
            onAddApp={() => navigate('/monitored-apps')}
            onAlerts={() => navigate('/alerts')}
            onProfile={() => navigate('/settings')}
          />

          <div className="page-scroll-body">
            <div className="apps-table-card" style={{ minHeight: 520 }} />
          </div>
        </div>
      </main>
    </>
  );
}

export default DevicesPage;
