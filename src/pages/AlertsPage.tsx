import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { StoreLogoBadge } from '../components/StoreLogoBadge';
import { usePageMeta } from '../hooks/usePageMeta';
import '../styles/alerts.css';

type Severity = 'critical' | 'warning' | 'recovered';
type SeverityFilter = 'all' | 'critical' | 'warning' | 'recovered' | 'unread';
type SortOption = 'recent' | 'risk' | 'critical';
type DetailSubtab = 'overview' | 'activity' | 'interventions';
type AlertsModal = 'addApp' | 'settings' | 'account' | 'teams' | 'connectedDevices' | 'helpCentre' | null;

interface AlertRecord {
  id: string;
  severity: Severity;
  store: string;
  courseOrApp: string;
  timeAgo: string;
  unread: boolean;
  title: string;
  subtitle: string;
  description: string;
  riskScore: number;
  footerMeta: string;
  footerMetaIcon: 'mail' | 'layers';
  confidence: number;
  tone: string;
  strategy: string;
  callout: string;
  headline: string;
  signals: string[];
  incomingEmail?: {
    from: string;
    to: string;
    subject: string;
    received: string;
    body: string;
  };
  draftHtml: string;
  altDraftHtml: string;
  reviewsList: Array<{ user: string; rating: string; store: string; text: string }>;
}

const INITIAL_ALERTS: AlertRecord[] = [
  {
    id: 'al-1',
    severity: 'critical',
    store: 'Samsung Galaxy Store',
    courseOrApp: 'Netflix • Samsung Galaxy Store',
    timeAgo: 'A minute ago',
    unread: false,
    title: 'Samsung Seller Office — App Down Notice',
    subtitle: 'Production stream endpoint unreachable — risk score critical',
    description:
      'Incoming store email from seller-notice@samsung.com: Production CDN & DRM endpoint returning HTTP 503 on Tizen 8.0 Smart TVs. Store visibility will be suspended within 24 hours if not restored.',
    riskScore: 88,
    footerMeta: 'Draft email prepared',
    footerMetaIcon: 'mail',
    confidence: 95,
    tone: 'Urgent, compliant & technical',
    strategy: 'Confirm CDN failover restoration → attach v8.4.3 health check log → prevent store delisting',
    callout:
      'If Samsung Seller Office does not receive endpoint verification within 6 hours, page on-call SRE via Slack & SMS.',
    headline: 'Agent prepared a compliance & uptime verification email for Samsung Seller Office.',
    signals: [
      '• Store Email: seller-notice@samsung.com (Ticket #SGS-90412)',
      '• Endpoint probe: HTTP 503 on drm-tizen.netflix.com',
      '• Correlated spike: 18 1★ reviews citing "App Down / Black Screen"',
      '• SLA deadline: 24h before temporary store suspension',
    ],
    incomingEmail: {
      from: 'Samsung Galaxy Store Seller Office <seller-notice@samsung.com>',
      to: 'release-ops@reviews-analyzer.ai',
      subject: '[URGENT] App Availability Failure: Netflix (com.netflix.ninja) on Tizen 8.0',
      received: 'Today, 11:24 AM (1 minute ago)',
      body:
        'Dear Partner, our automated Seller Office availability monitor detected that your production streaming & DRM handshake endpoint returned HTTP 503 across 74% of Tizen 8.0 Smart TVs over the last 45 minutes. Per Galaxy Store Policy 4.2, please restore service availability or submit a hotfix build within 24 hours to avoid temporary store visibility suspension.',
    },
    draftHtml: `
      <p>To: Samsung Galaxy Store Operations &amp; Review Team (Ticket #SGS-90412),</p>
      <p>We have received your automated availability notice regarding <strong>com.netflix.ninja (v8.4.2)</strong> on Tizen 8.0 Smart TVs. Our SRE team traced the HTTP 503 responses to a regional DRM edge certificate rotation and completed a full traffic failover 4 minutes ago.</p>
      <p>All Tizen 8.0 playback endpoints are now returning <strong>HTTP 200 OK (99.98% success rate)</strong>, and hotfix binary <strong>v8.4.3</strong> has been uploaded to Seller Office:<br>
      <span class="ai-draft-link" data-toast="Attached Live Endpoint Health Report &amp; v8.4.3 Binary Hash">👉 View Live Endpoint Health Check &amp; v8.4.3 Verification Log</span></p>
      <p>Please re-run the Galaxy Store availability probe to clear suspension flag #SGS-90412. Reply directly to this email if additional telemetry is needed.</p>
    `,
    altDraftHtml: `
      <p>Dear Samsung Galaxy Store Seller Office Team,</p>
      <p>Thank you for the automated downtime alert (Ref #SGS-90412). We have resolved the Tizen 8.0 CDN/DRM outage via multi-region failover and verified 100% synthetic probe uptime across all Smart TV models.</p>
      <p><span class="ai-draft-link" data-toast="Opened Uptime Verification Certificate">👉 Download Signed Uptime &amp; Build v8.4.3 Audit Report</span></p>
      <p>We request an immediate health-check re-verification so our store listing remains active without interruption.</p>
    `,
    reviewsList: [
      {
        user: 'Ethan Brooks',
        rating: '1★',
        store: 'Samsung Galaxy Store',
        text: 'App is completely down on my Samsung QN90C TV today—just spins and gives a server unreachable error.',
      },
      {
        user: 'Marcus T.',
        rating: '1★',
        store: 'Samsung Galaxy Store',
        text: "Cannot connect to server on Tizen 8.0 since this morning's update.",
      },
    ],
  },
  {
    id: 'al-2',
    severity: 'warning',
    store: 'Google Play',
    courseOrApp: 'Spotify • Google Play Store',
    timeAgo: '5 minutes ago',
    unread: true,
    title: 'Google Play Console — Vitals Alert Email',
    subtitle: 'Crash rate exceeded 3.84% bad behavior threshold',
    description:
      'Incoming email from no-reply-googleplay-developer@google.com: Production crash rate on Android 14 crossed the 1.09% store threshold across 3 device cohorts. Store ranking demotion warning active.',
    riskScore: 78,
    footerMeta: 'Draft email prepared',
    footerMetaIcon: 'mail',
    confidence: 91,
    tone: 'Structured, analytical & proactive',
    strategy: 'Halt staged rollout at 25% → notify Play Console & engineering → push patch v9.1.1',
    callout: 'If Android Vitals crash rate stays above 1.09% for 12 hours, Google Play will limit store discovery.',
    headline: 'Agent prepared an incident response email & rollout halt confirmation.',
    signals: [
      '• Store Email: no-reply-googleplay-developer@google.com',
      '• Crash rate: 3.84% vs. 1.09% Play Store threshold',
      '• Affected OS: Android 14 foreground sync worker',
      '• 9 matching user reviews in the last 45 minutes',
    ],
    incomingEmail: {
      from: 'Google Play Console <no-reply-googleplay-developer@google.com>',
      to: 'android-release@reviews-analyzer.ai',
      subject: 'Android Vitals Alert: Spotify (com.spotify.music) exceeded user-perceived crash rate threshold',
      received: 'Today, 11:20 AM (5 minutes ago)',
      body:
        "Your app com.spotify.music (version code 910042) has a user-perceived crash rate of 3.84% over the last 24 hours, exceeding the Google Play bad behavior threshold of 1.09%. Main stack trace: ForegroundServiceStartNotAllowedException on Android 14. Continued threshold violations may reduce your app's visibility on Google Play.",
    },
    draftHtml: `
      <p>Hi Android Release &amp; Google Play Operations Team,</p>
      <p>Google Play Console just sent an automated <strong>Android Vitals Bad Behavior Alert</strong> showing our user-perceived crash rate at <strong>3.84%</strong> (threshold: 1.09%) on build <code>910042</code> due to <code>ForegroundServiceStartNotAllowedException</code> on Android 14.</p>
      <p>We have staged the following immediate mitigation plan:<br>
      1. Halt build <code>910042</code> staged rollout at 25%.<br>
      2. Promote hotfix build <code>910045</code> with guarded foreground sync permissions to 100% production:<br>
      <span class="ai-draft-link" data-toast="Executed Play Console Rollout Halt &amp; Attached Vitals Report">👉 Halt v9.1.0 Rollout &amp; Submit Play Console Mitigation Note</span></p>
      <p>Approve this email to notify the release distribution list and log the Play Console acknowledgment.</p>
    `,
    altDraftHtml: `
      <p>Team,</p>
      <p>Per the incoming Google Play Console Vitals alert (3.84% crash rate on Android 14), we have paused the v9.1.0 rollout and deployed hotfix build 910045 to restore Play Store health metrics below 0.4%.</p>
    `,
    reviewsList: [
      {
        user: 'Elena Rostova',
        rating: '2★',
        store: 'Google Play',
        text: 'App keeps crashing in the background whenever offline playlist sync reaches 64% on my Galaxy S24.',
      },
      {
        user: 'Devon K.',
        rating: '1★',
        store: 'Google Play',
        text: 'Crashes immediately on Android 14 when locking the screen during download.',
      },
    ],
  },
  {
    id: 'al-3',
    severity: 'critical',
    store: 'Apple App Store',
    courseOrApp: 'Disney+ • Apple App Store',
    timeAgo: '5h ago',
    unread: true,
    title: 'App Store Connect — Auth Service Down',
    subtitle: 'iOS 17.5 SSO endpoint timeout — Guideline 2.1 notice',
    description:
      'Incoming email from App Store Connect (no-reply@email.apple.com): Live App Review & automated store health checks experienced repeated sign-in timeouts on /v2/auth/profile-switch.',
    riskScore: 78,
    footerMeta: '2 actions proposed by Agent',
    footerMetaIcon: 'layers',
    confidence: 94,
    tone: 'Formal, reassuring & precise',
    strategy: 'Reply to App Store Resolution Center → confirm server-side OAuth fix → clear review hold',
    callout: 'Server-side OAuth refresh TTL has been restored; send Resolution Center email to release v4.18 update.',
    headline: 'Agent prepared an App Store Connect Resolution Center response email.',
    signals: [
      '• Store Email: App Store Connect <no-reply@email.apple.com>',
      '• Submission ID: #ASC-7781920 (Guideline 2.1 - App Completeness)',
      '• Endpoint latency spike on /v2/auth/profile-switch resolved',
      '• 12 1★–2★ reviews mentioning "Session Expired" loop',
    ],
    incomingEmail: {
      from: 'App Store Connect <no-reply@email.apple.com>',
      to: 'ios-submissions@reviews-analyzer.ai',
      subject: 'Notice regarding your app Disney+ (App ID: 1446075923) — Sign-In Service Unreachable',
      received: 'Today, 06:15 AM (5 hours ago)',
      body:
        'Hello, during our automated store health check and Guideline 2.1 review on iPadOS 17.5, the authentication service for Disney+ timed out repeatedly with "Session Expired" when switching profiles. Please verify that your production authentication servers are online and reply via App Store Connect.',
    },
    draftHtml: `
      <p>Dear App Store Review &amp; Operations Team (Submission #ASC-7781920),</p>
      <p>Thank you for notifying us regarding the sign-in timeout encountered on iPadOS 17.5. Our cloud engineering team identified a brief OAuth token-refresh race condition on <code>/v2/auth/profile-switch</code> and deployed a server-side fix—no binary change is required.</p>
      <p>We have verified 100% sign-in and profile-switching uptime across all iOS 17.5 and iPadOS 17.5 test accounts:<br>
      <span class="ai-draft-link" data-toast="Attached OAuth Health Log to App Store Connect Reply">👉 Attach OAuth Server Uptime Log &amp; Request Review Continuation</span></p>
      <p>We appreciate your assistance in completing the review of Disney+ v4.18.</p>
    `,
    altDraftHtml: `
      <p>Hello App Store Review Team,</p>
      <p>We have resolved the server-side authentication timeout affecting profile switching on iOS 17.5. All production OAuth endpoints are healthy and ready for re-verification.</p>
    `,
    reviewsList: [
      {
        user: 'Liam C.',
        rating: '1★',
        store: 'Apple App Store',
        text: 'Keeps kicking me back to the login screen every time I switch profiles on iPadOS 17.5.',
      },
    ],
  },
  {
    id: 'al-4',
    severity: 'critical',
    store: 'Amazon Appstore',
    courseOrApp: 'Prime Video • Amazon Appstore',
    timeAgo: '5h ago',
    unread: true,
    title: 'Amazon Appstore — Fire TV Heartbeat Failed',
    subtitle: 'US-East playback API down for 18m — SLA warning',
    description:
      'Incoming email from Amazon Appstore Developer Console: Live App Availability monitor detected HTTP 504 gateway timeouts on Fire OS 8 devices across US-East.',
    riskScore: 84,
    footerMeta: 'Draft email prepared',
    footerMetaIcon: 'mail',
    confidence: 92,
    tone: 'Direct, accountable & technical',
    strategy: 'Confirm US-East load balancer recovery → send SLA post-mortem email to Amazon Appstore',
    callout: 'Fire TV Featured Carousel placement requires <0.1% downtime; send root-cause confirmation within 2h.',
    headline: 'Agent prepared an SLA recovery & post-mortem email for Amazon Appstore.',
    signals: [
      '• Store Email: Amazon Appstore <no-reply@amazon.com>',
      '• Region affected: US-East Fire TV Stick 4K Max (Fire OS 8)',
      '• Gateway timeout window: 18 minutes (now 100% recovered)',
      '• Risk score: 84 (Featured placement SLA alert)',
    ],
    incomingEmail: {
      from: 'Amazon Appstore Developer Console <no-reply@amazon.com>',
      to: 'firetv-ops@reviews-analyzer.ai',
      subject: '[SLA Alert] Fire TV Live Availability Check Failed — Prime Video (B00N28818A)',
      received: 'Today, 06:02 AM (5 hours ago)',
      body:
        'Hello Developer, Amazon Appstore synthetic monitoring recorded 18 minutes of HTTP 504 Gateway Timeout responses from your Fire OS 8 playback manifest endpoint in US-East-1. Please confirm service restoration to maintain Fire TV Home Featured Row eligibility.',
    },
    draftHtml: `
      <p>To: Amazon Appstore Fire TV Partner Engineering,</p>
      <p>We confirm receipt of your Live Availability SLA Alert for ASIN <strong>B00N28818A</strong> on Fire OS 8. The 18-minute HTTP 504 window in US-East-1 was caused by an upstream ALB connection pool exhaustion during peak 4K HDR manifest requests.</p>
      <p>Auto-scaling capacity was doubled at 06:20 AM EDT, and synthetic heartbeat checks have remained at <strong>100% availability</strong> for the past 5 hours:<br>
      <span class="ai-draft-link" data-toast="Attached US-East-1 ALB Telemetry &amp; SLA Report">👉 View US-East-1 Recovery Telemetry &amp; Keep Featured Placement</span></p>
      <p>Please let us know if any further documentation is required by the Fire TV Partner team.</p>
    `,
    altDraftHtml: `
      <p>Hello Amazon Appstore Partner Team,</p>
      <p>Our US-East-1 Fire OS 8 manifest endpoint is fully restored following an load-balancer scaling adjustment. Synthetic availability is back at 100%.</p>
    `,
    reviewsList: [
      {
        user: 'Arafat Nayeem',
        rating: '1★',
        store: 'Amazon Appstore',
        text: 'Fire TV Stick 4K Max gave a server unavailable error for 20 minutes tonight.',
      },
    ],
  },
  {
    id: 'al-5',
    severity: 'recovered',
    store: 'Google Play',
    courseOrApp: 'WhatsApp • Google Play Store',
    timeAgo: 'Yesterday',
    unread: false,
    title: 'Google Play Console — Service Restored',
    subtitle: 'Cloud backup endpoint healthy — store warning cleared',
    description:
      'Incoming confirmation email from Google Play Console: Production ANR & backup timeout rates returned to 0.18% after v2.24.19 rollout. Store health status is now Normal.',
    riskScore: 22,
    footerMeta: 'Incident resolved',
    footerMetaIcon: 'mail',
    confidence: 98,
    tone: 'Concise, celebratory & informative',
    strategy: 'Send internal resolution summary email → close linked Jira incident',
    callout: 'Google Play Console officially cleared the ANR warning; alert moved to Recovered.',
    headline: 'Store health restored — Agent prepared an internal closure email for stakeholders.',
    signals: [
      '• Store Email: Google Play Console <no-reply-googleplay-developer@google.com>',
      '• ANR & timeout rate recovered to 0.18% (Normal)',
      '• Star average recovered from 3.9★ → 4.7★',
      '• Patch v2.24.19 adoption at 94%',
    ],
    incomingEmail: {
      from: 'Google Play Console <no-reply-googleplay-developer@google.com>',
      to: 'android-release@reviews-analyzer.ai',
      subject: '[RESOLVED] Android Vitals status restored for WhatsApp Messenger (com.whatsapp)',
      received: 'Yesterday, 04:45 PM',
      body:
        "Good news! Following the rollout of version 2.24.19, your app's ANR and cloud backup timeout metrics have returned below the Google Play bad behavior threshold (current: 0.18%). The store visibility warning has been removed from your Play Console account.",
    },
    draftHtml: `
      <p>Hi Engineering &amp; Product Leadership,</p>
      <p>Google Play Console has officially sent a <strong>Resolved Status Confirmation</strong> for WhatsApp <strong>v2.24.19</strong>. Production backup timeout and ANR rates have dropped to <strong>0.18%</strong>, and all Play Store visibility warnings have been cleared.</p>
      <p><span class="ai-draft-link" data-toast="Viewed Play Console Clearance Certificate">👉 View Play Console Clearance &amp; Close Jira Incident #RA-389</span></p>
      <p>Thank you to the on-call team for the rapid turnaround!</p>
    `,
    altDraftHtml: `
      <p>Team,</p>
      <p>Confirming that Google Play Console has cleared our Vitals warning following the v2.24.19 release. Incident #RA-389 is now closed.</p>
    `,
    reviewsList: [
      {
        user: 'Priya S.',
        rating: '5★',
        store: 'Google Play',
        text: 'Latest update fixed the 99% Google Drive backup hang! Super fast now.',
      },
    ],
  },
];

export function AlertsPage() {
  usePageMeta('alerts', 'Reviews Analyzer - AI Alerts & Incident Response');
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<AlertRecord[]>(INITIAL_ALERTS);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [storeFilter, setStoreFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<'sort' | 'store' | null>(null);

  const [selectedAlertId, setSelectedAlertId] = useState('al-1');
  const [detailSubtab, setDetailSubtab] = useState<DetailSubtab>('overview');
  const [signalsOpen, setSignalsOpen] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [useAltDraft, setUseAltDraft] = useState(false);
  const draftBoxRef = useRef<HTMLDivElement | null>(null);

  const [activeModal, setActiveModal] = useState<AlertsModal>(null);
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
    const closeDropdowns = () => setOpenMenu(null);
    document.addEventListener('click', closeDropdowns);
    return () => document.removeEventListener('click', closeDropdowns);
  }, []);

  const filteredAlerts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = alerts.filter((item) => {
      if (severityFilter === 'critical' && item.severity !== 'critical') return false;
      if (severityFilter === 'warning' && item.severity !== 'warning') return false;
      if (severityFilter === 'recovered' && item.severity !== 'recovered') return false;
      if (severityFilter === 'unread' && !item.unread) return false;
      if (storeFilter !== 'all' && item.store !== storeFilter) return false;
      if (q) {
        const hay = `${item.title} ${item.subtitle} ${item.description} ${item.courseOrApp}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'risk') {
      list.sort((a, b) => b.riskScore - a.riskScore);
    } else if (sortBy === 'critical') {
      const order: Record<Severity, number> = { critical: 1, warning: 2, recovered: 3 };
      list.sort((a, b) => order[a.severity] - order[b.severity]);
    }
    return list;
  }, [alerts, severityFilter, storeFilter, searchQuery, sortBy]);

  const selectedAlert = useMemo(() => {
    return (
      filteredAlerts.find((a) => a.id === selectedAlertId) ||
      filteredAlerts[0] ||
      alerts.find((a) => a.id === selectedAlertId) ||
      alerts[0]
    );
  }, [alerts, filteredAlerts, selectedAlertId]);

  const displayCount =
    severityFilter === 'all' && storeFilter === 'all' && !searchQuery ? 23 : filteredAlerts.length;

  const sortBtnLabel =
    sortBy === 'risk'
      ? 'Sort: Highest Risk Score'
      : sortBy === 'critical'
        ? 'Sort: Critical First'
        : 'Sort: Most Recent';

  const storeFilterBtnLabel =
    storeFilter === 'Google Play'
      ? 'Filter: Google Play'
      : storeFilter === 'Apple App Store'
        ? 'Filter: App Store'
        : storeFilter === 'Samsung Galaxy Store'
          ? 'Filter: Samsung'
          : storeFilter === 'Amazon Appstore'
            ? 'Filter: Amazon'
            : 'Filter';

  const selectAlertItem = (id: string) => {
    setSelectedAlertId(id);
    setUseAltDraft(false);
    setIsEditingDraft(false);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, unread: false } : a)));
  };

  const toggleEditDraft = () => {
    const next = !isEditingDraft;
    setIsEditingDraft(next);
    if (next) {
      setTimeout(() => draftBoxRef.current?.focus(), 0);
      showToast('Editing AI email draft — click Save Draft when finished');
    } else {
      showToast('Email draft changes saved');
    }
  };

  const regenerateAlertDraft = () => {
    setUseAltDraft((prev) => !prev);
    setIsEditingDraft(false);
    showToast('AI Agent re-generated response email with fresh store telemetry');
  };

  const approveAndSendAlertAction = () => {
    if (selectedAlert) {
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === selectedAlert.id ? { ...a, severity: 'recovered', footerMeta: 'Email sent to store' } : a
        )
      );
    }
    showToast('Approved! Response email sent to store owner & logged to team');
  };

  const discardCurrentAlert = () => {
    if (alerts.length > 1 && selectedAlert) {
      const remaining = alerts.filter((a) => a.id !== selectedAlert.id);
      setAlerts(remaining);
      setSelectedAlertId(remaining[0].id);
      showToast(`Discarded alert for ${selectedAlert.title}`);
    } else {
      showToast('Alert draft discarded');
    }
  };

  const confOffset = selectedAlert ? 131.95 - (selectedAlert.confidence / 100) * 131.95 : 6.6;

  return (
    <>
      <Sidebar
        activePage="alerts"
        onOpenDevices={() => setActiveModal('connectedDevices')}
        onOpenSyncScheduler={() => setActiveModal('settings')}
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
            onAlerts={() => showToast('You are viewing the live AI Alerts Center')}
            onProfile={() => setActiveModal('account')}
          />

          <div
            className="alerts-workspace-card"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "520px",
              padding: "24px",
              textAlign: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-dark)", marginBottom: "6px" }}>
                No alerts yet
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Alerts and incident notifications will appear here when triggered.
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
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Package Name / App ID
              </label>
              <input
                type="text"
                placeholder="e.g. com.samsung.westernflix or 1201739921"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '5px', outline: 'none', fontSize: '13px' }}
              />
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
        className={`modal-overlay${activeModal === 'settings' ? ' active' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">Settings &amp; Sync Scheduler</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>
              &times;
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>Auto-Sync Store Reviews</div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>Automatically fetch latest reviews every 15 minutes</div>
              </div>
              <input type="checkbox" defaultChecked aria-label="Auto-Sync Store Reviews" style={{ width: '16px', height: '16px', accentColor: 'var(--primary-green)', cursor: 'pointer' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', marginTop: '4px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>Session &amp; Security</div>
                <div style={{ fontSize: '11.5px', color: '#b91c1c' }}>Sign out of your current workspace session</div>
              </div>
              <button
                onClick={() => navigate('/')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
              >
                <span>Logout</span>
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button className="btn-action-outline" onClick={() => setActiveModal(null)}>
              Close
            </button>
            <button
              className="btn-action-solid"
              onClick={() => {
                setActiveModal(null);
                showToast('Settings saved');
              }}
            >
              Save Changes
            </button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary-green)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '15px' }}>
                YN
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>Don Carlos (Product Manager)</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>admin@reviews-analyzer.ai • Enterprise Plan</div>
              </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
            The AI Alerts Center monitors all 4 app stores in real time, detecting rating drops, crash clusters, and high-risk VIP reviews with ready-to-send AI responses.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button className="btn-action-solid" onClick={() => setActiveModal(null)}>
              Got It
            </button>
          </div>
        </div>
      </div>

      <div className={`toast-message${toastVisible ? ' show' : ''}`} id="toastMsg">
        {toastMsg}
      </div>
    </>
  );
}
