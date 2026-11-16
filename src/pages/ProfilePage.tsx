import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { SkeletonBox } from '../components/Skeleton';
import { TopBar } from '../components/TopBar';
import { usePageMeta } from '../hooks/usePageMeta';
import { authFetch, clearAuthSession, getStoredUser, getToken, setAuthSession } from '../utils/api';
import { initTheme, setCompanyLogo } from '../utils/theme';
import '../styles/monitored-apps.css';

type ProfileTab = 'personal' | 'account';
type BillingPlan = 'free' | 'pro' | 'enterprise';

const PLANS: Array<{ key: BillingPlan; label: string; price: string; desc: string }> = [
  { key: 'free', label: 'Free', price: '$0/mo', desc: 'Up to 2 apps & 1 team seat' },
  { key: 'pro', label: 'Pro', price: '$29/mo', desc: 'Unlimited apps, AI replies & 10 seats' },
  { key: 'enterprise', label: 'Enterprise', price: '$99/mo', desc: 'Custom limits, SSO & priority support' },
];

export function ProfilePage() {
  usePageMeta('monitored-apps', 'Profile | Reviews Analyzer');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const stored = getStoredUser();
  const initialRole = String(stored.workspaceRole || stored.role || 'owner').toLowerCase();

  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [name, setName] = useState(stored.name || '');
  const [email, setEmail] = useState(stored.email || '');
  const [workspaceRole, setWorkspaceRole] = useState(initialRole);
  const [role, setRole] = useState(initialRole === 'owner' ? 'admin' : initialRole);
  const [avatar, setAvatar] = useState<string | null>(stored.avatar || null);

  const [companyName, setCompanyName] = useState(String(stored.companyName || ''));
  const [companyLogoState, setCompanyLogoState] = useState<string | null>(stored.companyLogo || null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(String(stored.workspaceId || stored._id || ''));
  const [billingPlan, setBillingPlan] = useState<BillingPlan>(
    (['free', 'pro', 'enterprise'].includes(String(stored.billingPlan)) ? stored.billingPlan : 'free') as BillingPlan
  );
  const [billingEmail, setBillingEmail] = useState(String(stored.billingEmail || stored.email || ''));
  const [editingBillingEmail, setEditingBillingEmail] = useState(false);
  const [draftBillingEmail, setDraftBillingEmail] = useState(String(stored.billingEmail || stored.email || ''));

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingWorkspace, setDeletingWorkspace] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(stored.name || '');
  const [editingCompany, setEditingCompany] = useState(false);
  const [draftCompany, setDraftCompany] = useState(String(stored.companyName || ''));
  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(!stored.email);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const isAdmin = workspaceRole === 'owner' || workspaceRole === 'admin';
  const hasAccountChanges =
    draftCompany.trim() !== companyName.trim() ||
    draftBillingEmail.trim().toLowerCase() !== billingEmail.trim().toLowerCase();

  useEffect(() => {
    initTheme();
    if (!getToken()) {
      navigate('/');
      return;
    }

    let cancelled = false;
    async function loadProfile() {
      try {
        const res = await authFetch('/api/auth/me');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setName(data.name || '');
        setDraftName(data.name || '');
        setEmail(data.email || '');
        const rawWsRole = String(data.workspaceRole || 'owner').toLowerCase();
        setWorkspaceRole(rawWsRole);
        setRole(rawWsRole === 'owner' ? 'admin' : rawWsRole);
        setAvatar(data.avatar || null);
        setCompanyName(data.companyName || '');
        setDraftCompany(data.companyName || '');
        setCompanyLogoState(data.companyLogo || null);
        setWorkspaceId(data.workspaceId || data._id || '');
        const resolvedPlan = (['free', 'pro', 'enterprise'].includes(data.billingPlan) ? data.billingPlan : 'free') as BillingPlan;
        setBillingPlan(resolvedPlan);
        setBillingEmail(data.billingEmail || data.email || '');
        setDraftBillingEmail(data.billingEmail || data.email || '');
        setAuthSession({ ...stored, ...data });
      } catch {
        // Keep stored values on transient error
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleSaveName() {
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === name) {
      setDraftName(name);
      setEditingName(false);
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setName(data.name || trimmed);
        setDraftName(data.name || trimmed);
        setAuthSession({ ...getStoredUser(), ...data });
      }
    } finally {
      setSaving(false);
      setEditingName(false);
    }
  }

  async function handleSaveCompanyName() {
    const trimmed = draftCompany.trim();
    if (trimmed === companyName) {
      setEditingCompany(false);
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/auth/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setCompanyName(data.companyName || '');
        setDraftCompany(data.companyName || '');
        setAuthSession({ ...getStoredUser(), companyName: data.companyName || '' });
      }
    } finally {
      setSaving(false);
      setEditingCompany(false);
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (!dataUrl) return;
      const res = await authFetch('/api/auth/company-logo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyLogo: dataUrl }),
      });
      if (res.ok) {
        setCompanyLogoState(dataUrl);
        setCompanyLogo(dataUrl);
        setAuthSession({ ...getStoredUser(), companyLogo: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleRemoveLogo() {
    const res = await authFetch('/api/auth/company-logo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyLogo: null }),
    });
    if (res.ok) {
      setCompanyLogoState(null);
      setCompanyLogo(null);
      setAuthSession({ ...getStoredUser(), companyLogo: null });
    }
  }

  const [accountSavedMsg, setAccountSavedMsg] = useState('');

  async function handleSaveAccountAll(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setAccountSavedMsg('');
    try {
      const res = await authFetch('/api/auth/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: draftCompany.trim(),
          billingEmail: draftBillingEmail.trim().toLowerCase(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCompanyName(data.companyName || '');
        setDraftCompany(data.companyName || '');
        setBillingEmail(data.billingEmail || '');
        setDraftBillingEmail(data.billingEmail || '');
        setAuthSession({
          ...getStoredUser(),
          companyName: data.companyName || '',
          billingEmail: data.billingEmail || '',
        });
        setAccountSavedMsg('Saved');
        window.setTimeout(() => setAccountSavedMsg(''), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSelectPlan(plan: BillingPlan) {
    if (plan === billingPlan || saving) return;
    setSaving(true);
    try {
      const res = await authFetch('/api/auth/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingPlan: plan }),
      });
      if (res.ok) {
        const data = await res.json();
        setBillingPlan(data.billingPlan || plan);
        setAuthSession({ ...getStoredUser(), billingPlan: data.billingPlan || plan });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveBillingEmail() {
    const trimmed = draftBillingEmail.trim().toLowerCase();
    if (!trimmed || trimmed === billingEmail) {
      setDraftBillingEmail(billingEmail);
      setEditingBillingEmail(false);
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/auth/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingEmail: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setBillingEmail(data.billingEmail || trimmed);
        setDraftBillingEmail(data.billingEmail || trimmed);
        setAuthSession({ ...getStoredUser(), billingEmail: data.billingEmail || trimmed });
      }
    } finally {
      setSaving(false);
      setEditingBillingEmail(false);
    }
  }

  async function handleDeleteWorkspace() {
    if (deleteConfirmText.trim() !== 'DELETE' || deletingWorkspace) return;
    setDeletingWorkspace(true);
    setDeleteError('');
    try {
      const res = await authFetch('/api/auth/workspace', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmText: 'DELETE' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.message || 'Could not delete workspace.');
        setDeletingWorkspace(false);
        return;
      }
      clearAuthSession();
      navigate('/');
    } catch {
      setDeleteError('Failed to connect to server.');
      setDeletingWorkspace(false);
    }
  }

  function handleLogout() {
    clearAuthSession();
    navigate('/');
  }

  const displayName = name || email.split('@')[0] || 'User';
  const displayCompany = companyName || `${displayName}'s Workspace`;

  return (
    <>
      <Sidebar
        activePage="profile"
        onOpenDevices={() => navigate('/devices')}
        onOpenSyncScheduler={() => navigate('/settings')}
        onOpenProfile={() => navigate('/profile')}
        onOpenTeams={() => navigate('/team')}
        onOpenHelpCentre={() => navigate('/settings')}
      />

      <main className="main-wrapper">
        <div className="canvas-container">
          <TopBar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchInputId="profileSearch"
            onAddApp={() => navigate('/monitored-apps')}
            onAlerts={() => navigate('/alerts')}
            onProfile={() => navigate('/profile')}
          />

          <div className="page-scroll-body">
            {isAdmin && (
              <div className="store-tabs" style={{ alignSelf: 'flex-start' }}>
                <button
                  type="button"
                  className={`store-tab${activeTab === 'personal' ? ' active' : ''}`}
                  onClick={() => setActiveTab('personal')}
                >
                  Personal
                </button>
                <button
                  type="button"
                  className={`store-tab${activeTab === 'account' ? ' active' : ''}`}
                  onClick={() => setActiveTab('account')}
                >
                  Account
                </button>
              </div>
            )}

            {activeTab === 'personal' || !isAdmin ? (
              <div
                className="apps-table-card"
                style={{
                  flex: '0 0 auto',
                  padding: '28px 28px 30px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 28,
                }}
              >
                {/* TOP ROW: AVATAR + NAME & LOGOUT */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1.5px solid var(--border-soft, #e2e8f0)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: '50%',
                          border: '2.2px solid var(--text-dark, #0f172a)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-dark, #0f172a)',
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                    )}

                    <span
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        color: 'var(--text-dark)',
                      }}
                    >
                      {profileLoading && !email ? <SkeletonBox width={130} height={18} /> : displayName}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      minWidth: 196,
                      padding: '11px 24px',
                      borderRadius: 12,
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      background: 'transparent',
                      color: '#ef4444',
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    Logout
                  </button>
                </div>

                {/* CENTERED EMAIL */}
                <div style={{ textAlign: 'center', padding: '4px 0' }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      marginBottom: 6,
                    }}
                  >
                    Email
                  </div>
                  <div
                    style={{
                      fontSize: 14.5,
                      fontWeight: 700,
                      color: 'var(--text-dark)',
                    }}
                  >
                    {profileLoading && !email ? (
                      <SkeletonBox width={190} height={16} style={{ margin: '0 auto' }} />
                    ) : (
                      email || '—'
                    )}
                  </div>
                </div>

                {/* BOTTOM TWO-COLUMN FIELDS */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 20,
                  }}
                >
                  {/* LEFT FIELD: USERNAME + EDIT */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: 'var(--card-inner, #f8fafc)',
                      border: '1px solid var(--border-soft, transparent)',
                    }}
                  >
                    {editingName ? (
                      <input
                        type="text"
                        value={draftName}
                        autoFocus
                        disabled={saving}
                        onChange={(e) => setDraftName(e.target.value)}
                        onBlur={handleSaveName}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                          if (e.key === 'Escape') {
                            setDraftName(name);
                            setEditingName(false);
                          }
                        }}
                        style={{
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          background: 'transparent',
                          fontSize: 13.5,
                          fontWeight: 500,
                          color: 'var(--text-dark)',
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: 500,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {profileLoading && !email ? <SkeletonBox width={120} height={15} /> : displayName}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (editingName) {
                          handleSaveName();
                        } else {
                          setDraftName(name || displayName);
                          setEditingName(true);
                        }
                      }}
                      title="Edit name"
                      aria-label="Edit name"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        padding: 2,
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>

                  {/* RIGHT FIELD: ROLE */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: 'var(--card-inner, #f8fafc)',
                      border: '1px solid var(--border-soft, transparent)',
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: 'var(--text-muted)',
                      textTransform: 'lowercase',
                    }}
                  >
                    {role}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="apps-table-card"
                style={{
                  flex: '0 0 auto',
                  padding: '26px 30px 30px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <form onSubmit={handleSaveAccountAll}>
                  {/* SECTION 1: ACCOUNT DETAILS */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: 16,
                      borderBottom: '1px solid var(--border-soft, #e2e8f0)',
                    }}
                  >
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-dark)' }}>
                      Account details
                    </h2>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                      {accountSavedMsg && (
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#16a34a' }}>
                          {accountSavedMsg}
                        </span>
                      )}
                      <button
                        type="submit"
                        disabled={!hasAccountChanges || saving}
                        className={hasAccountChanges ? 'btn-add-app-primary' : undefined}
                        style={{
                          borderRadius: 8,
                          padding: '8px 16px',
                          fontSize: 13,
                          fontWeight: 600,
                          border: hasAccountChanges ? 'none' : '1px solid var(--border-soft, #cbd5e1)',
                          background: hasAccountChanges ? 'var(--primary-green)' : 'var(--card-inner, #f1f5f9)',
                          color: hasAccountChanges ? '#ffffff' : 'var(--text-muted)',
                          cursor: hasAccountChanges && !saving ? 'pointer' : 'default',
                          opacity: hasAccountChanges ? 1 : 0.7,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {saving ? 'Saving...' : 'Save changes'}
                      </button>
                    </div>
                  </div>

                  {/* ROW: COMPANY LOGO */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 24,
                      padding: '18px 0',
                      borderBottom: '1px solid var(--border-soft, #e2e8f0)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-dark)' }}>
                        Company logo
                      </div>
                      <div style={{ position: 'relative', display: 'inline-flex' }}>
                        <div
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 14,
                            border: '1px solid var(--border-soft, #e2e8f0)',
                            background: 'var(--card-inner, #f8fafc)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          {companyLogoState ? (
                            <img
                              src={companyLogoState}
                              alt={displayCompany}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          ) : logoRemoved ? (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>NONE</span>
                          ) : (
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ color: 'var(--text-dark)' }}>
                              <line x1="12" y1="2" x2="12" y2="6"></line>
                              <line x1="12" y1="18" x2="12" y2="22"></line>
                              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                              <line x1="2" y1="12" x2="6" y2="12"></line>
                              <line x1="18" y1="12" x2="22" y2="12"></line>
                              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                            </svg>
                          )}
                        </div>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            setLogoRemoved(false);
                            handleLogoUpload(e);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          title="Upload new logo"
                          aria-label="Upload new logo"
                          style={{
                            position: 'absolute',
                            bottom: -6,
                            right: -6,
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'var(--primary-green)',
                            color: '#ffffff',
                            border: '2px solid var(--card-bg, #ffffff)',
                            boxShadow: '0 2px 5px rgba(15, 23, 42, 0.16)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                          setLogoRemoved(true);
                          void handleRemoveLogo();
                        }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 10,
                          border: 'none',
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: '#ef4444',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                  </div>

                  {/* ROW: COMPANY NAME */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(200px, 1fr) minmax(240px, 380px)',
                      alignItems: 'center',
                      gap: 24,
                      padding: '18px 0',
                      borderBottom: '1px solid var(--border-soft, #e2e8f0)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-dark)' }}>
                        Company name
                      </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          top: -8,
                          left: 10,
                          padding: '0 5px',
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          background: 'var(--card-bg, #ffffff)',
                        }}
                      >
                        Required
                      </span>
                      <input
                        type="text"
                        value={draftCompany}
                        onChange={(e) => setDraftCompany(e.target.value)}
                        placeholder={displayCompany}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: 8,
                          border: '1px solid var(--border-soft, #cbd5e1)',
                          background: 'transparent',
                          color: 'var(--text-dark)',
                          fontSize: 13.5,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {/* ROW: WORKSPACE ID */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(200px, 1fr) minmax(240px, 380px)',
                      alignItems: 'center',
                      gap: 24,
                      padding: '18px 0',
                      borderBottom: '1px solid var(--border-soft, #e2e8f0)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-dark)' }}>
                        Workspace ID
                      </div>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border-soft, #e2e8f0)',
                        background: 'var(--card-inner, #f8fafc)',
                        color: 'var(--text-muted)',
                        fontSize: 13,
                        fontFamily: 'monospace',
                        boxSizing: 'border-box',
                        userSelect: 'all',
                        cursor: 'default',
                        opacity: 0.85,
                      }}
                    >
                      {workspaceId || '—'}
                    </div>
                  </div>

                  {/* SECTION 2: BILLING */}
                  <div style={{ paddingTop: 26, paddingBottom: 14, borderBottom: '1px solid var(--border-soft, #e2e8f0)' }}>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-dark)' }}>
                      Billing
                    </h2>
                  </div>

                  {/* ROW: BILLING EMAIL */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(200px, 1fr) minmax(240px, 380px)',
                      alignItems: 'center',
                      gap: 24,
                      padding: '18px 0',
                      borderBottom: '1px solid var(--border-soft, #e2e8f0)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-dark)' }}>
                        Billing email
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                        Email for receiving invoices and billing updates.
                      </div>
                    </div>
                    <input
                      type="email"
                      value={draftBillingEmail}
                      onChange={(e) => setDraftBillingEmail(e.target.value)}
                      placeholder={email || 'billing@company.com'}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border-soft, #cbd5e1)',
                        background: 'transparent',
                        color: 'var(--text-dark)',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* ROW: SUBSCRIPTION PLAN */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(200px, 1fr) minmax(240px, 380px)',
                      alignItems: 'center',
                      gap: 24,
                      padding: '18px 0',
                      borderBottom: '1px solid var(--border-soft, #e2e8f0)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-dark)' }}>
                        Subscription plan
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                        Active tier for this organization.
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {PLANS.map((plan) => {
                        const selected = billingPlan === plan.key;
                        return (
                          <button
                            key={plan.key}
                            type="button"
                            disabled={saving}
                            onClick={() => handleSelectPlan(plan.key)}
                            style={{
                              padding: '10px 8px',
                              borderRadius: 8,
                              border: selected
                                ? '2px solid var(--brand-color, var(--primary-green))'
                                : '1px solid var(--border-soft, #cbd5e1)',
                              background: selected ? 'rgba(23, 83, 59, 0.08)' : 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 2,
                            }}
                          >
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-dark)' }}>
                              {plan.label}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                              {plan.price}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </form>

                {/* SECTION 3: DELETE WORKSPACE (OWNER ONLY) */}
                {workspaceRole === 'owner' && (
                  <div style={{ marginTop: 26, paddingTop: 22, borderTop: '1px solid var(--border-soft, #e2e8f0)' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(200px, 1fr) minmax(240px, 380px)',
                        alignItems: 'center',
                        gap: 24,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#ef4444' }}>
                          Delete workspace
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {!confirmDeleteOpen && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteOpen(true)}
                            style={{
                              padding: '10px 18px',
                              borderRadius: 8,
                              border: '1px solid rgba(239, 68, 68, 0.45)',
                              background: 'transparent',
                              color: '#ef4444',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Delete workspace
                          </button>
                        )}
                      </div>
                    </div>

                    {confirmDeleteOpen && (
                      <div
                        style={{
                          marginTop: 16,
                          padding: '16px 18px',
                          borderRadius: 10,
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          background: 'rgba(239, 68, 68, 0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                      >
                        <div style={{ fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.5 }}>
                          This action cannot be undone. Type <strong>DELETE</strong> below to permanently remove this workspace.
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder='Type "DELETE" to confirm'
                            style={{
                              flex: '1 1 200px',
                              padding: '9px 12px',
                              borderRadius: 8,
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              background: 'transparent',
                              color: 'var(--text-dark)',
                              fontSize: 13,
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteOpen(false);
                              setDeleteConfirmText('');
                              setDeleteError('');
                            }}
                            style={{
                              padding: '9px 16px',
                              borderRadius: 8,
                              border: '1px solid var(--border-soft, #cbd5e1)',
                              background: 'transparent',
                              color: 'var(--text-muted)',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={deleteConfirmText.trim() !== 'DELETE' || deletingWorkspace}
                            onClick={handleDeleteWorkspace}
                            style={{
                              padding: '9px 18px',
                              borderRadius: 8,
                              border: 'none',
                              background: '#ef4444',
                              color: '#ffffff',
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: deleteConfirmText.trim() === 'DELETE' && !deletingWorkspace ? 'pointer' : 'not-allowed',
                              opacity: deleteConfirmText.trim() === 'DELETE' && !deletingWorkspace ? 1 : 0.5,
                            }}
                          >
                            {deletingWorkspace ? 'Deleting...' : 'Confirm Delete'}
                          </button>
                        </div>
                        {deleteError && (
                          <div style={{ fontSize: 12.5, color: '#ef4444', fontWeight: 600 }}>
                            {deleteError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default ProfilePage;
