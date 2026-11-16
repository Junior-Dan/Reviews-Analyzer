import type { KeyboardEvent } from 'react';

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authFetch, clearAuthSession, getActiveWorkspaceId, getStoredUser, setActiveWorkspaceId, setAuthSession } from '../utils/api';
import { getCompanyLogo, setCompanyLogo } from '../utils/theme';

function getInitials(name?: string, email?: string): string {
  const cleaned = (name || '').trim();
  if (cleaned) {
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  const emailName = (email || '').split('@')[0]?.trim();
  if (emailName) {
    return emailName.slice(0, 2).toUpperCase();
  }
  return 'U';
}

interface TopBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  searchInputId?: string;
  onAddApp: () => void;
  onAlerts: () => void;
  onProfile: () => void;
  showAlertDot?: boolean;
}

export function TopBar({
  searchValue,
  onSearchChange,
  onSearchKeyDown,
  searchInputId = 'globalSearchInput',
  onAddApp,
  onAlerts,
  onProfile,
  showAlertDot = true,
}: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAlertsActive = location.pathname === '/alerts';
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const menuWrapRef = useRef<HTMLDivElement | null>(null);
  const [imgError, setImgError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string; companyLogo: string | null; role: string }>>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>(() => getActiveWorkspaceId() || '');
  const [companyLogo, setCompanyLogoState] = useState<string | null>(() => getCompanyLogo());

  const storedUser = getStoredUser();
  const displayName = (storedUser.name || storedUser.email || 'User').toString();
  const email = (storedUser.email || '').toString();
  const role = (storedUser.role || 'Member').toString();
  const companyName =
    typeof storedUser.companyName === 'string' && storedUser.companyName.trim()
      ? storedUser.companyName.trim()
      : 'Workspace';
  const googleAvatar = typeof storedUser.avatar === 'string' && storedUser.avatar.trim() ? storedUser.avatar.trim() : '';
  const avatarUrl = companyLogo || googleAvatar;
  const initials = getInitials(storedUser.name, storedUser.email);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  useEffect(() => {
    const syncLogo = () => setCompanyLogoState(getCompanyLogo());
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('companyLogoChange', syncLogo);
    window.addEventListener('storage', syncLogo);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('companyLogoChange', syncLogo);
      window.removeEventListener('storage', syncLogo);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="top-bar">
      <div className="search-pill">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748b"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          ref={searchInputRef}
          type="text"
          id={searchInputId}
          placeholder="Search"
          aria-label="Search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={onSearchKeyDown}
          style={{ flex: 1, minWidth: 0 }}
        />
        <kbd
          className="search-kbd"
          style={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            padding: '2px 7px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'inherit',
            lineHeight: 1.4,
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            border: '1px solid #e2e8f0',
            userSelect: 'none',
          }}
        >
          ⌘ K
        </kbd>
      </div>

      <div className="top-actions" style={{ marginRight: '14px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
          <button
            type="button"
            className="icon-btn"
            onClick={() => navigate(-1)}
            title="Go Back"
            aria-label="Go Back"
            style={{ width: 32, height: 32, border: 'none', background: 'transparent', boxShadow: 'none', padding: 0 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => navigate(1)}
            title="Go Forward"
            aria-label="Go Forward"
            style={{ width: 32, height: 32, border: 'none', background: 'transparent', boxShadow: 'none', padding: 0 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <button className="btn-action-outline" onClick={onAddApp} style={{ borderRadius: '10px' }}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Add App</span>
        </button>

        <button className="icon-btn" onClick={onAlerts} title="Alerts & Notifications">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={isAlertsActive ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={isAlertsActive ? '1.8' : '2'}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none"></path>
          </svg>
          {showAlertDot && <div className="alert-badge-dot" id="alertDot"></div>}
        </button>

        <button className="icon-btn" onClick={() => navigate('/team')} title="Team">
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="2.6"></circle>
            <path d="M7.8 20v-1.2a4.2 4.2 0 0 1 8.4 0V20"></path>
            <circle cx="6.5" cy="7.5" r="2.2"></circle>
            <path d="M2.5 14.5v-.7a3.5 3.5 0 0 1 5.2-3"></path>
            <circle cx="17.5" cy="7.5" r="2.2"></circle>
            <path d="M21.5 14.5v-.7a3.5 3.5 0 0 0-5.2-3"></path>
          </svg>
        </button>

        <div className="avatar-menu-wrap" ref={menuWrapRef}>
          <div
            className="avatar-circle"
            title={`User Profile: ${displayName}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            style={{ overflow: 'hidden' }}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              initials
            )}
          </div>

          {menuOpen && (
            <div className="avatar-dropdown-card" role="menu">
              <div className="avatar-dropdown-header">
                <button
                  type="button"
                  onClick={async () => {
                    const next = !orgMenuOpen;
                    setOrgMenuOpen(next);
                    if (next && orgs.length === 0) {
                      try {
                        const res = await authFetch('/api/auth/workspaces');
                        if (res.ok) {
                          const data = await res.json();
                          setOrgs(data.workspaces || []);
                          if (data.activeWorkspaceId) setActiveOrgId(data.activeWorkspaceId);
                        }
                      } catch {
                        // ignore
                      }
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '4px 6px',
                    borderRadius: 10,
                    border: 'none',
                    background: orgMenuOpen ? 'var(--card-inner, #f1f5f9)' : 'transparent',
                    cursor: 'pointer',
                  }}
                  title="Switch organization"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div className="avatar-dropdown-mini">
                      {avatarUrl && !imgError ? (
                        <img
                          src={avatarUrl}
                          alt={companyName}
                          referrerPolicy="no-referrer"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: 'var(--text-dark, #18181b)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 120,
                        textAlign: 'left',
                      }}
                      title={companyName}
                    >
                      {companyName}
                    </div>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      flexShrink: 0,
                      marginLeft: -2,
                      color: 'var(--text-muted, #64748b)',
                      transform: orgMenuOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {orgMenuOpen && (
                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      padding: '6px',
                      borderRadius: 10,
                      background: 'var(--card-inner, #f8fafc)',
                      border: '1px solid var(--border-soft, #e2e8f0)',
                    }}
                  >
                    {(orgs.length > 0
                      ? orgs
                      : [{ id: String(storedUser.workspaceId || storedUser._id || ''), name: companyName, companyLogo, role }]
                    ).map((org) => {
                      const isCurrent = org.id === (activeOrgId || String(storedUser.workspaceId || storedUser._id || ''));
                      return (
                        <button
                          key={org.id}
                          type="button"
                          onClick={() => {
                            setActiveWorkspaceId(org.id);
                            setActiveOrgId(org.id);
                            setAuthSession({
                              ...storedUser,
                              companyName: org.name,
                              companyLogo: org.companyLogo,
                              workspaceRole: org.role,
                              workspaceId: org.id,
                            });
                            setCompanyLogo(org.companyLogo);
                            setOrgMenuOpen(false);
                            setMenuOpen(false);
                            window.location.reload();
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '6px 8px',
                            borderRadius: 8,
                            border: 'none',
                            background: isCurrent ? 'rgba(23, 83, 59, 0.12)' : 'transparent',
                            color: isCurrent ? 'var(--primary-green)' : 'var(--text-dark, #18181b)',
                            fontSize: 12.5,
                            fontWeight: isCurrent ? 700 : 500,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {org.name}
                          </span>
                          {isCurrent && (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="avatar-dropdown-divider" style={{ width: '100%' }} />

                <div className="avatar-dropdown-identity">
                  <div className="avatar-dropdown-name">{displayName}</div>
                  {email && <div className="avatar-dropdown-email">{email}</div>}
                  <span className="avatar-dropdown-role">{role}</span>
                </div>
              </div>

              <div className="avatar-dropdown-divider" />

              <button
                type="button"
                className="avatar-dropdown-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/profile');
                }}
              >
                <span className="avatar-dropdown-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </span>
                <span className="avatar-dropdown-label">Profile</span>
              </button>

              <button
                type="button"
                className="avatar-dropdown-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/settings');
                }}
              >
                <span className="avatar-dropdown-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </span>
                <span className="avatar-dropdown-label">Settings</span>
              </button>

              <div className="avatar-dropdown-divider" />

              <button
                type="button"
                className="avatar-dropdown-item danger"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  clearAuthSession();
                  navigate('/login');
                }}
              >
                <span className="avatar-dropdown-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </span>
                <span className="avatar-dropdown-label">Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
