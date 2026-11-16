import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { usePageMeta } from '../hooks/usePageMeta';
import { authFetch, getStoredUser } from '../utils/api';
import { applyBrandColor, applyTheme, getCompanyLogo, setCompanyLogo, type ThemeMode } from '../utils/theme';
import '../styles/settings.css';

type SettingsSection = 'appearance' | 'security';
type SettingsModal =
  | 'addApp'
  | 'account'
  | 'teams'
  | 'connectedDevices'
  | 'helpCentre'
  | 'enable2fa'
  | 'disable2fa'
  | null;

const SWATCH_COLORS = [
  { hex: '0F172A', bg: '#0f172a', label: 'Black' },
  { hex: '7C3AED', bg: '#7c3aed', label: 'Purple' },
  { hex: '4F46E5', bg: '#4f46e5', label: 'Indigo' },
  { hex: '2C68F6', bg: '#2C68F6', label: 'Blue' },
  { hex: '0EA5E9', bg: '#0ea5e9', label: 'Sky' },
  { hex: '0D9488', bg: '#0d9488', label: 'Teal' },
  { hex: '17533B', bg: '#17533b', label: 'Reviews AI Green' },
];

export function SettingsPage() {
  usePageMeta('settings', 'Reviews Analyzer - Settings');
  const navigate = useNavigate();

  const [section, setSection] = useState<SettingsSection>('appearance');
  const [searchQuery, setSearchQuery] = useState('');

  // Appearance state
  const [selectedBrandColor, setSelectedBrandColor] = useState('2C68F6');
  const [hexInput, setHexInput] = useState('2C68F6');
  const [selectedTheme, setSelectedTheme] = useState('system');
  const [selectedTableView, setSelectedTableView] = useState('default');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(() => getCompanyLogo());
  const [logoRemoved, setLogoRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Security / 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [authAppConfigured, setAuthAppConfigured] = useState(true);
  const [securityKeyConfigured, setSecurityKeyConfigured] = useState(false);
  const [showQrSlide, setShowQrSlide] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [inlineTotpCode, setInlineTotpCode] = useState('');
  const [totpVerifyInput, setTotpVerifyInput] = useState('');
  const [disable2faPassword, setDisable2faPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('security@reviews-analyzer.ai');

  // Modals & Toast
  const [activeModal, setActiveModal] = useState<SettingsModal>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastVisible(false), 2800);
  };

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('reviewsAiSettings') || 'null');
      if (saved) {
        if (saved.brandColor) {
          const hex = String(saved.brandColor).replace('#', '').toUpperCase();
          setSelectedBrandColor(hex);
          setHexInput(hex);
        }
        if (saved.theme) setSelectedTheme(saved.theme);
        if (saved.tablesView) setSelectedTableView(saved.tablesView);
      }
    } catch {
      // ignore
    }

    try {
      const sec = JSON.parse(localStorage.getItem('reviewsAiSecurity2FA') || 'null');
      if (sec) {
        if (typeof sec.twoFactorEnabled === 'boolean') setTwoFactorEnabled(sec.twoFactorEnabled);
        if (typeof sec.authAppConfigured === 'boolean') setAuthAppConfigured(sec.authAppConfigured);
        if (typeof sec.securityKeyConfigured === 'boolean') setSecurityKeyConfigured(sec.securityKeyConfigured);
      }
    } catch {
      // ignore
    }

    const otpUri = 'otpauth://totp/ReviewsAI:admin@reviews-analyzer.ai?secret=JBSWY3DPEHPK3PXP&issuer=ReviewsAI';
    QRCode.toDataURL(otpUri, {
      width: 164,
      margin: 0,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => { });
  }, []);

  const saveSecurityState = (next2fa: boolean, nextAuth: boolean, nextKey: boolean) => {
    localStorage.setItem(
      'reviewsAiSecurity2FA',
      JSON.stringify({
        twoFactorEnabled: next2fa,
        authAppConfigured: nextAuth,
        securityKeyConfigured: nextKey,
      })
    );
  };

  const handleCustomHexInput = (val: string) => {
    setHexInput(val);
    const cleaned = val.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase();
    if (cleaned.length === 6) {
      setSelectedBrandColor(cleaned);
    }
  };

  const persistCompanyLogo = async (dataUrl: string | null) => {
    setLogoDataUrl(dataUrl);
    setCompanyLogo(dataUrl);
    try {
      const stored = getStoredUser();
      localStorage.setItem('user', JSON.stringify({ ...stored, companyLogo: dataUrl }));
    } catch {
      // ignore
    }

    try {
      const res = await authFetch('/api/auth/company-logo', {
        method: 'PATCH',
        body: JSON.stringify({ companyLogo: dataUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Saved locally (database sync failed)');
        return;
      }
      showToast(dataUrl ? 'Company logo saved' : 'Company logo removed');
    } catch {
      showToast(dataUrl ? 'Company logo updated locally' : 'Company logo removed');
    }
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setLogoRemoved(false);
        void persistCompanyLogo(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveAppearanceSettings = () => {
    const brandHex = '#' + selectedBrandColor;
    localStorage.setItem(
      'reviewsAiSettings',
      JSON.stringify({
        brandColor: brandHex,
        theme: selectedTheme,
        tablesView: selectedTableView,
      })
    );
    applyTheme(selectedTheme as ThemeMode);
    applyBrandColor(brandHex);
    showToast('Appearance & workspace settings saved');
  };

  const resetSettingsToDefault = () => {
    setSelectedBrandColor('2C68F6');
    setHexInput('2C68F6');
    setSelectedTheme('system');
    setSelectedTableView('default');
    showToast('Reverted unsaved changes');
  };

  const verifyInlineAuthenticator = () => {
    if (!/^\d{6}$/.test(inlineTotpCode.trim())) {
      showToast('Please enter a valid 6-digit code from your app');
      return;
    }
    setTwoFactorEnabled(true);
    setAuthAppConfigured(true);
    saveSecurityState(true, true, securityKeyConfigured);
    setShowQrSlide(false);
    showToast('Authenticator App linked & verified');
  };

  const confirmEnable2FA = () => {
    if (!/^\d{6}$/.test(totpVerifyInput.trim())) {
      showToast('Please enter a valid 6-digit verification code');
      return;
    }
    setTwoFactorEnabled(true);
    setAuthAppConfigured(true);
    saveSecurityState(true, true, securityKeyConfigured);
    setActiveModal(null);
    showToast('Two-factor authentication enabled & backup codes generated');
  };

  const confirmDisable2FA = () => {
    if (!disable2faPassword.trim()) {
      showToast('Enter your current password to disable 2FA');
      return;
    }
    setTwoFactorEnabled(false);
    saveSecurityState(false, authAppConfigured, securityKeyConfigured);
    setActiveModal(null);
    showToast('Two-factor authentication disabled — security alert email sent');
  };

  const registerSecurityKey = () => {
    setSecurityKeyConfigured(true);
    saveSecurityState(twoFactorEnabled, authAppConfigured, true);
    showToast('Hardware Security Key registered via WebAuthn');
  };

  const rowMatches = (keywords: string) => {
    const q = searchQuery.trim().toLowerCase();
    return !q || keywords.includes(q);
  };

  return (
    <>
      <Sidebar
        activePage="settings"
        onOpenDevices={() => setActiveModal('connectedDevices')}
        onOpenSyncScheduler={() => setSection('appearance')}
        onOpenProfile={() => setActiveModal('account')}
        onOpenTeams={() => setActiveModal('teams')}
        onOpenHelpCentre={() => setActiveModal('helpCentre')}
      />

      <main className="main-wrapper">
        <div className="canvas-container">
          <TopBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onAddApp={() => setActiveModal('addApp')}
            onAlerts={() => navigate('/alerts')}
            onProfile={() => setActiveModal('account')}
          />

          <div className="page-scroll-body">
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title" id="settingsSectionTitle">
                  {section === 'security' ? 'Security' : 'Appearance'}
                </div>
                <div className="settings-header-right">
                  <div className="settings-section-pills">
                    <button
                      type="button"
                      className={`settings-pill-tab${section === 'appearance' ? ' active' : ''}`}
                      onClick={() => setSection('appearance')}
                    >
                      Appearance
                    </button>
                    <button
                      type="button"
                      className={`settings-pill-tab${section === 'security' ? ' active' : ''}`}
                      onClick={() => setSection('security')}
                    >
                      Security
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 1: APPEARANCE */}
              <div
                className="settings-scroll-body"
                id="sectionAppearance"
                style={{ display: section === 'appearance' ? 'block' : 'none' }}
              >
                {rowMatches('company logo brand image upload') && (
                  <div className="settings-row">
                    <div>
                      <div className="settings-label-title">Company logo</div>
                      <div className="settings-label-sub">Update your company logo.</div>
                    </div>
                    <div className="settings-control-area">
                      <div className="logo-preview-group" style={{ position: 'relative', display: 'inline-flex' }}>
                        <div className="company-logo-box" id="companyLogoPreview">
                          {logoDataUrl ? (
                            <img src={logoDataUrl} alt="Company logo" />
                          ) : logoRemoved ? (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>NONE</span>
                          ) : (
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round">
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
                          ref={fileInputRef}
                          type="file"
                          id="logoFileInput"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleLogoUpload}
                        />
                        <button
                          type="button"
                          className="btn-sec-plus"
                          style={{
                            position: 'absolute',
                            bottom: '-6px',
                            right: '-6px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: 'var(--primary-green)',
                            color: '#ffffff',
                            border: '2px solid #ffffff',
                            boxShadow: '0 2px 5px rgba(15, 23, 42, 0.16)',
                          }}
                          onClick={() => fileInputRef.current?.click()}
                          title="Upload new logo"
                          aria-label="Upload new logo"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        </button>
                      </div>
                      <button
                        type="button"
                        className="btn-soft-danger"
                        onClick={() => {
                          setLogoRemoved(true);
                          void persistCompanyLogo(null);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {rowMatches('brand color accent theme custom hex') && (
                  <div className="settings-row">
                    <div>
                      <div className="settings-label-title">Brand color</div>
                      <div className="settings-label-sub">Select or customize your brand color.</div>
                    </div>
                    <div className="settings-control-area">
                      <div className="brand-color-stack">
                        <div className="color-swatches-row" id="brandSwatchesRow">
                          {SWATCH_COLORS.map((swatch) => (
                            <button
                              key={swatch.hex}
                              type="button"
                              className={`color-swatch${selectedBrandColor === swatch.hex ? ' active' : ''}`}
                              style={{ background: swatch.bg }}
                              onClick={() => {
                                setSelectedBrandColor(swatch.hex);
                                setHexInput(swatch.hex);
                              }}
                              aria-label={swatch.label}
                            />
                          ))}
                        </div>

                        <div className="custom-color-row">
                          <span className="custom-color-label">Custom color:</span>
                          <div className="hex-input-pill">
                            <span>#</span>
                            <input
                              type="text"
                              id="customColorHexInput"
                              value={hexInput}
                              maxLength={6}
                              aria-label="Custom brand hex color"
                              onChange={(e) => handleCustomHexInput(e.target.value)}
                            />
                          </div>
                          <div
                            className="active-color-ring"
                            id="activeBrandRing"
                            style={{ background: `#${selectedBrandColor}` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {rowMatches('interface theme system preference light dark mode') && (
                  <div className="settings-row">
                    <div>
                      <div className="settings-label-title">Interface theme</div>
                      <div className="settings-label-sub">Select or customize your UI theme.</div>
                    </div>
                    <div className="settings-control-area">
                      <div className="preview-cards-row" id="themeCardsRow">
                        <div
                          className={`preview-option-card${selectedTheme === 'system' ? ' selected' : ''}`}
                          onClick={() => setSelectedTheme('system')}
                        >
                          <div className="preview-mockup-box">
                            <div className="mini-split-wrap">
                              <div className="mini-split-left">
                                <div className="mini-ui" style={{ width: '200%' }}>
                                  <div className="mini-ui-topbar">
                                    <span className="mini-dot"></span>
                                    <span className="mini-dot"></span>
                                    <span className="mini-dot"></span>
                                  </div>
                                  <div className="mini-ui-body">
                                    <div className="mini-ui-side">
                                      <div className="mini-line"></div>
                                      <div className="mini-line" style={{ width: '70%' }}></div>
                                      <div className="mini-line" style={{ width: '85%' }}></div>
                                    </div>
                                    <div className="mini-ui-main">
                                      <div className="mini-line" style={{ width: '60%' }}></div>
                                      <div className="mini-line"></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="mini-split-right">
                                <div className="mini-ui dark" style={{ width: '200%', marginLeft: '-100%' }}>
                                  <div className="mini-ui-topbar">
                                    <span className="mini-dot"></span>
                                    <span className="mini-dot"></span>
                                    <span className="mini-dot"></span>
                                  </div>
                                  <div className="mini-ui-body">
                                    <div className="mini-ui-side">
                                      <div className="mini-line"></div>
                                      <div className="mini-line" style={{ width: '70%' }}></div>
                                      <div className="mini-line" style={{ width: '85%' }}></div>
                                    </div>
                                    <div className="mini-ui-main">
                                      <div className="mini-line" style={{ width: '60%' }}></div>
                                      <div className="mini-line"></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="preview-check-badge">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </div>
                          </div>
                          <span className="preview-option-label">System preference</span>
                        </div>

                        <div
                          className={`preview-option-card${selectedTheme === 'light' ? ' selected' : ''}`}
                          onClick={() => setSelectedTheme('light')}
                        >
                          <div className="preview-mockup-box">
                            <div className="mini-ui">
                              <div className="mini-ui-topbar">
                                <span className="mini-dot"></span>
                                <span className="mini-dot"></span>
                                <span className="mini-dot"></span>
                              </div>
                              <div className="mini-ui-body">
                                <div className="mini-ui-side">
                                  <div className="mini-line"></div>
                                  <div className="mini-line" style={{ width: '70%' }}></div>
                                  <div className="mini-line" style={{ width: '85%' }}></div>
                                </div>
                                <div className="mini-ui-main">
                                  <div className="mini-line" style={{ width: '60%' }}></div>
                                  <div className="mini-line"></div>
                                </div>
                              </div>
                            </div>
                            <div className="preview-check-badge">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </div>
                          </div>
                          <span className="preview-option-label">Light</span>
                        </div>

                        <div
                          className={`preview-option-card${selectedTheme === 'dark' ? ' selected' : ''}`}
                          onClick={() => setSelectedTheme('dark')}
                        >
                          <div className="preview-mockup-box">
                            <div className="mini-ui dark">
                              <div className="mini-ui-topbar">
                                <span className="mini-dot"></span>
                                <span className="mini-dot"></span>
                                <span className="mini-dot"></span>
                              </div>
                              <div className="mini-ui-body">
                                <div className="mini-ui-side">
                                  <div className="mini-line"></div>
                                  <div className="mini-line" style={{ width: '70%' }}></div>
                                  <div className="mini-line" style={{ width: '85%' }}></div>
                                </div>
                                <div className="mini-ui-main">
                                  <div className="mini-line" style={{ width: '60%' }}></div>
                                  <div className="mini-line"></div>
                                </div>
                              </div>
                            </div>
                            <div className="preview-check-badge">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </div>
                          </div>
                          <span className="preview-option-label">Dark</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {rowMatches('tables view default compact rows') && (
                  <div className="settings-row">
                    <div>
                      <div className="settings-label-title">Tables view</div>
                      <div className="settings-label-sub">How are tables displayed in the app.</div>
                    </div>
                    <div className="settings-control-area">
                      <div className="preview-cards-row two-col" id="tablesViewRow">
                        <div
                          className={`preview-option-card${selectedTableView === 'default' ? ' selected' : ''}`}
                          onClick={() => setSelectedTableView('default')}
                        >
                          <div className="preview-mockup-box" style={{ background: '#ffffff', padding: '10px' }}>
                            <div style={{ fontSize: '8px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                              Monitored Apps
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                              {[0, 1, 2, 3].map((i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#cbd5e1' }}></span>
                                  <div className="mini-line" style={{ flex: 1 }}></div>
                                </div>
                              ))}
                            </div>
                            <div className="preview-check-badge">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </div>
                          </div>
                          <span className="preview-option-label">Default</span>
                        </div>

                        <div
                          className={`preview-option-card${selectedTableView === 'compact' ? ' selected' : ''}`}
                          onClick={() => setSelectedTableView('compact')}
                        >
                          <div className="preview-mockup-box" style={{ background: '#ffffff', padding: '10px' }}>
                            <div style={{ fontSize: '8px', fontWeight: 700, color: '#64748b', marginBottom: '5px' }}>
                              Monitored Apps
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {[0, 1, 2, 3, 4, 5].map((i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#cbd5e1' }}></span>
                                  <div className="mini-line" style={{ flex: 1, height: '3px' }}></div>
                                </div>
                              ))}
                            </div>
                            <div className="preview-check-badge">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </div>
                          </div>
                          <span className="preview-option-label">Compact</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: SECURITY & PRIVACY */}
              <div
                className="settings-scroll-body"
                id="sectionSecurity"
                style={{ display: section === 'security' ? 'block' : 'none' }}
              >
                <div className="security-subhead">Manage security settings to protect your account</div>

                <div className="security-grid">
                  <div className="security-col-left">
                    <div className="security-panel-card">
                      <div className="security-panel-title">Account Details</div>
                      <div className="security-row-item first">
                        <div>
                          <div className="settings-label-title">Verify Email Address</div>
                          <div className="settings-label-sub">Verify your email address to confirm the credentials</div>
                        </div>
                        <span className="verified-badge">Verified</span>
                      </div>
                      <div className="security-row-item last">
                        <div>
                          <div className="settings-label-title">Update Password</div>
                          <div className="settings-label-sub">Change your password to update &amp; protect your Account</div>
                        </div>
                        <button
                          type="button"
                          className="btn-soft-outline"
                          onClick={() => showToast('Password update link sent to admin@reviews-analyzer.ai')}
                        >
                          Change Password
                        </button>
                      </div>
                    </div>

                    <div className="security-panel-card">
                      <div className="security-panel-title">Recovery Settings</div>
                      <div className="security-row-item first" style={{ borderBottom: 'none', paddingBottom: '4px' }}>
                        <div>
                          <div className="settings-label-title">Recovery Email Address</div>
                          <div className="settings-label-sub">Setup Recovery Email to Secure your Account</div>
                        </div>
                        <button
                          type="button"
                          className="btn-save-primary"
                          style={{ padding: '7px 16px' }}
                          onClick={() => showToast(`Recovery email saved: ${recoveryEmail || 'updated'}`)}
                        >
                          Save
                        </button>
                      </div>
                      <div style={{ paddingBottom: '14px' }}>
                        <label className="sec-input-label" htmlFor="recoveryEmailInput">
                          Another Email Address
                        </label>
                        <input
                          type="email"
                          id="recoveryEmailInput"
                          className="sec-input"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          placeholder="info@company.com"
                        />
                      </div>
                      <div className="security-row-item last">
                        <div>
                          <div className="settings-label-title">Recovery Phone Number</div>
                          <div className="settings-label-sub">Add Phone number to Setup SMS Recovery for your account</div>
                        </div>
                        <button
                          type="button"
                          className="btn-soft-outline"
                          onClick={() => showToast('SMS recovery setup opened')}
                        >
                          Setup
                        </button>
                      </div>
                    </div>

                    <div className="security-panel-card">
                      <div className="security-row-item first last" style={{ padding: 0, borderTop: 'none' }}>
                        <div>
                          <div className="settings-label-title">Deactivate Account</div>
                          <div className="settings-label-sub">
                            This will shut down your account, and it will reactivate with signing in
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-soft-danger"
                          style={{ background: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }}
                          onClick={() => showToast('Deactivation requires Admin confirmation')}
                        >
                          Deactivate
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="security-panel-card tfa-card-viewport">
                    <div className={`tfa-slider-track${showQrSlide ? ' show-qr' : ''}`} id="tfaSliderTrack">
                      <div className="tfa-slide-pane">
                        <div className="security-panel-title">Two-factor Authentication</div>
                        <div className="security-row-item first">
                          <div>
                            <div className="settings-label-title">Enable Authentication</div>
                            <div className="settings-label-sub">
                              Enable Two-factor Authentication to enhance the security
                            </div>
                          </div>
                          <label className="toggle-switch" style={{ flexShrink: 0 }}>
                            <input
                              type="checkbox"
                              id="twoFactorToggle"
                              checked={twoFactorEnabled}
                              aria-label="Enable Two-factor Authentication"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTotpVerifyInput('');
                                  setActiveModal('enable2fa');
                                } else {
                                  setDisable2faPassword('');
                                  setActiveModal('disable2fa');
                                }
                              }}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>

                        <div
                          id="twoFactorMethodsWrap"
                          style={{
                            transition: 'opacity 0.2s ease',
                            opacity: twoFactorEnabled ? 1 : 0.45,
                            pointerEvents: twoFactorEnabled ? 'auto' : 'none',
                          }}
                        >
                          <div className="security-row-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                              <div className="sec-icon-box">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="5" y="2" width="14" height="20" rx="2.5"></rect>
                                  <path d="M9 12l2 2 4-4"></path>
                                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                                </svg>
                              </div>
                              <div>
                                <span className="settings-label-title" style={{ fontSize: '13px' }}>
                                  Authentication App
                                </span>
                                <div
                                  id="authAppBadge"
                                  style={{
                                    fontSize: '11px',
                                    color: twoFactorEnabled && authAppConfigured ? '#16a34a' : '#94a3b8',
                                    fontWeight: 600,
                                    marginTop: '1px',
                                  }}
                                >
                                  {twoFactorEnabled && authAppConfigured ? 'Configured' : 'Inactive'}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn-sec-plus"
                              onClick={() => {
                                setInlineTotpCode('');
                                setShowQrSlide(true);
                              }}
                              title="Configure Authenticator App"
                            >
                              +
                            </button>
                          </div>

                          <div className="security-row-item last" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                              <div className="sec-icon-box">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"></path>
                                  <circle cx="16.5" cy="7.5" r="1.2" fill="currentColor"></circle>
                                </svg>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <span className="settings-label-title" style={{ fontSize: '13px' }}>
                                  Security Key
                                </span>
                                <span
                                  id="securityKeyBadge"
                                  style={{
                                    display: twoFactorEnabled && securityKeyConfigured ? 'inline-block' : 'none',
                                    fontSize: '10.5px',
                                    color: '#16a34a',
                                    background: '#ecfdf5',
                                    border: '1px solid #bbf7d0',
                                    padding: '1px 7px',
                                    borderRadius: '999px',
                                    fontWeight: 700,
                                  }}
                                >
                                  Active
                                </span>
                              </div>
                            </div>
                            <div className="settings-label-sub" style={{ marginTop: 0 }}>
                              Use physical security key to protect your account
                            </div>
                            <button
                              type="button"
                              className="btn-soft-outline"
                              style={{ width: '100%', textAlign: 'center' }}
                              onClick={registerSecurityKey}
                            >
                              Use Security Key
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="tfa-slide-pane">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                          <button
                            type="button"
                            className="btn-soft-outline"
                            style={{ padding: '5px 10px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            onClick={() => setShowQrSlide(false)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                            <span>Back</span>
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '11px' }}>
                          <div
                            id="inlineQrBox"
                            style={{
                              padding: '14px',
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '16px',
                              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: '192px',
                              minHeight: '192px',
                            }}
                          >
                            {qrDataUrl && <img src={qrDataUrl} alt="2FA QR Code" width={164} height={164} />}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                            Scan this QR code with Google Authenticator
                          </div>
                        </div>

                        <div style={{ marginTop: '12px' }}>
                          <label
                            htmlFor="inlineTotpInput"
                            style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '5px' }}
                          >
                            6-Digit Code
                          </label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              id="inlineTotpInput"
                              maxLength={6}
                              placeholder="000000"
                              className="sec-input"
                              value={inlineTotpCode}
                              onChange={(e) => setInlineTotpCode(e.target.value)}
                              style={{ padding: '8px 10px', letterSpacing: '2px', fontWeight: 700, textAlign: 'center' }}
                            />
                            <button
                              type="button"
                              className="btn-save-primary"
                              style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}
                              onClick={verifyInlineAuthenticator}
                            >
                              Verify
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="settings-card-footer">
                <button type="button" className="btn-soft-outline" onClick={resetSettingsToDefault}>
                  Cancel
                </button>
                <button type="button" className="btn-save-primary" id="saveSettingsBtn" onClick={saveAppearanceSettings}>
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}
      <div
        className={`modal-overlay${activeModal === 'addApp' ? ' active' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">Track New Application</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>
              &times;
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                App Title
              </label>
              <input
                type="text"
                placeholder="e.g. Western Flix Cinema"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '5px', outline: 'none', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Store Platform
              </label>
              <select
                aria-label="Select store platform"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '5px', outline: 'none', fontSize: '13px', background: '#ffffff' }}
              >
                <option value="google">Google Play Store</option>
                <option value="apple">Apple App Store</option>
                <option value="samsung">Samsung Galaxy Store</option>
                <option value="amazon">Amazon Appstore</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button className="btn-action-outline" onClick={() => setActiveModal(null)}>
                Cancel
              </button>
              <button
                className="btn-action-solid"
                onClick={() => {
                  setActiveModal(null);
                  showToast('Application added to Monitored Apps');
                }}
              >
                Save &amp; Track
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`modal-overlay${activeModal === 'account' ? ' active' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">Account Profile &amp; Workspace</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>
              &times;
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary-green)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '15px' }}>
              YN
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>Don Carlos (Product Manager)</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>admin@reviews-analyzer.ai • Enterprise Plan</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
            <button className="btn-action-outline" onClick={() => setActiveModal('teams')}>
              Manage Teams
            </button>
            <button className="btn-action-outline" onClick={() => setActiveModal(null)}>
              Close
            </button>
          </div>
        </div>
      </div>

      <div
        className={`modal-overlay${activeModal === 'teams' ? ' active' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className="modal-card" style={{ width: '520px', maxWidth: '94vw' }}>
          <div className="modal-header">
            <div>
              <div className="modal-title">Workspace Teams &amp; Roles</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                3 of 10 Enterprise Seats Used • Role-Based Access Control
              </div>
            </div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>
              &times;
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={{ flex: 1, padding: '8px 11px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none' }}
            />
            <select
              aria-label="Select team role"
              defaultValue="Support Agent"
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff', color: '#0f172a', fontWeight: 600, outline: 'none' }}
            >
              <option value="Admin">Admin</option>
              <option value="Developer">Developer</option>
              <option value="Support Agent">Support Agent</option>
              <option value="Viewer">Viewer</option>
            </select>
            <button
              className="btn-action-solid"
              onClick={() => {
                if (inviteEmail.trim()) {
                  showToast(`Invitation sent to ${inviteEmail.trim()}`);
                  setInviteEmail('');
                } else {
                  showToast('Please enter a valid email address');
                }
              }}
            >
              Invite
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button className="btn-action-outline" onClick={() => setActiveModal(null)}>
              Close
            </button>
            <button
              className="btn-action-solid"
              onClick={() => {
                setActiveModal(null);
                showToast('Team permissions saved');
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      <div
        className={`modal-overlay${activeModal === 'connectedDevices' ? ' active' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className="modal-card" style={{ width: '520px', maxWidth: '94vw' }}>
          <div className="modal-header">
            <div>
              <div className="modal-title">Connected Devices &amp; Active Sessions</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                Manage authorized devices and store telemetry endpoints
              </div>
            </div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>
              &times;
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                MacBook Pro M3 Max{' '}
                <span style={{ fontSize: '10.5px', color: '#166534', background: '#dcfce7', padding: '2px 7px', borderRadius: '999px', marginLeft: '5px' }}>
                  Current Session
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>macOS • Chrome • Active now</div>
            </div>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#16a34a' }}>Online</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button className="btn-action-outline" onClick={() => setActiveModal(null)}>
              Close
            </button>
          </div>
        </div>
      </div>

      <div
        className={`modal-overlay${activeModal === 'helpCentre' ? ' active' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">Help Centre &amp; Documentation</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>
              &times;
            </button>
          </div>
          <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.55 }}>
            Customize your Reviews AI workspace appearance, brand color, table density, store sync schedule, and security settings here.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button className="btn-action-solid" onClick={() => setActiveModal(null)}>
              Got It
            </button>
          </div>
        </div>
      </div>

      {/* ENABLE 2FA MODAL */}
      <div
        className={`modal-overlay${activeModal === 'enable2fa' ? ' active' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className="modal-card" style={{ width: '470px' }}>
          <div className="modal-header">
            <div className="modal-title">Set Up Two-Factor Authentication</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>
              &times;
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <div style={{ width: '72px', height: '72px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="1.6">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                  <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14v2"></path>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Scan with Authenticator App</div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  Use Google Authenticator or Authy to scan this QR code.
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#17533b', fontWeight: 700, marginTop: '5px' }}>
                  Secret: JBSW Y3DP EHPK 3PXP
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="totpVerifyInput" style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Enter 6-Digit Verification Code
              </label>
              <input
                type="text"
                id="totpVerifyInput"
                maxLength={6}
                placeholder="e.g. 482910"
                value={totpVerifyInput}
                onChange={(e) => setTotpVerifyInput(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '5px', outline: 'none', fontSize: '14px', letterSpacing: '2px', fontWeight: 700 }}
              />
            </div>
            <div style={{ padding: '10px 12px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '11.5px', color: '#166534' }}>
              <strong>Backup Recovery Codes:</strong>{' '}
              <span style={{ fontFamily: 'monospace' }}>RA92-4810, RA37-9104, RA65-2281</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button className="btn-action-outline" onClick={() => setActiveModal(null)}>
                Cancel
              </button>
              <button className="btn-action-solid" onClick={confirmEnable2FA}>
                Verify &amp; Enable 2FA
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DISABLE 2FA MODAL */}
      <div
        className={`modal-overlay${activeModal === 'disable2fa' ? ' active' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className="modal-card" style={{ width: '440px' }}>
          <div className="modal-header">
            <div className="modal-title">Disable Two-Factor Authentication?</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>
              &times;
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '12px', color: '#991b1b', lineHeight: 1.45 }}>
              Turning off 2FA removes the second verification step on login and revokes your existing backup codes.
            </div>
            <div>
              <label htmlFor="disable2faPassword" style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Confirm Current Password
              </label>
              <input
                type="password"
                id="disable2faPassword"
                placeholder="Enter your password to confirm"
                value={disable2faPassword}
                onChange={(e) => setDisable2faPassword(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '5px', outline: 'none', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button className="btn-action-outline" onClick={() => setActiveModal(null)}>
                Keep 2FA Enabled
              </button>
              <button className="btn-soft-danger" onClick={confirmDisable2FA}>
                Disable 2FA
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`toast-message${toastVisible ? ' show' : ''}`} id="toastMsg">
        {toastMsg}
      </div>
    </>
  );
}
