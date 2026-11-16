import { useNavigate } from 'react-router-dom';

export type AppPageKey =
  | 'dashboard'
  | 'messages'
  | 'monitored-apps'
  | 'integrations'
  | 'alerts'
  | 'settings'
  | 'team';

interface SidebarProps {
  activePage: AppPageKey;
  onOpenDevices: () => void;
  onOpenSyncScheduler: () => void;
  onOpenProfile: () => void;
  onOpenTeams: () => void;
  onOpenHelpCentre: () => void;
}

export function Sidebar({
  activePage,
  onOpenDevices,
  onOpenSyncScheduler,
  onOpenProfile,
  onOpenTeams,
  onOpenHelpCentre,
}: SidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div
          className="brand-header"
          style={{ gap: '6px', justifyContent: 'flex-start', paddingLeft: '14px' }}
          onClick={() => window.location.reload()}
        >
          <div className="brand-logo-icon" style={{ width: '28px', height: '28px' }}>
            <img
              src="/system-logo.png"
              alt="Sentriqe Logo"
              style={{
                width: '28px',
                height: '28px',
                objectFit: 'contain',
              }}
            />
          </div>
          <span
            className="brand-name"
            style={{
              background: 'linear-gradient(90deg, #4ade80 0%, #38bdf8 50%, #f87171 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Sentriqe
          </span>
        </div>

        <ul className="nav-list">
          <li
            className={`nav-item${activePage === 'dashboard' ? ' active' : ''}`}
            onClick={() => navigate('/dashboard')}
          >
            <div className="nav-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span>Dashboard</span>
            </div>
          </li>

          <li
            className={`nav-item${activePage === 'messages' ? ' active' : ''}`}
            onClick={() => navigate('/reviews')}
          >
            <div className="nav-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.2 7.2C13.1 4.3 10.8 2.5 8 2.5 4.1 2.5 1 5.2 1 8.8c0 2.1 1.1 3.9 2.7 5.1L2.5 17.3l3.9-2.2c.7.2 1.5.3 2.3.3"></path>
                <path d="M8.5 13.7C8.5 9.9 11.7 7.2 15.8 7.2S23 9.9 23 13.7c0 2.1-1.1 3.9-2.8 5.1L21.4 22l-3.9-2.1c-.6.2-1.1.3-1.7.3-4.1 0-7.3-2.7-7.3-6.5z"></path>
                <line x1="12.8" y1="12.2" x2="18.8" y2="12.2"></line>
                <line x1="12.8" y1="15.4" x2="18.8" y2="15.4"></line>
              </svg>
              <span>Reviews</span>
            </div>
          </li>

          <li
            className={`nav-item${activePage === 'monitored-apps' ? ' active' : ''}`}
            onClick={() => navigate('/monitored-apps')}
          >
            <div className="nav-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
              </svg>
              <span>Monitored Apps</span>
            </div>
          </li>

          <li
            className={`nav-item${activePage === 'integrations' ? ' active' : ''}`}
            onClick={() => navigate('/integrations')}
          >
            <div className="nav-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              <span>Integrations</span>
            </div>
          </li>

          <li className="nav-item" style={{ cursor: 'default' }}>
            <div className="nav-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
              <span>Tools</span>
            </div>
          </li>
          <li className="nav-submenu" id="toolsSubmenu">
            <div
              className={`nav-subitem${activePage === 'alerts' ? ' active' : ''}`}
              onClick={() => navigate('/alerts')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span>Alerts</span>
            </div>
            <div className="nav-subitem" onClick={onOpenDevices}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
              <span>Devices</span>
            </div>
            <div className="nav-subitem" onClick={onOpenSyncScheduler}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Sync Scheduler</span>
            </div>
          </li>

          <li
            className={`nav-item nav-bottom-group-start${activePage === 'settings' ? ' active' : ''}`}
            onClick={() => navigate('/settings')}
          >
            <div className="nav-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Settings</span>
            </div>
          </li>

          <li className="nav-item" style={{ cursor: 'default' }}>
            <div className="nav-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Account</span>
            </div>
          </li>
          <li className="nav-submenu" id="accountSubmenu">
            <div className="nav-subitem" onClick={onOpenProfile}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Profile</span>
            </div>
            <div
              className={`nav-subitem${activePage === 'team' ? ' active' : ''}`}
              onClick={() => navigate('/team')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>Teams</span>
            </div>
          </li>

          <li className="nav-item" onClick={onOpenHelpCentre}>
            <div className="nav-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Help Centre</span>
            </div>
          </li>
        </ul>
      </div>
    </aside>
  );
}
