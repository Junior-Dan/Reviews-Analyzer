import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { SkeletonBox } from '../components/Skeleton';
import { usePageMeta } from '../hooks/usePageMeta';
import { authFetch } from '../utils/api';
import '../styles/integrations.css';

type IntegrationCategory = 'store' | 'messaging' | 'workflow' | 'analytics';
type StatusFilter = 'all' | 'connected' | 'available';
type IntegrationsModal =
  | 'addApp'
  | 'configInt'
  | 'detailsInt'
  | 'settings'
  | 'account'
  | 'teams'
  | 'connectedDevices'
  | 'helpCentre'
  | 'alerts'
  | null;

interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  category: IntegrationCategory;
  categoryLabel: string;
  syncMode: string;
  eventsSynced: number;
  connected: boolean;
  iconBg: string;
  iconSvg: string;
}

const INITIAL_INTEGRATIONS: IntegrationItem[] = [
  {
    id: 'int-1',
    name: 'Google Play',
    description: 'Connect Google Play Console to automatically ingest Android ratings, reviews, and developer replies.',
    endpoint: 'androidpublisher.googleapis.com/v3',
    category: 'store',
    categoryLabel: 'Store',
    syncMode: 'Real-time (15m)',
    eventsSynced: 42850,
    connected: true,
    iconBg: '#ffffff',
    iconSvg: `<svg width="24" height="24" viewBox="0 0 48 48"><defs><clipPath id="gpClip"><path d="M9 5.8 C9 3.6 11.4 2.2 13.3 3.3 L41.2 19.8 C43.1 20.9 43.1 23.7 41.2 24.8 L13.3 41.3 C11.4 42.4 9 41.0 9 38.8 Z"/></clipPath></defs><g clip-path="url(#gpClip)"><polygon fill="#0086F9" points="8,2 8,43 27.5,22.3"/><polygon fill="#00A94F" points="8,2 34.5,15.5 27.5,22.3"/><polygon fill="#FF3A44" points="8,43 34.5,29.1 27.5,22.3"/><polygon fill="#FFBD00" points="27.5,22.3 34.5,15.5 44,22.3 34.5,29.1"/></g></svg>`,
  },
  {
    id: 'int-2',
    name: 'App Store Connect',
    description: 'Integrate Apple App Store Connect to sync iOS and macOS customer reviews and version sentiment.',
    endpoint: 'api.appstoreconnect.apple.com/v1',
    category: 'store',
    categoryLabel: 'Store',
    syncMode: 'Real-time (15m)',
    eventsSynced: 38410,
    connected: true,
    iconBg: 'linear-gradient(180deg, #1FB6FF 0%, #0066CC 100%)',
    iconSvg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="4.5" x2="6.2" y2="18.5"/><line x1="12" y1="4.5" x2="17.8" y2="18.5"/><line x1="5.2" y1="14.8" x2="18.8" y2="14.8"/></svg>`,
  },
  {
    id: 'int-3',
    name: 'Samsung Galaxy Store',
    description: 'Connect your Samsung Seller Portal account to monitor Galaxy device reviews and store feedback.',
    endpoint: 'devapi.samsungapps.com/seller',
    category: 'store',
    categoryLabel: 'Store',
    syncMode: 'Real-time (15m)',
    eventsSynced: 14920,
    connected: true,
    iconBg: '#ffffff',
    iconSvg: `<svg width="24" height="24" viewBox="0 0 48 48"><defs><linearGradient id="samG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF3B8D"/><stop offset="50%" stop-color="#D92B7A"/><stop offset="100%" stop-color="#FF6B4A"/></linearGradient></defs><path fill="url(#samG)" d="M10 15h28l-2.4 23.2c-.3 2.7-2.6 4.8-5.3 4.8H17.7c-2.7 0-5-2.1-5.3-4.8L10 15z"/><path fill="none" stroke="#FF3B8D" stroke-width="3.4" stroke-linecap="round" d="M17.5 15V12.5a6.5 6.5 0 0 1 13 0V15"/><path fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" d="M18.5 23a5.5 5.5 0 0 0 11 0"/></svg>`,
  },
  {
    id: 'int-4',
    name: 'Amazon Appstore',
    description: 'Sync Fire OS and Amazon Appstore customer ratings directly into your unified sentiment workspace.',
    endpoint: 'developer.amazon.com/api/appstore',
    category: 'store',
    categoryLabel: 'Store',
    syncMode: 'Hourly Polling',
    eventsSynced: 9640,
    connected: true,
    iconBg: '#ffffff',
    iconSvg: `<svg width="32" height="32" viewBox="0 0 100 100"><text x="50" y="52" text-anchor="middle" fill="#0f1419" font-family="'Plus Jakarta Sans', 'Inter', Arial, sans-serif" font-size="33" font-weight="800" letter-spacing="-1.5">apps</text><path transform="translate(7, 0)" fill="#F38B1C" d="M80.5 72.8c-10.2 7.5-24.9 11.5-37.6 11.5-17.8 0-33.8-6.6-45.9-17.5-1-.9-.1-2 1.1-1.3 13.1 7.6 29.2 12.2 46 12.2 11.3 0 23.7-2.3 35.1-7.2 1.7-.7 3.2 1.1 1.3 2.3zm4.2-4.8c-1.3-1.6-8.6-.8-11.9-.4-1 .1-1.2-.7-.3-1.4 5.8-4.1 15.3-2.9 16.5-1.5 1.1 1.4-.3 10.9-5.7 15.5-.8.7-1.6.3-1.3-.6 1.2-3.1 4-9.9 2.7-11.6z"/></svg>`,
  },
  {
    id: 'int-5',
    name: 'Gmail',
    description: 'Integrate Gmail to send automated email alerts on rating drops, 1-star spikes, and weekly executive reports.',
    endpoint: 'gmail.googleapis.com/gmail/v1/users/me',
    category: 'messaging',
    categoryLabel: 'Messaging',
    syncMode: 'Instant SMTP / API',
    eventsSynced: 15420,
    connected: true,
    iconBg: '#ffffff',
    iconSvg: `<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#4285F4" d="M2 6.5V18c0 1.1.9 2 2 2h2V9.8l6 4.5 6-4.5V20h2c1.1 0 2-.9 2-2V6.5c0-1.8-2.1-2.8-3.5-1.7L12 10 5.5 4.8C4.1 3.7 2 4.7 2 6.5z"/><path fill="#34A853" d="M18 9.8V20h2c1.1 0 2-.9 2-2V6.8l-4 3z"/><path fill="#FBBC05" d="M18 4.8v5l4-3v-.3c0-1.8-2.1-2.8-3.5-1.7L18 4.8z"/><path fill="#EA4335" d="M6 9.8V4.8L12 9.5 18 4.8v5L12 14.3 6 9.8z"/><path fill="#C5221F" d="M2 6.5v.3l4 3v-5L5.5 4.8C4.1 3.7 2 4.7 2 6.5z"/></svg>`,
  },
  {
    id: 'int-6',
    name: 'Google Gemini AI',
    description: 'Connect Google Gemini API for automated sentiment scoring, bug/UX classification, and AI reply drafting.',
    endpoint: 'generativelanguage.googleapis.com/v1beta',
    category: 'analytics',
    categoryLabel: 'AI & Data',
    syncMode: 'Real-time Inference',
    eventsSynced: 96820,
    connected: true,
    iconBg: '#ffffff',
    iconSvg: `<svg width="23" height="23" viewBox="0 0 24 24"><defs><linearGradient id="gemGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1C7EFF"/><stop offset="52%" stop-color="#9B72CB"/><stop offset="100%" stop-color="#D96570"/></linearGradient></defs><path fill="url(#gemGrad)" d="M12 1.5C12 7.3 16.7 12 22.5 12 16.7 12 12 16.7 12 22.5 12 16.7 7.3 12 1.5 12 7.3 12 12 7.3 12 1.5z"/></svg>`,
  },
  {
    id: 'int-7',
    name: 'Slack',
    description: 'Connect Slack to stream real-time 1-star review alerts and human-in-the-loop reply approvals to channels.',
    endpoint: 'hooks.slack.com/services/T04reviews',
    category: 'messaging',
    categoryLabel: 'Messaging',
    syncMode: 'Instant Webhook',
    eventsSynced: 18340,
    connected: true,
    iconBg: '#ffffff',
    iconSvg: `<svg width="21" height="21" viewBox="0 0 24 24"><path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/><path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/><path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/><path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>`,
  },
  {
    id: 'int-8',
    name: 'Jira Software',
    description: 'Integrate Jira to convert AI-detected bug and performance reviews into prioritized engineering tickets.',
    endpoint: 'reviews-ai.atlassian.net/rest/api/3',
    category: 'workflow',
    categoryLabel: 'Workflow',
    syncMode: 'Bi-directional',
    eventsSynced: 6420,
    connected: true,
    iconBg: '#ffffff',
    iconSvg: `<svg width="21" height="21" viewBox="0 0 24 24"><path fill="#2684FF" d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84h-9.63z"/><path fill="#0052CC" d="M6.77 6.8a4.36 4.36 0 0 0 4.34 4.34h1.8v1.72a4.36 4.36 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.83-.83H6.77z"/><path fill="#0065FF" d="M2 11.6c0 2.4 1.95 4.34 4.35 4.35h1.78v1.72c.01 2.39 1.95 4.34 4.34 4.34v-9.57a.84.84 0 0 0-.84-.84H2z"/></svg>`,
  },
  {
    id: 'int-9',
    name: 'Linear',
    description: 'Integrate Linear to manage feature requests, track UI/UX feedback progress, and streamline your team.',
    endpoint: 'api.linear.app/graphql',
    category: 'workflow',
    categoryLabel: 'Workflow',
    syncMode: 'Bi-directional',
    eventsSynced: 5180,
    connected: true,
    iconBg: '#5E6AD2',
    iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff"><path d="M2.8 14.3a9.9 9.9 0 0 0 6.9 6.9L2.8 14.3zm-.7-3.4l9.8 9.8a10 10 0 0 0 2.2-.3L2.4 9.1c-.2.6-.3 1.2-.3 1.8zm1.1-4.1l13.6 13.6c.5-.3 1-.7 1.5-1.1L4.3 5.3c-.4.5-.8 1-1.1 1.5zM12 2a10 10 0 0 0-5.9 1.9l14 14A10 10 0 0 0 12 2z"/></svg>`,
  },
  {
    id: 'int-10',
    name: 'Google Sheets',
    description: 'Sync analyzed reviews, sentiment distributions, and weekly trend reports directly to Google Sheets.',
    endpoint: 'sheets.googleapis.com/v4/spreadsheets',
    category: 'analytics',
    categoryLabel: 'AI & Data',
    syncMode: 'Live Sheet Sync',
    eventsSynced: 31400,
    connected: true,
    iconBg: '#ffffff',
    iconSvg: `<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#0F9D58" d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path fill="#87CEAC" d="M14 2l6 6h-6V2z"/><rect x="7" y="11" width="10" height="7" rx="0.8" fill="none" stroke="#ffffff" stroke-width="1.6"/><line x1="7" y1="14.5" x2="17" y2="14.5" stroke="#ffffff" stroke-width="1.5"/><line x1="11.5" y1="11" x2="11.5" y2="18" stroke="#ffffff" stroke-width="1.5"/></svg>`,
  },
  {
    id: 'int-11',
    name: 'GitHub',
    description: 'Integrate GitHub to correlate app store crash reports with mobile repository releases and issues.',
    endpoint: 'api.github.com/repos/org/mobile-apps',
    category: 'workflow',
    categoryLabel: 'Workflow',
    syncMode: 'Event Trigger',
    eventsSynced: 3150,
    connected: true,
    iconBg: '#181717',
    iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.92.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.38-3.87-1.38-.52-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.02 11.02 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>`,
  },
  {
    id: 'int-12',
    name: 'Zendesk',
    description: 'Connect Zendesk Support to escalate critical customer complaints and track support ticket resolution.',
    endpoint: 'support.reviews-ai.zendesk.com/api/v2',
    category: 'workflow',
    categoryLabel: 'Workflow',
    syncMode: 'Instant Webhook',
    eventsSynced: 11290,
    connected: false,
    iconBg: '#03363D',
    iconSvg: `<svg width="19" height="19" viewBox="0 0 24 24" fill="#ffffff"><path d="M11.1 10.2V2.6H2v7.6c0 2.5 2 4.5 4.5 4.5s4.6-2 4.6-4.5zm0 3.6H2v7.6h9.1v-7.6zm10.9 0c0-2.5-2-4.5-4.5-4.5S13 11.3 13 13.8v7.6h9v-7.6zM13 2.6v7.6h9V2.6h-9z"/></svg>`,
  },
  {
    id: 'int-13',
    name: 'Microsoft Teams',
    description: 'Integrate Microsoft Teams to broadcast release health summaries and sentiment anomaly alerts.',
    endpoint: 'outlook.office.com/webhook/reviews-ai',
    category: 'messaging',
    categoryLabel: 'Messaging',
    syncMode: 'Instant Webhook',
    eventsSynced: 3890,
    connected: false,
    iconBg: '#ffffff',
    iconSvg: `<svg width="22" height="22" viewBox="0 0 24 24"><circle cx="16.5" cy="6.5" r="2.5" fill="#5059C9"/><path fill="#5059C9" d="M13.5 10h6a1.5 1.5 0 0 1 1.5 1.5v4.5a3 3 0 0 1-3 3h-1.5a3 3 0 0 1-3-3v-6z"/><circle cx="10.5" cy="5.5" r="2.5" fill="#7B83EB"/><rect x="2" y="6" width="12" height="12" rx="2" fill="#4B53BC"/><path fill="#ffffff" d="M5.5 9.5h5v1.4H8.8V15H7.2v-4.1H5.5V9.5z"/></svg>`,
  },
  {
    id: 'int-14',
    name: 'Ollama Local AI',
    description: 'Connect local Ollama LLM models for private on-device review sentiment analysis and topic clustering.',
    endpoint: 'localhost:11434/api/generate',
    category: 'analytics',
    categoryLabel: 'AI & Data',
    syncMode: 'Local Batch',
    eventsSynced: 12450,
    connected: false,
    iconBg: '#ffffff',
    iconSvg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7V4.5a1.5 1.5 0 0 1 3 0V6h2V4.5a1.5 1.5 0 0 1 3 0V7a4 4 0 0 1 2 3.5v6A3.5 3.5 0 0 1 14.5 20h-5A3.5 3.5 0 0 1 6 16.5v-6A4 4 0 0 1 8 7z"/><circle cx="10" cy="11.5" r="1" fill="#0f172a"/><circle cx="14" cy="11.5" r="1" fill="#0f172a"/><path d="M10.5 14.5c.8.6 2.2.6 3 0"/></svg>`,
  },
  {
    id: 'int-15',
    name: 'MongoDB Atlas',
    description: 'Primary cloud document database storing normalized multi-store reviews, AI insights, and reply audit logs.',
    endpoint: 'cluster0.reviews-analyzer.mongodb.net',
    category: 'analytics',
    categoryLabel: 'AI & Data',
    syncMode: 'Real-timeReplica',
    eventsSynced: 105820,
    connected: true,
    iconBg: '#001E2B',
    iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#00ED64" d="M12 2C9.2 5.4 7 8.8 7 13.2c0 3.8 2.4 6.5 4.5 7.6l.5 1.2.5-1.2c2.1-1.1 4.5-3.8 4.5-7.6C17 8.8 14.8 5.4 12 2z"/><path fill="#13AA52" d="M12 2v18.8l.5 1.2.5-1.2c2.1-1.1 4.5-3.8 4.5-7.6C17 8.8 14.8 5.4 12 2z"/></svg>`,
  },
];

export function IntegrationsPage() {
  usePageMeta('integrations', 'Integrations - Reviews Analyzer');
  const navigate = useNavigate();

  const [integrations, setIntegrations] = useState<IntegrationItem[]>(INITIAL_INTEGRATIONS);
  const [categoryFilter, setCategoryFilter] = useState<'all' | IntegrationCategory>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [activeModal, setActiveModal] = useState<IntegrationsModal>(null);
  const [selectedInt, setSelectedInt] = useState<IntegrationItem | null>(null);
  const [configEndpoint, setConfigEndpoint] = useState('');
  const [configApiKey, setConfigApiKey] = useState('');
  const [configServiceAccountJson, setConfigServiceAccountJson] = useState('');
  const [configKeyId, setConfigKeyId] = useState('');
  const [configIssuerId, setConfigIssuerId] = useState('');
  const [configPrivateKey, setConfigPrivateKey] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const STORE_PLATFORM_MAP: Record<string, string> = {
    'int-1': 'google',
    'int-2': 'apple',
    'int-3': 'samsung',
    'int-4': 'amazon',
  };

  // Add App & Teams & Devices
  const [newAppName, setNewAppName] = useState('');
  const [newAppPlatform, setNewAppPlatform] = useState('google');
  const [newAppId, setNewAppId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [devices, setDevices] = useState([
    { id: 's24', name: 'Samsung Galaxy S24 Ultra (QA Device)', meta: 'Android 14 • Google Play & Galaxy Store Push', iconBg: '#eff6ff', iconColor: '#2563eb', type: 'phone' },
    { id: 'tizen', name: 'Samsung Smart TV Tizen 8.0 Lab', meta: 'Tizen OS • Telemetry & Crash Log Bridge', iconBg: '#f5f3ff', iconColor: '#7c3aed', type: 'tv' },
  ]);

  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastVisible(false), 3000);
  };

  useEffect(() => {
    const t = window.setTimeout(() => {
      setLoading(false);
      setHasLoadedOnce(true);
    }, 2000);
    const closeMenus = () => {
      setOpenCardMenuId(null);
      setStatusDropdownOpen(false);
    };
    document.addEventListener('click', closeMenus);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('click', closeMenus);
    };
  }, []);

  const counts = useMemo(() => {
    const c = { all: integrations.length, store: 0, messaging: 0, workflow: 0, analytics: 0 };
    integrations.forEach((item) => {
      c[item.category]++;
    });
    return c;
  }, [integrations]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return integrations.filter((item) => {
      const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'connected' && item.connected) ||
        (statusFilter === 'available' && !item.connected);
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q);
      return matchesCat && matchesStatus && matchesQuery;
    });
  }, [integrations, categoryFilter, statusFilter, searchQuery]);

  useEffect(() => {
    authFetch('/api/integrations')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!Array.isArray(data?.integrations)) return;
        const byPlatform = new Map<string, { status?: string }>();
        data.integrations.forEach((entry: { platform?: string; status?: string }) => {
          if (entry.platform) byPlatform.set(entry.platform.toLowerCase(), entry);
        });
        setIntegrations((prev) =>
          prev.map((item) => {
            const plat = STORE_PLATFORM_MAP[item.id];
            if (!plat || !byPlatform.has(plat)) return item;
            const saved = byPlatform.get(plat);
            return { ...item, connected: saved?.status === 'Active' };
          })
        );
      })
      .catch(() => {});
  }, []);

  const handleCategoryChange = (cat: 'all' | IntegrationCategory) => {
    setCategoryFilter(cat);
    setLoading(true);
    window.setTimeout(() => setLoading(false), 2000);
  };

  const toggleIntegrationStatus = async (id: string) => {
    const target = integrations.find((item) => item.id === id);
    if (!target) return;
    const nextConnected = !target.connected;
    setIntegrations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, connected: nextConnected } : item))
    );

    const plat = STORE_PLATFORM_MAP[id];
    if (plat) {
      try {
        if (nextConnected) {
          await authFetch(`/api/integrations/${plat}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionName: target.name }),
          });
        } else {
          await authFetch(`/api/integrations/${plat}`, { method: 'DELETE' });
        }
      } catch {
        // ignore network errors
      }
    }
    showToast(`${target.name} ${nextConnected ? 'connected' : 'disconnected'}`);
  };

  const openConfigureIntegration = (item: IntegrationItem) => {
    setSelectedInt(item);
    setConfigEndpoint(`https://${item.endpoint}`);
    setConfigApiKey('');
    setConfigServiceAccountJson('');
    setConfigKeyId('');
    setConfigIssuerId('');
    setConfigPrivateKey('');
    setActiveModal('configInt');
  };

  const saveIntegrationConfig = async () => {
    if (!selectedInt) {
      setActiveModal(null);
      return;
    }
    const plat = STORE_PLATFORM_MAP[selectedInt.id];
    if (!plat) {
      setActiveModal(null);
      showToast('Integration configuration saved');
      return;
    }

    setSavingConfig(true);
    try {
      const payload: Record<string, string> = {
        connectionName: selectedInt.name,
        endpoint: configEndpoint.trim(),
      };
      if (plat === 'google' && configServiceAccountJson.trim()) {
        payload.serviceAccountJson = configServiceAccountJson.trim();
      } else if (plat === 'apple') {
        if (configKeyId.trim()) payload.keyId = configKeyId.trim();
        if (configIssuerId.trim()) payload.issuerId = configIssuerId.trim();
        if (configPrivateKey.trim()) payload.privateKey = configPrivateKey.trim();
      } else if (configApiKey.trim()) {
        payload.apiKey = configApiKey.trim();
      }

      const res = await authFetch(`/api/integrations/${plat}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Failed to save integration');
        return;
      }

      setIntegrations((prev) =>
        prev.map((item) => (item.id === selectedInt.id ? { ...item, connected: true } : item))
      );
      setActiveModal(null);
      showToast(data.message || `${selectedInt.name} connected`);
    } catch {
      showToast('Network error saving integration');
    } finally {
      setSavingConfig(false);
    }
  };

  const openIntegrationDetails = (item: IntegrationItem) => {
    setSelectedInt(item);
    setActiveModal('detailsInt');
  };

  const deleteIntegration = (item: IntegrationItem) => {
    setIntegrations((prev) => prev.filter((i) => i.id !== item.id));
    showToast(`Removed ${item.name}`);
  };

  const submitNewApp = async () => {
    const name = newAppName.trim();
    const appId = newAppId.trim();
    if (!name || !appId) {
      showToast('Please enter both App Title and Package ID');
      return;
    }
    try {
      await authFetch('/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, platform: newAppPlatform, appId }),
      });
    } catch {
      // ignore network error
    }
    setNewAppName('');
    setNewAppId('');
    setActiveModal(null);
    showToast(`Added "${name}" to Monitored Applications`);
  };

  const statusLabel =
    statusFilter === 'connected' ? 'Connected' : statusFilter === 'available' ? 'Disconnected' : 'All Status';

  return (
    <>
      <Sidebar
        activePage="integrations"
        onOpenDevices={() => setActiveModal('connectedDevices')}
        onOpenSyncScheduler={() => setActiveModal('settings')}
        onOpenProfile={() => setActiveModal('account')}
        onOpenTeams={() => setActiveModal('teams')}
        onOpenHelpCentre={() => setActiveModal('helpCentre')}
      />

      <main className="main-wrapper">
        <div className="canvas-container">
          <TopBar
            searchInputId="intSearchInput"
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onAddApp={() => setActiveModal('addApp')}
            onAlerts={() => setActiveModal('alerts')}
            onProfile={() => setActiveModal('account')}
          />

          <div className="page-scroll-body">
            <div className="apps-table-card" id="integrationsCatalogCard">
              <div className="integrations-header-row">
                <div className="integrations-page-title">Integrations</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="store-tabs" id="catFilterTabs">
                    {[
                      { key: 'all' as const, label: 'All', count: counts.all },
                      { key: 'store' as const, label: 'Stores', count: counts.store },
                      { key: 'messaging' as const, label: 'Messaging', count: counts.messaging },
                      { key: 'workflow' as const, label: 'Workflow', count: counts.workflow },
                      { key: 'analytics' as const, label: 'AI & Data', count: counts.analytics },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        className={`store-tab${categoryFilter === tab.key ? ' active' : ''}`}
                        onClick={() => handleCategoryChange(tab.key)}
                      >
                        <span>{tab.label}</span>
                        <span className="store-tab-count">{tab.count}</span>
                      </button>
                    ))}
                  </div>

                  <div className="toolbar-right">
                    <div className={`filter-chip-wrapper${statusDropdownOpen ? ' open' : ''}`} id="chipWrapStatus">
                      <div
                        className={`filter-chip${statusFilter !== 'all' ? ' active-filter' : ''}`}
                        id="chipBtnStatus"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenCardMenuId(null);
                          setStatusDropdownOpen((prev) => !prev);
                        }}
                      >
                        <svg className="chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="4" y1="6" x2="11" y2="6"></line>
                          <line x1="4" y1="12" x2="11" y2="12"></line>
                          <line x1="4" y1="18" x2="13" y2="18"></line>
                          <polyline points="15 15 18 18 21 15"></polyline>
                          <line x1="18" y1="6" x2="18" y2="18"></line>
                        </svg>
                        <span id="chipLabelStatus">{statusLabel}</span>
                        <svg className="chip-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                      <div className="filter-dropdown-menu" id="chipMenuStatus">
                        {[
                          { val: 'all' as const, label: 'All Status' },
                          { val: 'connected' as const, label: 'Connected' },
                          { val: 'available' as const, label: 'Disconnected' },
                        ].map((opt) => (
                          <div
                            key={opt.val}
                            className={`filter-menu-option${statusFilter === opt.val ? ' selected' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusFilter(opt.val);
                              setStatusDropdownOpen(false);
                            }}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div id="integrationsGridContainer">
                {loading && !hasLoadedOnce ? (
                  <div className="integrations-grid" aria-busy="true">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={`int-sk-${idx}`} className="int-card" aria-hidden="true">
                        <div className="int-card-body">
                          <div className="int-card-top">
                            <SkeletonBox width={44} height={44} borderRadius={12} style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <SkeletonBox width="55%" height={15} />
                              <SkeletonBox width="80%" height={12} />
                            </div>
                          </div>
                          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <SkeletonBox width={78} height={22} borderRadius={999} />
                            <SkeletonBox width={42} height={22} borderRadius={999} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : loading ? (
                  <div className="loader-cell-wrap">
                    <div className="circular-spinner"></div>
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b', fontSize: '13.5px' }}>
                    No matching integrations found.
                  </div>
                ) : (
                  <div className="integrations-grid">
                    {filtered.map((item) => (
                      <div key={item.id} className="int-card">
                        <div className="int-card-body">
                          <div className="int-card-top">
                            <div
                              className="int-logo-box"
                              style={{ background: item.iconBg }}
                              dangerouslySetInnerHTML={{ __html: item.iconSvg }}
                            />
                            <div
                              className={`int-more-wrap${openCardMenuId === item.id ? ' open' : ''}`}
                              id={`cardMenuWrap-${item.id}`}
                            >
                              <button
                                type="button"
                                className="int-more-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStatusDropdownOpen(false);
                                  setOpenCardMenuId((prev) => (prev === item.id ? null : item.id));
                                }}
                                title="More options"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="5" cy="12" r="1.8"></circle>
                                  <circle cx="12" cy="12" r="1.8"></circle>
                                  <circle cx="19" cy="12" r="1.8"></circle>
                                </svg>
                              </button>
                              <div className="int-more-menu">
                                <div
                                  className="int-more-item"
                                  onClick={() => {
                                    showToast(`Syncing ${item.name}...`);
                                    setOpenCardMenuId(null);
                                  }}
                                >
                                  Sync Now
                                </div>
                                <div
                                  className="int-more-item"
                                  onClick={() => {
                                    openConfigureIntegration(item);
                                    setOpenCardMenuId(null);
                                  }}
                                >
                                  Settings
                                </div>
                                <div
                                  className="int-more-item danger"
                                  onClick={() => {
                                    deleteIntegration(item);
                                    setOpenCardMenuId(null);
                                  }}
                                >
                                  Remove
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="int-card-title">{item.name}</div>
                          <div className="int-card-desc">{item.description}</div>
                        </div>
                        <div className="int-card-footer">
                          <div className="int-footer-actions">
                            <button
                              type="button"
                              className="btn-int-gear"
                              onClick={() => openConfigureIntegration(item)}
                              title={`Configure ${item.name}`}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="btn-int-details"
                              onClick={() => openIntegrationDetails(item)}
                            >
                              Details
                            </button>
                          </div>
                          <div
                            className={`conn-switch${item.connected ? ' connected' : ''}`}
                            onClick={() => toggleIntegrationStatus(item.id)}
                            title={item.connected ? 'Connected — click to disable' : 'Disconnected — click to enable'}
                          >
                            <div className="conn-switch-track">
                              <div className="conn-switch-thumb"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: TRACK NEW APPLICATION */}
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
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '5px', outline: 'none', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Store Platform
              </label>
              <select
                value={newAppPlatform}
                onChange={(e) => setNewAppPlatform(e.target.value)}
                aria-label="Select option"
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
                value={newAppId}
                onChange={(e) => setNewAppId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '5px', outline: 'none', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button className="btn-action-outline" onClick={() => setActiveModal(null)}>
                Cancel
              </button>
              <button className="btn-action-solid" onClick={submitNewApp}>
                Save &amp; Track
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: CONFIGURE INTEGRATION */}
      <div
        className={`modal-overlay${activeModal === 'configInt' ? ' active' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">
              {selectedInt ? `Configure ${selectedInt.name}` : 'Configure Integration'}
            </div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>
              &times;
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Webhook / Endpoint URL
              </label>
              <input
                type="text"
                value={configEndpoint}
                onChange={(e) => setConfigEndpoint(e.target.value)}
                aria-label="Input field"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '5px', outline: 'none', fontSize: '13px' }}
              />
            </div>
            {selectedInt?.id === 'int-1' ? (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Google Play Service Account JSON
                </label>
                <textarea
                  rows={5}
                  placeholder='{"type": "service_account", "client_email": "...", "private_key": "..."}'
                  value={configServiceAccountJson}
                  onChange={(e) => setConfigServiceAccountJson(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '5px', outline: 'none', fontSize: '12px', fontFamily: 'monospace', resize: 'vertical' }}
                />
              </div>
            ) : selectedInt?.id === 'int-2' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Key ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2X9R4HXF34"
                      value={configKeyId}
                      onChange={(e) => setConfigKeyId(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '5px', outline: 'none', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Issuer ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 57246542-96fe-..."
                      value={configIssuerId}
                      onChange={(e) => setConfigIssuerId(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '5px', outline: 'none', fontSize: '13px' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Private Key (.p8 PEM)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                    value={configPrivateKey}
                    onChange={(e) => setConfigPrivateKey(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '5px', outline: 'none', fontSize: '12px', fontFamily: 'monospace', resize: 'vertical' }}
                  />
                </div>
              </>
            ) : (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  API Key / Secret Token
                </label>
                <input
                  type="password"
                  placeholder="Paste API token or leave blank to keep existing"
                  value={configApiKey}
                  onChange={(e) => setConfigApiKey(e.target.value)}
                  aria-label="Input field"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '5px', outline: 'none', fontSize: '13px' }}
                />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button className="btn-action-outline" onClick={() => setActiveModal(null)}>
                Cancel
              </button>
              <button
                className="btn-action-solid"
                disabled={savingConfig}
                onClick={saveIntegrationConfig}
              >
                {savingConfig ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: INTEGRATION DETAILS */}
      <div
        className={`modal-overlay${activeModal === 'detailsInt' ? ' active' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">{selectedInt?.name || 'Integration Details'}</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>
              &times;
            </button>
          </div>
          {selectedInt && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.55, margin: 0 }}>{selectedInt.description}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                <div style={{ padding: '11px 13px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Category</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-dark)', marginTop: '3px' }}>
                    {selectedInt.categoryLabel}
                  </div>
                </div>
                <div style={{ padding: '11px 13px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sync Cadence</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-dark)', marginTop: '3px' }}>
                    {selectedInt.syncMode}
                  </div>
                </div>
                <div style={{ padding: '11px 13px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Events Synced</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-dark)', marginTop: '3px' }}>
                    {selectedInt.eventsSynced.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '11px 13px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Connection</div>
                  <div
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 700,
                      color: selectedInt.connected ? 'var(--primary-green)' : '#64748b',
                      marginTop: '3px',
                    }}
                  >
                    {selectedInt.connected ? 'Connected' : 'Disconnected'}
                  </div>
                </div>
              </div>
              <div style={{ padding: '11px 13px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Endpoint</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', marginTop: '3px', wordBreak: 'break-all' }}>
                  https://{selectedInt.endpoint}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button className="btn-action-outline" onClick={() => setActiveModal(null)}>
                  Close
                </button>
                <button
                  className="btn-action-solid"
                  onClick={() => {
                    setActiveModal(null);
                    showToast('Manual sync triggered');
                  }}
                >
                  Sync Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: SETTINGS */}
      <div
        className={`modal-overlay${activeModal === 'settings' ? ' active' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">Settings</div>
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
              <input type="checkbox" defaultChecked aria-label="Input field" style={{ width: '16px', height: '16px', accentColor: 'var(--primary-green)', cursor: 'pointer' }} />
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

      {/* MODAL: ACCOUNT */}
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

      {/* MODAL: TEAMS */}
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
                aria-label="Select option"
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

      {/* MODAL: CONNECTED DEVICES */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eef2ef', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                    MacBook Pro M3 Max{' '}
                    <span style={{ fontSize: '10.5px', color: '#166534', background: '#dcfce7', padding: '2px 7px', borderRadius: '999px', marginLeft: '5px' }}>
                      Current Session
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>macOS • Chrome • Active now</div>
                </div>
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#16a34a' }}>Online</span>
            </div>

            {devices.map((dev) => (
              <div
                key={dev.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: dev.iconBg, color: dev.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                      <line x1="12" y1="18" x2="12.01" y2="18"></line>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>{dev.name}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>{dev.meta}</div>
                  </div>
                </div>
                <button
                  className="btn-action-outline"
                  style={{ padding: '5px 11px', fontSize: '11.5px' }}
                  onClick={() => {
                    setDevices((prev) => prev.filter((d) => d.id !== dev.id));
                    showToast('Device session revoked');
                  }}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button className="btn-action-outline" onClick={() => setActiveModal(null)}>
              Close
            </button>
            <button
              className="btn-action-solid"
              onClick={() => {
                setActiveModal(null);
                showToast('Connected devices synced');
              }}
            >
              + Link New Device
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: HELP CENTRE & ALERTS */}
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
            Connect app stores, Slack, Microsoft Teams, Jira, Linear, and BI webhooks to route customer review intelligence directly into your team's workflow.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button className="btn-action-solid" onClick={() => setActiveModal(null)}>
              Got It
            </button>
          </div>
        </div>
      </div>

      <div
        className={`modal-overlay${activeModal === 'alerts' ? ' active' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">System &amp; Sentiment Alerts</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>
              &times;
            </button>
          </div>
          <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.55 }}>
            All connected store and webhook pipelines are healthy and operating within normal latency thresholds.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button className="btn-action-solid" onClick={() => setActiveModal(null)}>
              Done
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
