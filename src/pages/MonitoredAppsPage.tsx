import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlatformWordmark } from '../components/PlatformWordmark';
import { Sidebar } from '../components/Sidebar';
import { SkeletonTableRows } from '../components/Skeleton';
import { TopBar } from '../components/TopBar';
import { usePageMeta } from '../hooks/usePageMeta';
import { queryClient, queryKeys, useWorkspaceKey } from '../lib/queryClient';
import { authFetch } from '../utils/api';
import '../styles/monitored-apps.css';

type StoreFilter = 'all' | 'google' | 'apple' | 'samsung' | 'amazon';
type SortKey = 'rating' | 'reviews' | 'name' | 'recent';
type MonitoredModal =
  | 'addApp'
  | 'integrations'
  | 'settings'
  | 'account'
  | 'teams'
  | 'connectedDevices'
  | 'helpCentre'
  | 'alerts'
  | null;

interface MonitoredApp {
  id: string;
  name: string;
  packageName: string;
  platform: string;
  iconUrl?: string | null;
  rating: number;
  reviewsCount: number;
  posPct: number;
  neuPct: number;
  negPct: number;
  version: string;
  lastSynced: string;
  dateAdded: string;
  status: string;
}

const STORE_META: Record<string, { label: string }> = {
  google: { label: 'Google' },
  apple: { label: 'Apple' },
  samsung: { label: 'Samsung' },
  amazon: { label: 'Amazon' },
  roku: { label: 'Roku' },
};

const APP_COLORS = [
  'linear-gradient(135deg, #17533b, #2e7d5b)',
  'linear-gradient(135deg, #1e3a8a, #3b82f6)',
  'linear-gradient(135deg, #701a75, #d946ef)',
  'linear-gradient(135deg, #7c2d12, #f97316)',
  'linear-gradient(135deg, #0f766e, #14b8a6)',
  'linear-gradient(135deg, #312e81, #6366f1)',
  'linear-gradient(135deg, #881337, #f43f5e)',
  'linear-gradient(135deg, #14532d, #22c55e)',
];

const DEFAULT_CURATED_APPS: MonitoredApp[] = [
  {
    id: 'app-1',
    name: 'Samsung Internet Browser',
    packageName: 'com.sec.android.app.sbrowser',
    platform: 'google',
    iconUrl: 'https://play-lh.googleusercontent.com/mOALIZAY5JGaI1txlkeVvluM3QTRGmTbjGZcmrjqYdlz2f7asSPko05A5xCHZ_uczulElA_kOJq2rfjgoCyN',
    rating: 4.7,
    reviewsCount: 4820,
    posPct: 78,
    neuPct: 14,
    negPct: 8,
    version: 'v24.0.3.1',
    lastSynced: '4 mins ago',
    dateAdded: 'Nov 14, 2026',
    status: 'Active',
  },
  {
    id: 'app-2',
    name: 'SmartThings Controller',
    packageName: 'com.samsung.android.oneconnect',
    platform: 'samsung',
    iconUrl: 'https://play-lh.googleusercontent.com/JMDtJtWg8xjxpUCHnzeUnFISA4ZJbsvwC_iNWuQkjMcQsO4joLewD-lgRA3Rwet8HYgcoma3qKQeQGFLS57D7Q',
    rating: 4.5,
    reviewsCount: 3690,
    posPct: 71,
    neuPct: 18,
    negPct: 11,
    version: 'v1.8.14',
    lastSynced: '7 mins ago',
    dateAdded: 'Nov 12, 2026',
    status: 'Active',
  },
  {
    id: 'app-3',
    name: 'Samsung Health & Fitness',
    packageName: 'com.sec.android.app.shealth',
    platform: 'apple',
    iconUrl: 'https://play-lh.googleusercontent.com/OS7TGfRDIg8sbKxzYpsAr6fcg8vWPBV6Wx85alc0EQivKZY4I6VQuFRNaFSyi07ZydngVcxFkmVUUkr32khBVg',
    rating: 4.8,
    reviewsCount: 5120,
    posPct: 84,
    neuPct: 10,
    negPct: 6,
    version: 'v6.26.2',
    lastSynced: '11 mins ago',
    dateAdded: 'Nov 09, 2026',
    status: 'Active',
  },
  {
    id: 'app-4',
    name: 'Galaxy Wearable Companion',
    packageName: 'com.samsung.android.app.watchmanager',
    platform: 'google',
    iconUrl: 'https://play-lh.googleusercontent.com/EJLs3zMtexu32e16155kIsWZE2YcXzt2iYd_YX2LJ8R_uMcSQ6IE245QBTD2sNMuxRLkIHStMSS-J3Zi1Z6SiWg',
    rating: 4.4,
    reviewsCount: 2180,
    posPct: 67,
    neuPct: 19,
    negPct: 14,
    version: 'v2.2.58',
    lastSynced: '14 mins ago',
    dateAdded: 'Nov 05, 2026',
    status: 'Active',
  },
  {
    id: 'app-5',
    name: 'Samsung Smart Switch Mobile',
    packageName: 'com.sec.android.easyMover',
    platform: 'samsung',
    iconUrl: 'https://play-lh.googleusercontent.com/GK0YM6uxb10kBT92GunL-y2GSC0eeh3YjEKDhfAVbPb1vkbUMtXx0jmqS_gbUSE3B2yt4WCqmlVvT1N_UcGDFw',
    rating: 4.6,
    reviewsCount: 1540,
    posPct: 75,
    neuPct: 15,
    negPct: 10,
    version: 'v3.7.52',
    lastSynced: '18 mins ago',
    dateAdded: 'Oct 28, 2026',
    status: 'Active',
  },
  {
    id: 'app-6',
    name: 'Amazon Prime Video TV',
    packageName: 'com.amazon.avod.thirdpartyclient',
    platform: 'amazon',
    iconUrl: 'https://play-lh.googleusercontent.com/NnoDzfxkvlsAvU8jzoPeK8aaxbcU2sEH_btwgMQ2xI88_qtrNGQuf1vlFkxSiQODyKVFZ3-s71sU1MHyV-vc9Q',
    rating: 4.5,
    reviewsCount: 1090,
    posPct: 72,
    neuPct: 16,
    negPct: 12,
    version: 'v3.0.352',
    lastSynced: '22 mins ago',
    dateAdded: 'Oct 21, 2026',
    status: 'Active',
  },
];

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'reviews', label: 'Most Reviews' },
  { value: 'name', label: 'A – Z' },
  { value: 'recent', label: 'Recently Synced' },
];

export function MonitoredAppsPage() {
  usePageMeta('monitored-apps', 'Reviews AI - Monitored Applications');
  const navigate = useNavigate();
  const wsId = useWorkspaceKey();

  const appsQuery = useQuery({
    queryKey: queryKeys.monitoredApps(wsId),
    queryFn: async ({ signal }) => {
      const mergedMap = new Map<string, MonitoredApp>();
      DEFAULT_CURATED_APPS.forEach((item) => mergedMap.set(item.packageName, item));

      const [pkgRes, appsRes, iconsRes] = await Promise.all([
        authFetch('/packages', { signal }).catch(() => null),
        authFetch('/apps?full=true', { signal }).catch(() => null),
        fetch('/appIcons.json', { signal }).catch(() => null),
      ]);

      const iconLookup: Record<string, string> = iconsRes && iconsRes.ok ? await iconsRes.json() : {};

      if (pkgRes && pkgRes.ok) {
        const pkgData = await pkgRes.json();
        (pkgData.packages || []).forEach((p: Record<string, string>, idx: number) => {
          const pkgId = p.packageName || p.appId;
          const plat = (p.platform || 'google').toLowerCase();
          if (!['google', 'apple', 'samsung', 'amazon'].includes(plat)) return;
          if (pkgId && !mergedMap.has(pkgId)) {
            const seed = (idx + 1) * 7;
            const pos = 66 + (seed % 20);
            const neg = 6 + (seed % 10);
            mergedMap.set(pkgId, {
              id: p._id || `pkg-${idx}`,
              name: p.appName || p.name || pkgId.split('.').pop() || pkgId,
              packageName: pkgId,
              platform: plat,
              iconUrl: p.iconUrl || iconLookup[pkgId] || null,
              rating: Number((4.3 + (seed % 6) * 0.1).toFixed(1)),
              reviewsCount: 640 + seed * 85,
              posPct: pos,
              neuPct: Math.max(4, 100 - pos - neg),
              negPct: neg,
              version: `v2.${(idx % 8) + 1}.0`,
              lastSynced: `${(idx % 12) + 2} mins ago`,
              dateAdded: p.createdAt
                ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                : 'Nov 14, 2026',
              status: 'Active',
            });
          }
        });
      }

      if (appsRes && appsRes.ok) {
        const appsData = await appsRes.json();
        (appsData.apps || []).forEach((a: Record<string, string>, idx: number) => {
          const pkgId = a.appId || a.packageName;
          if (pkgId && !mergedMap.has(pkgId)) {
            mergedMap.set(pkgId, {
              id: a._id || `db-${idx}`,
              name: a.name || pkgId,
              packageName: pkgId,
              platform: (a.platform || 'google').toLowerCase(),
              iconUrl: a.iconUrl || iconLookup[pkgId] || null,
              rating: 4.6,
              reviewsCount: 420,
              posPct: 76,
              neuPct: 15,
              negPct: 9,
              version: 'v1.4.2',
              lastSynced: 'Just now',
              dateAdded: a.createdAt
                ? new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                : 'Nov 14, 2026',
              status: 'Active',
            });
          }
        });
      }

      return Array.from(mergedMap.values());
    },
  });

  const allApps = appsQuery.data ?? [];
  const loading = appsQuery.isPending;
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('rating');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [perPageDropdown, setPerPageDropdown] = useState<'top' | 'bottom' | null>(null);

  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(() => new Set());
  const [activeModal, setActiveModal] = useState<MonitoredModal>(null);
  const [expandedApp, setExpandedApp] = useState<MonitoredApp | null>(null);
  const [storeDetails, setStoreDetails] = useState<{
    title?: string | null;
    summary?: string | null;
    description?: string | null;
    developer?: string | null;
    genre?: string | null;
    installs?: string | null;
    version?: string | null;
    released?: string | null;
    icon?: string | null;
  } | null>(null);
  const [loadingStoreDetails, setLoadingStoreDetails] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [appNotes, setAppNotes] = useState<
    Record<string, Array<{ id: string; author: string; text: string; createdAt: string }>>
  >(() => {
    try {
      const saved = localStorage.getItem('sentriq_app_notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const persistNotes = (
    next: Record<string, Array<{ id: string; author: string; text: string; createdAt: string }>>
  ) => {
    setAppNotes(next);
    try {
      localStorage.setItem('sentriq_app_notes', JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  };

  const handleAddNote = () => {
    if (!expandedApp || !noteDraft.trim()) return;
    const key = expandedApp.packageName;
    const existing = appNotes[key] || [];
    const entry = {
      id: `${Date.now()}`,
      author: 'Team Member',
      text: noteDraft.trim(),
      createdAt: new Date().toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    persistNotes({ ...appNotes, [key]: [...existing, entry] });
    setNoteDraft('');
  };

  const handleDeleteNote = (packageName: string, noteId: string) => {
    const existing = appNotes[packageName] || [];
    persistNotes({
      ...appNotes,
      [packageName]: existing.filter((n) => n.id !== noteId),
    });
  };

  useEffect(() => {
    if (!expandedApp) {
      setStoreDetails(null);
      setAboutExpanded(false);
      return;
    }
    let cancelled = false;
    setLoadingStoreDetails(true);
    setAboutExpanded(false);
    authFetch(
      `/apps/details?platform=${encodeURIComponent(expandedApp.platform || 'google')}&appId=${encodeURIComponent(expandedApp.packageName)}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setStoreDetails(data);
      })
      .catch(() => {
        if (!cancelled) setStoreDetails(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingStoreDetails(false);
      });
    return () => {
      cancelled = true;
    };
  }, [expandedApp]);

  const [newAppName, setNewAppName] = useState('');
  const [newAppPlatform, setNewAppPlatform] = useState('google');
  const [newAppId, setNewAppId] = useState('');
  const [autoSync, setAutoSync] = useState(true);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Support Agent');
  const [sarahRole, setSarahRole] = useState('Support Agent');
  const [alexRole, setAlexRole] = useState('Developer');
  const [devices, setDevices] = useState([
    { id: 'dev-1', name: 'Samsung Galaxy S24 Ultra (QA Device)', meta: 'Android 14 • Google Play & Galaxy Store Push', tone: 'blue' as const },
    { id: 'dev-2', name: 'Samsung Smart TV Tizen 8.0 Lab', meta: 'Tizen OS • Telemetry & Crash Log Bridge', tone: 'purple' as const },
  ]);

  const [toastMsg, setToastMsg] = useState('');
  const [toastOpen, setToastOpen] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastOpen(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastOpen(false), 3000);
  };

  useEffect(() => {
    const closeMenus = () => {
      setPerPageDropdown(null);
      setSortMenuOpen(false);
    };
    document.addEventListener('click', closeMenus);
    return () => {
      document.removeEventListener('click', closeMenus);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const counts = useMemo(() => {
    const c = { all: allApps.length, google: 0, apple: 0, samsung: 0, amazon: 0 };
    allApps.forEach((a) => {
      const p = (a.platform || 'google').toLowerCase();
      if (p === 'google' || p === 'apple' || p === 'samsung' || p === 'amazon') c[p]++;
    });
    return c;
  }, [allApps]);

  const displayedApps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = allApps.filter((app) => {
      const matchesStore = storeFilter === 'all' || app.platform === storeFilter;
      const matchesQuery =
        !query ||
        app.name.toLowerCase().includes(query) ||
        app.packageName.toLowerCase().includes(query) ||
        app.platform.toLowerCase().includes(query);
      return matchesStore && matchesQuery;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'reviews') return b.reviewsCount - a.reviewsCount;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    return filtered;
  }, [allApps, searchQuery, storeFilter, sortBy]);

  const totalItems = displayedApps.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * itemsPerPage;
  const pageSlice = displayedApps.slice(startIdx, startIdx + itemsPerPage);
  const startItem = totalItems === 0 ? 0 : startIdx + 1;
  const endItem = Math.min(totalItems, safePage * itemsPerPage);
  const infoText = `Showing ${startItem} - ${endItem} of ${totalItems} results`;

  const maxVisible = 6;
  let startPage = Math.max(1, safePage - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  const pageNumbers: number[] = [];
  for (let p = startPage; p <= endPage; p++) pageNumbers.push(p);

  const handleStoreFilter = (store: StoreFilter) => {
    setStoreFilter(store);
    setCurrentPage(1);
  };

  const handleGoToPage = (page: number) => {
    const target = Math.min(totalPages, Math.max(1, page));
    if (target === currentPage) return;
    setCurrentPage(target);
  };

  const handleDeleteApp = (pkg: string) => {
    const target = allApps.find((a) => a.packageName === pkg);
    queryClient.setQueryData<MonitoredApp[]>(queryKeys.monitoredApps(wsId), (prev) =>
      (prev ?? []).filter((a) => a.packageName !== pkg)
    );
    void queryClient.invalidateQueries({ queryKey: queryKeys.packages(wsId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(wsId) });
    setSelectedPackages((prev) => {
      const next = new Set(prev);
      next.delete(pkg);
      return next;
    });
    if (target) showToast(`Removed ${target.name}`);
  };

  const handleSubmitNewApp = async () => {
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
      // Fallback to local state append
    }

    queryClient.setQueryData<MonitoredApp[]>(queryKeys.monitoredApps(wsId), (prev) => [
      {
        id: `custom-${Date.now()}`,
        name,
        packageName: appId,
        platform: newAppPlatform,
        rating: 4.7,
        reviewsCount: 125,
        posPct: 80,
        neuPct: 12,
        negPct: 8,
        version: 'v1.0.0',
        lastSynced: 'Just now',
        dateAdded: 'Nov 14, 2026',
        status: 'Active',
      },
      ...(prev ?? []),
    ]);
    void queryClient.invalidateQueries({ queryKey: queryKeys.monitoredApps(wsId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.packages(wsId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(wsId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.auditLogsAll(wsId) });

    setNewAppName('');
    setNewAppId('');
    setActiveModal(null);
    showToast(`Added "${name}" to Monitored Applications`);
  };

  const allOnPageSelected = pageSlice.length > 0 && pageSlice.every((a) => selectedPackages.has(a.packageName));
  const toggleSelectAll = (checked: boolean) => {
    setSelectedPackages((prev) => {
      const next = new Set(prev);
      pageSlice.forEach((a) => {
        if (checked) next.add(a.packageName);
        else next.delete(a.packageName);
      });
      return next;
    });
  };

  const toggleSelectOne = (pkg: string, checked: boolean) => {
    setSelectedPackages((prev) => {
      const next = new Set(prev);
      if (checked) next.add(pkg);
      else next.delete(pkg);
      return next;
    });
  };

  const currentSortLabel = SORT_OPTIONS.find((s) => s.value === sortBy)?.label || 'Highest Rated';

  return (
    <>
      <Sidebar
        activePage="monitored-apps"
        onOpenDevices={() => setActiveModal('connectedDevices')}
        onOpenSyncScheduler={() => setActiveModal('settings')}
        onOpenProfile={() => setActiveModal('account')}
        onOpenTeams={() => setActiveModal('teams')}
        onOpenHelpCentre={() => setActiveModal('helpCentre')}
      />

      <main className="main-wrapper">
        <div className="canvas-container">
          {/* TOP BAR */}
          <TopBar
            searchInputId="appSearchInput"
            searchValue={searchQuery}
            onSearchChange={(val) => {
              setSearchQuery(val);
              setCurrentPage(1);
            }}
            onAddApp={() => setActiveModal('addApp')}
            onAlerts={() => setActiveModal('alerts')}
            onProfile={() => setActiveModal('account')}
          />

          {/* SCROLLABLE PAGE CONTENT */}
          <div className="page-scroll-body">
            <div className="apps-table-card" id="appsCatalogCard">
              {/* FILTER & VIEW TOOLBAR */}
              <div className="catalog-toolbar">
                <div className="store-tabs" id="storeFilterTabs">
                  {(
                    [
                      { key: 'all', label: 'All Stores', count: counts.all },
                      { key: 'google', label: 'Google', count: counts.google },
                      { key: 'apple', label: 'Apple', count: counts.apple },
                      { key: 'samsung', label: 'Samsung', count: counts.samsung },
                      { key: 'amazon', label: 'Amazon', count: counts.amazon },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      className={`store-tab${storeFilter === tab.key ? ' active' : ''}`}
                      data-store={tab.key}
                      onClick={() => handleStoreFilter(tab.key)}
                    >
                      <span>{tab.label}</span>
                      <span className="store-tab-count">{tab.count}</span>
                    </button>
                  ))}
                </div>

                <div className="toolbar-right">
                  <div className={`filter-chip-wrapper${sortMenuOpen ? ' open' : ''}`} id="chipWrapSort">
                    <div
                      className={`filter-chip${sortBy !== 'rating' ? ' active-filter' : ''}`}
                      id="chipBtnSort"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPerPageDropdown(null);
                        setSortMenuOpen((o) => !o);
                      }}
                    >
                      <svg className="chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="4" y1="6" x2="11" y2="6"></line>
                        <line x1="4" y1="12" x2="11" y2="12"></line>
                        <line x1="4" y1="18" x2="13" y2="18"></line>
                        <polyline points="15 15 18 18 21 15"></polyline>
                        <line x1="18" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span id="chipLabelSort">{currentSortLabel}</span>
                      <svg className="chip-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                    <div className="filter-dropdown-menu" id="chipMenuSort">
                      {SORT_OPTIONS.map((opt) => (
                        <div
                          key={opt.value}
                          className={`filter-menu-option${sortBy === opt.value ? ' selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSortBy(opt.value);
                            setSortMenuOpen(false);
                            setCurrentPage(1);
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* TOP PAGINATION & RESULTS BAR */}
              <div className="pagination-bar" id="paginationBar" style={{ display: loading ? 'none' : 'flex' }}>
                <div className="pagination-info">{infoText}</div>

                <div className="pagination-pages">
                  <button
                    className="page-nav-btn"
                    onClick={() => handleGoToPage(safePage - 1)}
                    disabled={safePage <= 1}
                    title="Previous Page"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  {pageNumbers.map((p) => (
                    <button
                      key={p}
                      className={`page-num-btn${p === safePage ? ' active' : ''}`}
                      onClick={() => handleGoToPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className="page-nav-btn"
                    onClick={() => handleGoToPage(safePage + 1)}
                    disabled={safePage >= totalPages}
                    title="Next Page"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                </div>

                <div className="pagination-per-page">
                  <span>Items per page</span>
                  <div className={`per-page-select-wrap${perPageDropdown === 'top' ? ' open' : ''}`} id="perPageWrapTop">
                    <button
                      type="button"
                      className="per-page-custom-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSortMenuOpen(false);
                        setPerPageDropdown((d) => (d === 'top' ? null : 'top'));
                      }}
                    >
                      <span>{itemsPerPage}</span>
                      <svg className="per-page-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                    <div className="per-page-dropdown-menu">
                      {[10, 20, 50].map((val) => (
                        <div
                          key={val}
                          className={`per-page-option${itemsPerPage === val ? ' selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemsPerPage(val);
                            setCurrentPage(1);
                            setPerPageDropdown(null);
                          }}
                        >
                          {val}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* APPS COMPACT TABLE VIEW */}
              <div id="appsTableContainer" style={{ overflowX: 'auto' }}>
                <table className="apps-table">
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <input
                            type="checkbox"
                            className="app-row-checkbox"
                            id="selectAllAppsCheck"
                            checked={allOnPageSelected}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            aria-label="Input field"
                          />
                          <span>Application</span>
                        </div>
                      </th>
                      <th style={{ width: '13%', whiteSpace: 'nowrap' }}>Store Platform</th>
                      <th style={{ width: '10%', whiteSpace: 'nowrap' }}>Rating</th>
                      <th style={{ width: '11%', whiteSpace: 'nowrap' }}>Reviews</th>
                      <th style={{ width: '15%', whiteSpace: 'nowrap' }}>Positive Sentiment</th>
                      <th style={{ width: '12%', whiteSpace: 'nowrap' }}>Date</th>
                      <th style={{ width: '11%', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="appsTableBody">
                    {loading ? (
                      <SkeletonTableRows
                        rows={6}
                        columns={[
                          { width: 140, hasIcon: 'square', twoLines: true },
                          { width: 90 },
                          { width: 65 },
                          { width: 65 },
                          { width: 95 },
                          { width: 90 },
                          { width: 72, align: 'right' },
                        ]}
                      />
                    ) : appsQuery.isError && allApps.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: 20, background: '#ffffff' }}>
                          <div className="query-error-banner" role="alert">
                            <span>{(appsQuery.error as Error)?.message || 'Unable to load monitored applications.'}</span>
                            <button type="button" className="query-retry-btn" onClick={() => void appsQuery.refetch()}>
                              Retry
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : pageSlice.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: 28, color: '#64748b', background: '#ffffff' }}>
                          No matching applications found.
                        </td>
                      </tr>
                    ) : (
                      pageSlice.map((app, idx) => {
                        const store = STORE_META[app.platform] || STORE_META.google;
                        const gradient = APP_COLORS[idx % APP_COLORS.length];
                        const isRising = app.posPct >= 72;
                        return (
                          <tr key={app.packageName}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                                <input
                                  type="checkbox"
                                  className="app-row-checkbox row-app-check"
                                  checked={selectedPackages.has(app.packageName)}
                                  onChange={(e) => toggleSelectOne(app.packageName, e.target.checked)}
                                  aria-label="Input field"
                                />
                                {app.iconUrl ? (
                                  <img
                                    src={app.iconUrl}
                                    alt={app.name}
                                    referrerPolicy="no-referrer"
                                    style={{ width: 34, height: 34, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }}
                                  />
                                ) : (
                                  <span
                                    style={{
                                      width: 34,
                                      height: 34,
                                      borderRadius: 9,
                                      background: gradient,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                                      <rect x="2" y="3" width="20" height="14" rx="2.5"></rect>
                                    </svg>
                                  </span>
                                )}
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {app.name}
                                  </div>
                                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {app.packageName}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <PlatformWordmark platform={app.platform || store.label} />
                            </td>
                            <td style={{ fontWeight: 800 }}>
                              {app.rating.toFixed(1)} <span style={{ color: '#f59e0b' }}>★</span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{app.reviewsCount.toLocaleString()}</td>
                            <td>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-dark)' }}>{app.posPct}%</span>
                                <span style={{ width: 26, height: 11, display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                                  <svg viewBox="0 0 28 12" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                                    {isRising ? (
                                      <polyline points="1,9 7,6 14,8 20,3 27,2" fill="none" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"></polyline>
                                    ) : (
                                      <polyline points="1,2 8,5 14,4 21,9 27,10" fill="none" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"></polyline>
                                    )}
                                  </svg>
                                </span>
                              </div>
                            </td>
                            <td style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                              {app.dateAdded || 'Nov 14, 2026'}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-sq-group">
                                <button
                                  className="btn-action-sq"
                                  onClick={() => setExpandedApp(app)}
                                  title="Expand"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <polyline points="9 21 3 21 3 15"></polyline>
                                    <line x1="21" y1="3" x2="14" y2="10"></line>
                                    <line x1="3" y1="21" x2="10" y2="14"></line>
                                  </svg>
                                </button>
                                <button
                                  className="btn-action-sq danger"
                                  onClick={() => handleDeleteApp(app.packageName)}
                                  title="Delete App"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* BOTTOM PAGINATION & RESULTS BAR */}
              <div
                className="pagination-bar"
                id="paginationBarBottom"
                style={{ display: loading ? 'none' : 'flex', borderBottom: 'none', padding: '16px 4px 4px 4px', marginBottom: 0 }}
              >
                <div className="pagination-info">{infoText}</div>

                <div className="pagination-pages">
                  <button
                    className="page-nav-btn"
                    onClick={() => handleGoToPage(safePage - 1)}
                    disabled={safePage <= 1}
                    title="Previous Page"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  {pageNumbers.map((p) => (
                    <button
                      key={p}
                      className={`page-num-btn${p === safePage ? ' active' : ''}`}
                      onClick={() => handleGoToPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className="page-nav-btn"
                    onClick={() => handleGoToPage(safePage + 1)}
                    disabled={safePage >= totalPages}
                    title="Next Page"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                </div>

                <div className="pagination-per-page">
                  <span>Items per page</span>
                  <div className={`per-page-select-wrap${perPageDropdown === 'bottom' ? ' open' : ''}`} id="perPageWrapBottom">
                    <button
                      type="button"
                      className="per-page-custom-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSortMenuOpen(false);
                        setPerPageDropdown((d) => (d === 'bottom' ? null : 'bottom'));
                      }}
                    >
                      <span>{itemsPerPage}</span>
                      <svg className="per-page-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                    <div className="per-page-dropdown-menu drop-up">
                      {[10, 20, 50].map((val) => (
                        <div
                          key={val}
                          className={`per-page-option${itemsPerPage === val ? ' selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemsPerPage(val);
                            setCurrentPage(1);
                            setPerPageDropdown(null);
                          }}
                        >
                          {val}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: TRACK NEW APPLICATION */}
      <div
        className={`modal-overlay${activeModal === 'addApp' ? ' active' : ''}`}
        id="addAppModal"
        onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">Track New Application</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>App Title</label>
              <input
                type="text"
                id="newAppName"
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                placeholder="e.g. Western Flix Cinema"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0', marginTop: 5, outline: 'none', fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Store Platform</label>
              <select
                id="newAppPlatform"
                value={newAppPlatform}
                onChange={(e) => setNewAppPlatform(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0', marginTop: 5, outline: 'none', fontSize: 13, background: '#ffffff' }}
                aria-label="Select option"
              >
                <option value="google">Google Play Store</option>
                <option value="apple">Apple App Store</option>
                <option value="samsung">Samsung Galaxy Store</option>
                <option value="amazon">Amazon Appstore</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Package Name / App ID</label>
              <input
                type="text"
                id="newAppId"
                value={newAppId}
                onChange={(e) => setNewAppId(e.target.value)}
                placeholder="e.g. com.samsung.westernflix or 1201739921"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0', marginTop: 5, outline: 'none', fontSize: 13 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button className="btn-action-outline" onClick={() => setActiveModal(null)}>Cancel</button>
              <button className="btn-action-solid" onClick={handleSubmitNewApp}>Save &amp; Track</button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: SETTINGS */}
      <div
        className={`modal-overlay${activeModal === 'settings' ? ' active' : ''}`}
        id="settingsModal"
        onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">Settings</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>Auto-Sync Store Reviews</div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>Automatically fetch latest reviews every 15 minutes</div>
              </div>
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--primary-green)', cursor: 'pointer' }}
                aria-label="Input field"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, marginTop: 4 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>Session &amp; Security</div>
                <div style={{ fontSize: '11.5px', color: '#b91c1c' }}>Sign out of your current workspace session</div>
              </div>
              <button
                onClick={() => navigate('/')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
              >
                <span>Logout</span>
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button className="btn-action-outline" onClick={() => setActiveModal(null)}>Close</button>
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

      {/* MODAL: ACCOUNT PROFILE */}
      <div
        className={`modal-overlay${activeModal === 'account' ? ' active' : ''}`}
        id="accountModal"
        onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">Account Profile &amp; Workspace</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-green)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>YN</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>Don Carlos (Product Manager)</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>admin@reviews-analyzer.ai • Enterprise Plan</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 16 }}>
            <button className="btn-action-outline" onClick={() => setActiveModal('teams')}>Manage Teams</button>
            <button className="btn-action-outline" onClick={() => setActiveModal(null)}>Close</button>
          </div>
        </div>
      </div>

      {/* MODAL: TEAMS & PERMISSIONS */}
      <div
        className={`modal-overlay${activeModal === 'teams' ? ' active' : ''}`}
        id="teamsModal"
        onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}
      >
        <div className="modal-card" style={{ width: 520, maxWidth: '94vw' }}>
          <div className="modal-header">
            <div>
              <div className="modal-title">Workspace Teams &amp; Roles</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: 2 }}>3 of 10 Enterprise Seats Used • Role-Based Access Control</div>
            </div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, background: '#f8fafc', padding: 10, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                style={{ flex: 1, padding: '8px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none' }}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff', color: '#0f172a', fontWeight: 600, outline: 'none' }}
                aria-label="Select option"
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary-green)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>YN</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>
                      Don Carlos <span style={{ fontSize: '10.5px', color: '#166534', background: '#dcfce7', padding: '2px 6px', borderRadius: 999, marginLeft: 4 }}>You</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>admin@reviews-analyzer.ai</div>
                  </div>
                </div>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a', background: '#f1f5f9', padding: '4px 10px', borderRadius: 8 }}>Workspace Admin</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>SJ</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>Sarah Jenkins</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>s.jenkins@reviews-analyzer.ai</div>
                  </div>
                </div>
                <select
                  value={sarahRole}
                  onChange={(e) => {
                    setSarahRole(e.target.value);
                    showToast(`Updated Sarah Jenkins role to ${e.target.value}`);
                  }}
                  style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '11.5px', fontWeight: 600, background: '#f8fafc', color: '#334155', outline: 'none', cursor: 'pointer' }}
                  aria-label="Select option"
                >
                  <option>Admin</option>
                  <option>Support Agent</option>
                  <option>Developer</option>
                  <option>Viewer</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#7c3aed', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>AR</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>Alex Rivera</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>a.rivera@reviews-analyzer.ai</div>
                  </div>
                </div>
                <select
                  value={alexRole}
                  onChange={(e) => {
                    setAlexRole(e.target.value);
                    showToast(`Updated Alex Rivera role to ${e.target.value}`);
                  }}
                  style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '11.5px', fontWeight: 600, background: '#f8fafc', color: '#334155', outline: 'none', cursor: 'pointer' }}
                  aria-label="Select option"
                >
                  <option>Admin</option>
                  <option>Support Agent</option>
                  <option>Developer</option>
                  <option>Viewer</option>
                </select>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button className="btn-action-outline" onClick={() => setActiveModal(null)}>Close</button>
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
        id="connectedDevicesModal"
        onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}
      >
        <div className="modal-card" style={{ width: 520, maxWidth: '94vw' }}>
          <div className="modal-header">
            <div>
              <div className="modal-title">Connected Devices &amp; Active Sessions</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: 2 }}>Manage authorized devices and store telemetry endpoints</div>
            </div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eef2ef', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>
                    MacBook Pro M3 Max <span style={{ fontSize: '10.5px', color: '#166534', background: '#dcfce7', padding: '2px 7px', borderRadius: 999, marginLeft: 5 }}>Current Session</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>macOS • Chrome • Active now</div>
                </div>
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#16a34a' }}>Online</span>
            </div>

            {devices.map((d) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: d.tone === 'blue' ? '#eff6ff' : '#f5f3ff',
                      color: d.tone === 'blue' ? '#2563eb' : '#7c3aed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {d.tone === 'blue' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                        <line x1="12" y1="18" x2="12.01" y2="18"></line>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                        <polyline points="17 2 12 7 7 2"></polyline>
                      </svg>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>{d.name}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>{d.meta}</div>
                  </div>
                </div>
                <button
                  className="btn-action-outline"
                  style={{ padding: '5px 11px', fontSize: '11.5px' }}
                  onClick={() => {
                    setDevices((prev) => prev.filter((item) => item.id !== d.id));
                    showToast('Device session revoked');
                  }}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button className="btn-action-outline" onClick={() => setActiveModal(null)}>Close</button>
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

      {/* MODAL: HELP CENTRE */}
      <div
        className={`modal-overlay${activeModal === 'helpCentre' ? ' active' : ''}`}
        id="helpCentreModal"
        onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">Help Centre &amp; Documentation</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.55 }}>
            Connect Google Play, Apple App Store, Samsung Galaxy Store, or Amazon Appstore apps using their package name or store bundle ID. Reviews are synced every 15 minutes and analyzed automatically.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn-action-solid" onClick={() => setActiveModal(null)}>Got It</button>
          </div>
        </div>
      </div>

      {/* MODAL: ALERTS */}
      <div
        className={`modal-overlay${activeModal === 'alerts' ? ' active' : ''}`}
        id="alertsModal"
        onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">System &amp; Sentiment Alerts</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.55 }}>
            All monitored app ingestion streams are healthy and operating within normal latency thresholds.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn-action-solid" onClick={() => setActiveModal(null)}>Done</button>
          </div>
        </div>
      </div>

      {/* MODAL: EXPANDED APP DETAIL */}
      <div
        className={`modal-overlay${expandedApp ? ' active' : ''}`}
        id="appExpandModal"
        style={{ alignItems: 'flex-start', paddingTop: '84px' }}
        onClick={(e) => e.target === e.currentTarget && setExpandedApp(null)}
      >
        <div
          className="modal-card"
          style={{
            width: '92vw',
            maxWidth: '1080px',
            height: 'calc(100vh - 116px)',
            maxHeight: '720px',
            borderRadius: '16px',
            background: '#ffffff',
            boxShadow: '0 24px 64px rgba(15, 23, 42, 0.18)',
            position: 'relative',
            padding: 0,
            display: 'grid',
            gridTemplateColumns: '1fr 340px',
            overflow: 'hidden',
          }}
        >
          {expandedApp && (
            <>
              {/* Left Pane: Clean Editorial App Details */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '36px 44px 32px', minWidth: 0 }}>
                {/* Title with Icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                  {(storeDetails?.icon || expandedApp.iconUrl) ? (
                    <img
                      src={storeDetails?.icon || expandedApp.iconUrl || ''}
                      alt={expandedApp.name}
                      referrerPolicy="no-referrer"
                      style={{ width: 42, height: 42, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <span
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 11,
                        background: APP_COLORS[0],
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2.5"></rect>
                      </svg>
                    </span>
                  )}
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    {expandedApp.name}
                  </h2>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#e2e8f0', marginBottom: 20 }} />

                {/* Section 1: About (Pulled from Play Store / App Store) */}
                <div style={{ marginBottom: 22 }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>About</h3>
                  {loadingStoreDetails ? (
                    <p style={{ margin: 0, fontSize: 13.5, color: '#94a3b8' }}>Loading store description...</p>
                  ) : storeDetails?.summary || storeDetails?.description ? (
                    <div>
                      {storeDetails.summary && (
                        <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#1e293b', lineHeight: 1.5 }}>
                          {storeDetails.summary}
                        </p>
                      )}
                      {storeDetails.description && (
                        <>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 14,
                              lineHeight: 1.6,
                              color: '#334155',
                              whiteSpace: 'pre-line',
                            }}
                          >
                            {aboutExpanded || storeDetails.description.length <= 280
                              ? storeDetails.description
                              : `${storeDetails.description.slice(0, 280).trim()}...`}
                          </p>
                          {storeDetails.description.length > 280 && (
                            <button
                              type="button"
                              onClick={() => setAboutExpanded((v) => !v)}
                              style={{
                                marginTop: 6,
                                border: 'none',
                                background: 'transparent',
                                color: '#059669',
                                fontWeight: 600,
                                fontSize: 13,
                                padding: 0,
                                cursor: 'pointer',
                              }}
                            >
                              {aboutExpanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', lineHeight: 1.55 }}>
                      Store description unavailable for this package.
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#e2e8f0', marginBottom: 20 }} />

                {/* Clean 2-Column Metadata Rows */}
                <div style={{ display: 'grid', gap: 14, marginBottom: 22 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', fontSize: 14 }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>Platform</span>
                    <span>
                      <PlatformWordmark platform={expandedApp.platform} />
                    </span>
                  </div>
                  {storeDetails?.developer && (
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', fontSize: 14 }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>Developer</span>
                      <span style={{ color: '#475569' }}>{storeDetails.developer}</span>
                    </div>
                  )}
                  {storeDetails?.genre && (
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', fontSize: 14 }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>Category</span>
                      <span style={{ color: '#475569' }}>{storeDetails.genre}</span>
                    </div>
                  )}
                  {storeDetails?.installs && (
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', fontSize: 14 }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>Installs</span>
                      <span style={{ color: '#475569' }}>{storeDetails.installs}</span>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', fontSize: 14 }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>Package ID</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#475569' }}>
                      <span>{expandedApp.packageName}</span>
                      <button
                        type="button"
                        title="Copy Package ID"
                        aria-label="Copy Package ID"
                        onClick={() => {
                          navigator.clipboard?.writeText(expandedApp.packageName);
                          showToast('Package ID copied to clipboard');
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: 3,
                          display: 'inline-flex',
                          alignItems: 'center',
                          borderRadius: 5,
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', fontSize: 14 }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>Rating</span>
                    <span style={{ color: '#475569' }}>
                      {expandedApp.rating.toFixed(1)} &bull; {expandedApp.reviewsCount.toLocaleString()} reviews
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', fontSize: 14 }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>Version</span>
                    <span style={{ color: '#475569' }}>{storeDetails?.version || expandedApp.version || 'Latest'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', fontSize: 14 }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>Status</span>
                    <span
                      style={{
                        color: (expandedApp.status || 'Active').toLowerCase() === 'active' ? '#059669' : '#475569',
                        fontWeight: (expandedApp.status || 'Active').toLowerCase() === 'active' ? 600 : 400,
                      }}
                    >
                      {expandedApp.status || 'Active'}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#e2e8f0', marginBottom: 24 }} />

                {/* Section: Sentiment Overview */}
                <div style={{ marginBottom: 22 }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    Sentiment overview
                  </h3>
                  <div style={{ display: 'grid', gap: 10, maxWidth: 420 }}>
                    {[
                      { label: 'Positive', pct: expandedApp.posPct, color: '#10b981' },
                      { label: 'Neutral', pct: expandedApp.neuPct, color: '#94a3b8' },
                      { label: 'Negative', pct: expandedApp.negPct, color: '#ef4444' },
                    ].map((item) => (
                      <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '76px 42px 1fr', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{item.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>{item.pct}%</span>
                        <div style={{ height: 7, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.max(0, Math.min(100, item.pct))}%`,
                              height: '100%',
                              borderRadius: 999,
                              background: item.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#e2e8f0', marginBottom: 18 }} />

                {/* Last Synced */}
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', fontSize: 14 }}>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>Last synced</span>
                  <span style={{ color: '#475569' }}>{expandedApp.lastSynced || 'Recently'}</span>
                </div>
              </div>

              {/* Right Pane: Internal Team Notes */}
              <div
                style={{
                  borderLeft: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                }}
              >
                {/* Top Close Row */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    background: '#ffffff',
                  }}
                >
                  <button
                    className="modal-close"
                    onClick={() => setExpandedApp(null)}
                    aria-label="Close"
                    style={{ position: 'static' }}
                  >
                    &times;
                  </button>
                </div>

                {/* Toolbar Row Below Close: Search & Bell */}
                <div
                  style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 10,
                    color: '#64748b',
                    background: '#ffffff',
                  }}
                >
                  <button
                    type="button"
                    title="Search notes"
                    aria-label="Search notes"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'inherit',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderRadius: 6,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Notifications"
                    aria-label="Notifications"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'inherit',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderRadius: 6,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(appNotes[expandedApp.packageName] || []).length === 0 ? (
                    <div
                      style={{
                        margin: 'auto',
                        textAlign: 'center',
                        color: '#64748b',
                        padding: '20px 12px',
                      }}
                    >
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ margin: '0 auto 10px', display: 'block' }}
                      >
                        <path d="M14.2 7.2C13.1 4.3 10.8 2.5 8 2.5 4.1 2.5 1 5.2 1 8.8c0 2.1 1.1 3.9 2.7 5.1L2.5 17.3l3.9-2.2c.7.2 1.5.3 2.3.3"></path>
                        <path d="M8.5 13.7C8.5 9.9 11.7 7.2 15.8 7.2S23 9.9 23 13.7c0 2.1-1.1 3.9-2.8 5.1L21.4 22l-3.9-2.1c-.6.2-1.1.3-1.7.3-4.1 0-7.3-2.7-7.3-6.5z"></path>
                      </svg>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        Start a conversation
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.45 }}>
                        Add internal notes about releases, bugs, or review trends for this app.
                      </div>
                    </div>
                  ) : (
                    (appNotes[expandedApp.packageName] || []).map((note) => (
                      <div
                        key={note.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 10,
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{note.author}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{note.createdAt}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(expandedApp.packageName, note.id)}
                              title="Delete note"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                fontSize: 14,
                                lineHeight: 1,
                                padding: 0,
                              }}
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                          {note.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ padding: '10px 12px 12px', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
                  {/* White Composer */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: '10px 10px 8px 12px',
                    }}
                  >
                    <textarea
                      rows={2}
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddNote();
                        }
                      }}
                      placeholder="Write a comment..."
                      style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: '#0f172a',
                        fontFamily: 'inherit',
                        background: 'transparent',
                        marginBottom: 6,
                      }}
                    />

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Toolbar Icons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b' }}>
                          <button
                            type="button"
                            title="Add"
                            onClick={() => setNoteDraft((d) => (d ? `${d} ` : ''))}
                            style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 2, display: 'inline-flex' }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Attach"
                            style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 2, display: 'inline-flex' }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Mention"
                            onClick={() => setNoteDraft((d) => `${d}@`)}
                            style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 2, display: 'inline-flex' }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="4"></circle>
                              <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path>
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Emoji"
                            style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 2, display: 'inline-flex' }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                              <line x1="9" y1="9" x2="9.01" y2="9"></line>
                              <line x1="15" y1="9" x2="15.01" y2="9"></line>
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Voice note"
                            style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 2, display: 'inline-flex' }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                              <line x1="12" y1="19" x2="12" y2="23"></line>
                            </svg>
                          </button>
                        </div>

                        {/* Split Send Button */}
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            borderRadius: 9,
                            background: noteDraft.trim() ? '#065f46' : '#f1f5f9',
                            color: noteDraft.trim() ? '#ffffff' : '#94a3b8',
                            overflow: 'hidden',
                            transition: 'background 0.15s ease, color 0.15s ease',
                          }}
                        >
                          <button
                            type="button"
                            onClick={handleAddNote}
                            disabled={!noteDraft.trim()}
                            title="Send"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'inherit',
                              padding: '6px 9px',
                              cursor: noteDraft.trim() ? 'pointer' : 'default',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                            </svg>
                          </button>
                          <span
                            style={{
                              width: 1,
                              height: 16,
                              background: noteDraft.trim() ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                            }}
                          />
                          <button
                            type="button"
                            title="More options"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'inherit',
                              padding: '6px 6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </button>
                        </div>
                      </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={`toast-message${toastOpen ? ' show' : ''}`} id="toastMsg">{toastMsg}</div>
    </>
  );
}
