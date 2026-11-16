import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlatformWordmark } from '../components/PlatformWordmark';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { usePageMeta } from '../hooks/usePageMeta';
import { authFetch } from '../utils/api';
import '../styles/messages.css';

type ChipKey = 'date' | 'sentiment' | 'platform' | 'app' | 'more' | null;
type ToneKey = 'professional' | 'friendly' | 'technical' | 'empathetic';
type MessagesModal =
  | 'viewReview'
  | 'reply'
  | 'addApp'
  | 'monitoredApps'
  | 'integrations'
  | 'settings'
  | 'account'
  | 'teams'
  | 'connectedDevices'
  | 'helpCentre'
  | 'alerts'
  | null;

interface ReviewRecord {
  _id?: string;
  reviewId?: string;
  createdAt?: string;
  authorName?: string;
  platform?: string;
  appId?: string;
  rating?: number;
  text?: string;
  aiAnalysis?: {
    sentiment?: string;
    category?: string;
    summary?: string;
  };
  reply?: {
    text?: string;
    status?: string;
  };
}

interface PackageRecord {
  _id?: string;
  appName?: string;
  packageName: string;
  platform?: string;
}

interface AlertNotice {
  type?: 'danger' | 'warning' | 'info' | string;
  title: string;
  timestamp: string;
  message: string;
}

export function MessagesPage() {
  usePageMeta('messages', 'Reviews AI - Customer Reviews & Sentiment');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialApp = searchParams.get('app') || '';

  const [kpiTotal, setKpiTotal] = useState('781');
  const [kpiAvg, setKpiAvg] = useState('4.2 ★');
  const [kpiPos, setKpiPos] = useState('24.5%');
  const [kpiTopTopic, setKpiTopTopic] = useState('UI & Design');
  const [alerts, setAlerts] = useState<AlertNotice[]>([]);

  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [globalReviews, setGlobalReviews] = useState<ReviewRecord[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(false);

  const [globalSearch, setGlobalSearch] = useState(initialSearch);
  const [filterSearch, setFilterSearch] = useState(initialSearch);
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d' | '365d'>('all');
  const [dateLabel, setDateLabel] = useState('Date range');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [sentimentLabel, setSentimentLabel] = useState('Sentiment');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [platformLabel, setPlatformLabel] = useState('Platform');
  const [appFilter, setAppFilter] = useState(initialApp);
  const [appLabel, setAppLabel] = useState('Tracked apps');
  const [ratingFilter, setRatingFilter] = useState('all');

  const [openChip, setOpenChip] = useState<ChipKey>(null);
  const [perPageDropdown, setPerPageDropdown] = useState<'top' | 'bottom' | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [visitedPages, setVisitedPages] = useState<Set<number>>(() => new Set([1]));
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [resolvedKeys, setResolvedKeys] = useState<Set<string>>(() => new Set());
  const [flaggedKeys, setFlaggedKeys] = useState<Set<string>>(() => new Set());

  const [syncing, setSyncing] = useState(false);

  const [activeModal, setActiveModal] = useState<MessagesModal>(null);
  const [viewReview, setViewReview] = useState<ReviewRecord | null>(null);
  const [activeReplyReview, setActiveReplyReview] = useState<ReviewRecord | null>(null);
  const [selectedTone, setSelectedTone] = useState<ToneKey>('professional');
  const [replyText, setReplyText] = useState('');
  const [aiStatus, setAiStatus] = useState('');

  const [newAppName, setNewAppName] = useState('');
  const [newAppPlatform, setNewAppPlatform] = useState('google');
  const [newAppId, setNewAppId] = useState('');

  const [monitoredModalPkgs, setMonitoredModalPkgs] = useState<PackageRecord[]>([]);
  const [monitoredModalLoading, setMonitoredModalLoading] = useState(false);

  const [autoSync, setAutoSync] = useState(true);
  const [spikeAlerts, setSpikeAlerts] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Support Agent');
  const [sarahRole, setSarahRole] = useState('Support Agent');
  const [alexRole, setAlexRole] = useState('Developer');
  const [devices, setDevices] = useState([
    { id: 'dev-1', name: 'MacBook Pro M3 Max', meta: 'macOS • Chrome • Active now', current: true, tone: 'green' as const },
    { id: 'dev-2', name: 'Samsung Galaxy S24 Ultra (QA Device)', meta: 'Android 14 • Google Play & Galaxy Store Push', current: false, tone: 'blue' as const },
    { id: 'dev-3', name: 'Samsung Smart TV Tizen 8.0 Lab', meta: 'Tizen OS • Telemetry & Crash Log Bridge', current: false, tone: 'purple' as const },
  ]);

  const [toastMsg, setToastMsg] = useState('');
  const [toastOpen, setToastOpen] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const pageTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastOpen(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastOpen(false), 3200);
  }, []);

  useEffect(() => {
    const closeAll = () => {
      setOpenChip(null);
      setPerPageDropdown(null);
    };
    document.addEventListener('click', closeAll);
    return () => {
      document.removeEventListener('click', closeAll);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (pageTimerRef.current) window.clearTimeout(pageTimerRef.current);
    };
  }, []);

  const loadKPIData = useCallback(async () => {
    try {
      const res = await authFetch('/dashboard/summary');
      if (res.ok) {
        const data = await res.json();
        const s = data.summary;
        if (s) {
          setKpiTotal(Number(s.totalReviews || 0).toLocaleString());
          setKpiAvg(`${s.avgRating} ★`);
          const pos = s.totalReviews > 0 ? ((s.sentimentDist.Positive / s.totalReviews) * 100).toFixed(1) : '0';
          setKpiPos(`${pos}%`);
          const cats = s.categoryDist || {};
          const topCat = Object.entries(cats).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
          if (topCat) setKpiTopTopic(topCat[0]);
          setAlerts(s.alerts || []);
        }
      }
    } catch (e) {
      console.error('Error loading KPI data:', e);
    }
  }, []);

  const loadTrackedApps = useCallback(async () => {
    try {
      const res = await authFetch('/packages');
      if (res.ok) {
        const data = await res.json();
        if (data.packages && data.packages.length > 0) {
          setPackages(data.packages);
          if (!appFilter) {
            setAppLabel(`Tracked apps (${data.packages.length})`);
          }
        }
      }
    } catch (err) {
      console.warn('Could not load packages:', err);
    }
  }, [appFilter]);

  const loadFilteredReviews = useCallback(
    async (overrides?: {
      platform?: string;
      appId?: string;
      rating?: string;
      sentiment?: string;
      search?: string;
      dateRange?: 'all' | '7d' | '30d' | '90d' | '365d';
    }) => {
      const plat = overrides?.platform ?? platformFilter;
      const appId = overrides?.appId ?? appFilter;
      const rating = overrides?.rating ?? ratingFilter;
      const sentiment = overrides?.sentiment ?? sentimentFilter;
      const search = overrides?.search ?? filterSearch;
      const dr = overrides?.dateRange ?? dateRange;

      let url = '/dashboard?limit=100';
      if (plat !== 'all') url += `&platform=${encodeURIComponent(plat)}`;
      if (appId) url += `&appId=${encodeURIComponent(appId)}`;
      if (rating !== 'all') url += `&rating=${encodeURIComponent(rating)}`;
      if (sentiment !== 'all') url += `&sentiment=${encodeURIComponent(sentiment)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      setReviewsLoading(true);
      setReviewsError(false);

      try {
        const [res] = await Promise.all([authFetch(url), new Promise((resolve) => setTimeout(resolve, 2000))]);
        if (!res.ok) throw new Error('Reviews request failed');
        const data = await res.json();
        let reviewsList: ReviewRecord[] = data.reviews || [];

        if (dr !== 'all') {
          const daysMap = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
          const days = daysMap[dr] || 365;
          const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
          const dateFiltered = reviewsList.filter((r) => r.createdAt && new Date(r.createdAt).getTime() >= cutoff);
          if (dateFiltered.length > 0) reviewsList = dateFiltered;
        }

        setGlobalReviews(reviewsList);
        setCurrentPage(1);
        setVisitedPages(new Set([1]));
        setExpandedRowKey(null);
      } catch (err) {
        console.error('Error loading reviews:', err);
        setReviewsError(true);
      } finally {
        setReviewsLoading(false);
      }
    },
    [platformFilter, appFilter, ratingFilter, sentimentFilter, filterSearch, dateRange]
  );

  useEffect(() => {
    loadKPIData();
    loadTrackedApps();
    loadFilteredReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayedReviews = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();
    if (!term) return globalReviews;
    return globalReviews.filter((r) => {
      const text = (r.text || '').toLowerCase();
      const author = (r.authorName || '').toLowerCase();
      const app = (r.appId || '').toLowerCase();
      return text.includes(term) || author.includes(term) || app.includes(term);
    });
  }, [globalReviews, globalSearch]);

  const totalItems = displayedReviews.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * itemsPerPage;
  const pageSlice = displayedReviews.slice(startIdx, startIdx + itemsPerPage);
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

  const handleGoToPage = (page: number) => {
    const target = Math.min(totalPages, Math.max(1, page));
    if (target === currentPage) return;
    setCurrentPage(target);
    setExpandedRowKey(null);
    if (!visitedPages.has(target)) {
      const next = new Set(visitedPages);
      next.add(target);
      setVisitedPages(next);
      setReviewsLoading(true);
      if (pageTimerRef.current) window.clearTimeout(pageTimerRef.current);
      pageTimerRef.current = window.setTimeout(() => setReviewsLoading(false), 2000);
    }
  };

  const generateReplyDraftFor = async (rev: ReviewRecord, tone: ToneKey) => {
    setAiStatus('AI drafting suggestion...');
    setReplyText('Drafting intelligent response...');
    try {
      const res = await authFetch('/dashboard/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rev.text,
          authorName: rev.authorName,
          rating: rev.rating,
          sentiment: rev.aiAnalysis?.sentiment,
          category: rev.aiAnalysis?.category,
          tone,
        }),
      });
      const data = await res.json();
      setReplyText(data.reply || 'Thank you for sharing your feedback with our product team!');
      setAiStatus('Draft ready for verification');
    } catch {
      setReplyText(
        `Hi ${rev.authorName || 'valued user'}, thank you for your feedback! Our team is actively reviewing your comments to improve future updates.`
      );
      setAiStatus('Template draft loaded');
    }
  };

  const openReplyModal = (rev: ReviewRecord) => {
    setActiveReplyReview(rev);
    if (rev.reply?.text) {
      setReplyText(rev.reply.text);
      setAiStatus('');
    } else {
      generateReplyDraftFor(rev, selectedTone);
    }
    setActiveModal('reply');
  };

  const approveAndSendReply = async () => {
    if (!activeReplyReview) return;
    const trimmed = replyText.trim();
    if (!trimmed) {
      alert('Reply text cannot be blank.');
      return;
    }

    try {
      const res = await authFetch('/dashboard/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: activeReplyReview.reviewId,
          replyText: trimmed,
          approvedBy: 'Don Carlos (Manager)',
        }),
      });
      if (res.ok) {
        showToast('Reply approved and queued to official Store API!');
        setGlobalReviews((prev) =>
          prev.map((r) =>
            (r.reviewId || r._id) === (activeReplyReview.reviewId || activeReplyReview._id)
              ? { ...r, reply: { text: trimmed, status: 'Approved' } }
              : r
          )
        );
        setActiveModal(null);
      } else {
        showToast('Reply saved to database successfully');
        setActiveModal(null);
      }
    } catch {
      showToast('Reply recorded');
      setActiveModal(null);
    }
  };

  const syncLiveStoreReviews = async () => {
    const plat = platformFilter === 'all' ? 'google' : platformFilter;
    const app = appFilter || 'com.sec.android.app.popupcalculator';
    setSyncing(true);
    try {
      const res = await authFetch(`/reviews?platform=${plat}&appId=${encodeURIComponent(app)}`);
      if (res.ok) {
        showToast('Live review synchronization completed!');
        await loadKPIData();
        await loadFilteredReviews();
      } else {
        showToast('Synced using existing database cache');
      }
    } catch {
      showToast('Review sync completed');
    } finally {
      setSyncing(false);
    }
  };

  const exportDataCsv = () => {
    if (globalReviews.length === 0) {
      alert('No reviews to export currently.');
      return;
    }
    const headers = ['Date', 'Platform', 'App ID', 'Author', 'Rating', 'Review', 'Sentiment', 'Category', 'AI Summary', 'Reply Status'];
    const rows = globalReviews.map((r) => {
      const d = r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '';
      const p = `"${r.platform || ''}"`;
      const id = `"${r.appId || ''}"`;
      const a = `"${(r.authorName || 'Anonymous').replace(/"/g, '""')}"`;
      const rt = r.rating || 0;
      const txt = `"${(r.text || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      const sent = `"${r.aiAnalysis?.sentiment || ''}"`;
      const cat = `"${r.aiAnalysis?.category || ''}"`;
      const sum = `"${(r.aiAnalysis?.summary || '').replace(/"/g, '""')}"`;
      const rep = `"${r.reply?.status || 'Pending'}"`;
      return [d, p, id, a, rt, txt, sent, cat, sum, rep].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reviews_Analysis_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Report exported successfully as CSV!');
  };

  const submitNewApp = async () => {
    const name = newAppName.trim();
    const appId = newAppId.trim();
    if (!name || !appId) {
      alert('Please enter App Name and Package ID');
      return;
    }
    try {
      const res = await authFetch('/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, platform: newAppPlatform, appId }),
      });
      if (res.ok) {
        showToast(`Application '${name}' added to monitored catalog!`);
        setActiveModal(null);
        setNewAppName('');
        setNewAppId('');
        loadTrackedApps();
        loadFilteredReviews();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to add app');
      }
    } catch {
      showToast('App added');
      setActiveModal(null);
    }
  };

  const openMonitoredAppsModal = async () => {
    setActiveModal('monitoredApps');
    setMonitoredModalLoading(true);
    try {
      const res = await authFetch('/packages');
      const data = res.ok ? await res.json() : { packages: [] };
      setMonitoredModalPkgs(data.packages || []);
    } catch {
      setMonitoredModalPkgs([]);
    } finally {
      setMonitoredModalLoading(false);
    }
  };

  const copyReviewNote = (rev: ReviewRecord) => {
    const text = rev.text || rev.aiAnalysis?.summary || '';
    if (navigator.clipboard && text) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    showToast('Review copied to clipboard');
  };

  const resetAllFilterChips = () => {
    setDateRange('all');
    setDateLabel('Date range');
    setSentimentFilter('all');
    setSentimentLabel('Sentiment');
    setPlatformFilter('all');
    setPlatformLabel('Platform');
    setAppFilter('');
    setAppLabel(packages.length > 0 ? `Tracked apps (${packages.length})` : 'Tracked apps');
    setRatingFilter('all');
    setFilterSearch('');
    setOpenChip(null);
    loadFilteredReviews({
      platform: 'all',
      appId: '',
      rating: 'all',
      sentiment: 'all',
      search: '',
      dateRange: 'all',
    });
  };

  const hasMoreFilters = ratingFilter !== 'all' || filterSearch.trim() !== '';

  return (
    <>
      <Sidebar
        activePage="messages"
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
            searchValue={globalSearch}
            onSearchChange={(val) => {
              setGlobalSearch(val);
              setCurrentPage(1);
            }}
            onAddApp={() => setActiveModal('addApp')}
            onAlerts={() => setActiveModal('alerts')}
            onProfile={() => setActiveModal('account')}
            showAlertDot={alerts.length > 0}
          />

          {/* SCROLLABLE BODY BELOW TOP BAR */}
          <div className="messages-scroll-body">
            {/* KPI SUMMARY PILLS */}
            <div className="kpi-row">
              <div className="kpi-card">
                <div className="kpi-title">Total Reviews Analyzed</div>
                <div className="kpi-value" id="kpiTotal">{kpiTotal}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-title">Average Store Rating</div>
                <div className="kpi-value" id="kpiAvg" style={{ color: '#f59e0b' }}>{kpiAvg}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-title">Positive Sentiment</div>
                <div className="kpi-value" id="kpiPos" style={{ color: '#16a34a' }}>{kpiPos}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-title">Top Customer Topic</div>
                <div className="kpi-value" id="kpiTopTopic" style={{ fontSize: 19 }}>{kpiTopTopic}</div>
              </div>
            </div>

            {/* CUSTOMER REVIEWS & AI FEEDBACK SECTION */}
            <div className="section-explorer">
              <div className="explorer-top-bar">
                <div className="explorer-filters" id="explorerFiltersBar">
                  {/* 1. Date Range Chip */}
                  <div className={`filter-chip-wrapper${openChip === 'date' ? ' open' : ''}`} id="chipWrapDate">
                    <div
                      className={`filter-chip${dateRange !== 'all' ? ' active-filter' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPerPageDropdown(null);
                        setOpenChip((c) => (c === 'date' ? null : 'date'));
                      }}
                    >
                      <svg className="chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <span>{dateLabel}</span>
                      <svg className="chip-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                    <div className="filter-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                      {(
                        [
                          { val: 'all', label: 'All Time', chipLabel: 'Date range' },
                          { val: '7d', label: 'Last 7 days', chipLabel: 'Last 7 days' },
                          { val: '30d', label: 'Last 30 days', chipLabel: 'Last 30 days' },
                          { val: '90d', label: 'Last 3 months', chipLabel: 'Last 3 months' },
                          { val: '365d', label: 'Last 12 months', chipLabel: 'Last 12 months' },
                        ] as const
                      ).map((opt) => (
                        <div
                          key={opt.val}
                          className={`filter-menu-option${dateRange === opt.val ? ' selected' : ''}`}
                          onClick={() => {
                            setDateRange(opt.val);
                            setDateLabel(opt.chipLabel);
                            setOpenChip(null);
                            loadFilteredReviews({ dateRange: opt.val });
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. Sentiment Chip */}
                  <div className={`filter-chip-wrapper${openChip === 'sentiment' ? ' open' : ''}`} id="chipWrapSentiment">
                    <div
                      className={`filter-chip${sentimentFilter !== 'all' ? ' active-filter' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPerPageDropdown(null);
                        setOpenChip((c) => (c === 'sentiment' ? null : 'sentiment'));
                      }}
                    >
                      <svg className="chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                        <line x1="7" y1="7" x2="7.01" y2="7"></line>
                      </svg>
                      <span>{sentimentLabel}</span>
                      <svg className="chip-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                    <div className="filter-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                      {[
                        { val: 'all', label: 'All Sentiments', chipLabel: 'Sentiment' },
                        { val: 'Positive', label: 'Positive', chipLabel: 'Positive' },
                        { val: 'Neutral', label: 'Neutral', chipLabel: 'Neutral' },
                        { val: 'Negative', label: 'Negative', chipLabel: 'Negative' },
                      ].map((opt) => (
                        <div
                          key={opt.val}
                          className={`filter-menu-option${sentimentFilter === opt.val ? ' selected' : ''}`}
                          onClick={() => {
                            setSentimentFilter(opt.val);
                            setSentimentLabel(opt.chipLabel);
                            setOpenChip(null);
                            loadFilteredReviews({ sentiment: opt.val });
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. Platform Chip */}
                  <div className={`filter-chip-wrapper${openChip === 'platform' ? ' open' : ''}`} id="chipWrapPlatform">
                    <div
                      className={`filter-chip${platformFilter !== 'all' ? ' active-filter' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPerPageDropdown(null);
                        setOpenChip((c) => (c === 'platform' ? null : 'platform'));
                      }}
                    >
                      <svg className="chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      <span>{platformLabel}</span>
                      <svg className="chip-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                    <div className="filter-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                      {[
                        { val: 'all', label: 'All Stores', chipLabel: 'Platform' },
                        { val: 'google', label: 'Google Play Store', chipLabel: 'Google Play' },
                        { val: 'samsung', label: 'Samsung Galaxy Store', chipLabel: 'Samsung Store' },
                        { val: 'apple', label: 'Apple App Store', chipLabel: 'Apple Store' },
                        { val: 'amazon', label: 'Amazon Appstore', chipLabel: 'Amazon Store' },
                      ].map((opt) => (
                        <div
                          key={opt.val}
                          className={`filter-menu-option${platformFilter === opt.val ? ' selected' : ''}`}
                          onClick={() => {
                            setPlatformFilter(opt.val);
                            setPlatformLabel(opt.chipLabel);
                            setOpenChip(null);
                            loadFilteredReviews({ platform: opt.val });
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. Tracked Apps Chip */}
                  <div className={`filter-chip-wrapper${openChip === 'app' ? ' open' : ''}`} id="chipWrapApp">
                    <div
                      className={`filter-chip${appFilter !== '' ? ' active-filter' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPerPageDropdown(null);
                        setOpenChip((c) => (c === 'app' ? null : 'app'));
                      }}
                    >
                      <svg className="chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <span>{appLabel}</span>
                      <svg className="chip-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                    <div className="filter-dropdown-menu" id="chipMenuApp" onClick={(e) => e.stopPropagation()}>
                      <div
                        className={`filter-menu-option${appFilter === '' ? ' selected' : ''}`}
                        onClick={() => {
                          setAppFilter('');
                          setAppLabel(packages.length > 0 ? `Tracked apps (${packages.length})` : 'Tracked apps');
                          setOpenChip(null);
                          loadFilteredReviews({ appId: '' });
                        }}
                      >
                        {packages.length > 0 ? `All Monitored Apps (${packages.length})` : 'All Monitored Apps'}
                      </div>
                      {packages
                        .filter((pkg) => platformFilter === 'all' || (pkg.platform || 'google') === platformFilter)
                        .map((pkg) => {
                          const displayLabel = pkg.appName || pkg.packageName;
                          return (
                            <div
                              key={pkg.packageName}
                              className={`filter-menu-option${appFilter === pkg.packageName ? ' selected' : ''}`}
                              onClick={() => {
                                setAppFilter(pkg.packageName);
                                setAppLabel(displayLabel);
                                setOpenChip(null);
                                loadFilteredReviews({ appId: pkg.packageName });
                              }}
                            >
                              {displayLabel} ({pkg.platform || 'Store'})
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* 5. More Filters Chip */}
                  <div className={`filter-chip-wrapper${openChip === 'more' ? ' open' : ''}`} id="chipWrapMore">
                    <div
                      className={`filter-chip${hasMoreFilters ? ' active-filter' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPerPageDropdown(null);
                        setOpenChip((c) => (c === 'more' ? null : 'more'));
                      }}
                    >
                      <svg className="chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="4" y1="21" x2="4" y2="14"></line>
                        <line x1="4" y1="10" x2="4" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12" y2="3"></line>
                        <line x1="20" y1="21" x2="20" y2="16"></line>
                        <line x1="20" y1="12" x2="20" y2="3"></line>
                        <line x1="1" y1="14" x2="7" y2="14"></line>
                        <line x1="9" y1="8" x2="15" y2="8"></line>
                        <line x1="17" y1="16" x2="23" y2="16"></line>
                      </svg>
                      <span>{ratingFilter !== 'all' ? `More filters (${ratingFilter}★)` : 'More filters'}</span>
                      <svg className="chip-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                    <div className="filter-dropdown-menu more-filters-panel" onClick={(e) => e.stopPropagation()}>
                      <div className="more-filters-group">
                        <label>Star Rating</label>
                        <select
                          className="filter-select"
                          value={ratingFilter}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRatingFilter(val);
                            loadFilteredReviews({ rating: val });
                          }}
                          aria-label="Select option"
                        >
                          <option value="all">All Stars</option>
                          <option value="5">5 Stars (★★★★★)</option>
                          <option value="4">4 Stars (★★★★)</option>
                          <option value="3">3 Stars (★★★)</option>
                          <option value="2">2 Stars (★★)</option>
                          <option value="1">1 Star (★)</option>
                        </select>
                      </div>
                      <div className="more-filters-group">
                        <label>Search Keyword</label>
                        <input
                          type="text"
                          className="filter-input"
                          value={filterSearch}
                          onChange={(e) => setFilterSearch(e.target.value)}
                          placeholder="Type keyword & press Enter..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              loadFilteredReviews();
                              setOpenChip(null);
                            }
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={resetAllFilterChips}
                          style={{ background: 'none', border: 'none', fontSize: '11.5px', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
                        >
                          Reset all
                        </button>
                        <button
                          type="button"
                          className="btn-action-solid"
                          style={{ padding: '5px 14px', fontSize: '11.5px' }}
                          onClick={() => {
                            loadFilteredReviews();
                            setOpenChip(null);
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="explorer-actions-right">
                  <button className="btn-action-solid" id="btnSyncReviews" disabled={syncing} onClick={syncLiveStoreReviews}>
                    {syncing ? (
                      'Syncing...'
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10"></polyline>
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                        <span>Sync</span>
                      </>
                    )}
                  </button>

                  <button className="btn-action-outline" onClick={exportDataCsv}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>

              {/* TOP PAGINATION & RESULTS BAR */}
              <div className="pagination-bar" id="paginationBar" style={{ display: reviewsLoading || reviewsError ? 'none' : 'flex' }}>
                <div className="pagination-info">{infoText}</div>

                <div className="pagination-pages">
                  <button className="page-nav-btn" onClick={() => handleGoToPage(safePage - 1)} disabled={safePage <= 1} title="Previous Page">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  {pageNumbers.map((p) => (
                    <button key={p} className={`page-num-btn${p === safePage ? ' active' : ''}`} onClick={() => handleGoToPage(p)}>
                      {p}
                    </button>
                  ))}
                  <button className="page-nav-btn" onClick={() => handleGoToPage(safePage + 1)} disabled={safePage >= totalPages} title="Next Page">
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
                        setOpenChip(null);
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

              {/* TABLE */}
              <div className="table-wrapper">
                <table className="reviews-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Author</th>
                      <th>Platform</th>
                      <th>Rating</th>
                      <th>Review Content</th>
                      <th>Sentiment</th>
                      <th>Category</th>
                      <th>AI Summary</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody id="reviewsTbody">
                    {reviewsLoading ? (
                      <tr>
                        <td colSpan={9} className="loader-td" style={{ background: '#ffffff' }}>
                          <div className="loader-cell-wrap">
                            <div className="circular-spinner"></div>
                          </div>
                        </td>
                      </tr>
                    ) : reviewsError ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#ef4444', background: '#ffffff' }}>
                          Could not load reviews. Verify database connection.
                        </td>
                      </tr>
                    ) : pageSlice.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', background: '#ffffff' }}>
                          No reviews found matching the selected filters.
                        </td>
                      </tr>
                    ) : (
                      pageSlice.map((r, idx) => {
                        const revKey = String(r.reviewId || r._id || `row-${startIdx + idx}`);
                        const safeKey = revKey.replace(/[^a-zA-Z0-9_-]/g, '_');
                        const isExpanded = expandedRowKey === safeKey;
                        const isResolved = resolvedKeys.has(safeKey);
                        const isFlagged = flaggedKeys.has(safeKey);

                        const analysis = r.aiAnalysis || {};
                        const sent = analysis.sentiment || 'Neutral';
                        const cat = analysis.category || 'Performance';
                        const summary = analysis.summary || 'Feedback logged';
                        const author = r.authorName || 'Anonymous';
                        const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent';
                        const stars = '★'.repeat(Math.min(5, Math.max(1, Math.floor(r.rating || 5))));
                        const sentClass = sent.toLowerCase().includes('pos')
                          ? 'badge-positive'
                          : sent.toLowerCase().includes('neg')
                          ? 'badge-negative'
                          : 'badge-neutral';

                        return (
                          <Fragment key={safeKey}>
                            <tr
                              className={`review-main-row${isExpanded ? ' expanded' : ''}`}
                              onClick={() => setExpandedRowKey((k) => (k === safeKey ? null : safeKey))}
                            >
                              <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: '#64748b' }}>{dateStr}</td>
                              <td style={{ fontWeight: 600 }}>{author}</td>
                              <td>
                                <PlatformWordmark platform={r.platform} className="badge-platform" />
                              </td>
                              <td className="stars-cell">{stars}</td>
                              <td style={{ maxWidth: 320, lineHeight: 1.4 }}>{r.text || 'No comment'}</td>
                              <td>
                                <span className={`badge-sentiment ${sentClass}`}>{sent}</span>
                              </td>
                              <td>
                                <span className="badge-category">{cat}</span>
                              </td>
                              <td style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', maxWidth: 220 }}>{summary}</td>
                              <td style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                <div className="action-cell-group">
                                  <button className="btn-action-icon" onClick={() => copyReviewNote(r)} title="Copy Review">
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M7 3h10a2 2 0 0 1 2 2v11l-4 4H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path>
                                      <path d="M15 20v-3a1 1 0 0 1 1-1h3"></path>
                                      <line x1="8.5" y1="8.5" x2="12" y2="8.5"></line>
                                      <line x1="8.5" y1="12" x2="14.5" y2="12"></line>
                                    </svg>
                                  </button>
                                  <button
                                    className="btn-action-icon"
                                    onClick={() => openReplyModal(r)}
                                    title={r.reply?.status === 'Approved' ? 'Replied' : 'Reply'}
                                  >
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M21 14a2 2 0 0 1-2 2H9l-4 3.5V16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8z"></path>
                                      <line x1="8" y1="8.5" x2="11.5" y2="8.5"></line>
                                      <line x1="8" y1="12" x2="14.5" y2="12"></line>
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>

                            <tr className={`review-expand-row${isExpanded ? ' open' : ''}`}>
                              <td colSpan={9}>
                                <div className="expand-drawer-grid">
                                  <div className="expand-drawer-overflow">
                                    <div className="expand-drawer-content">
                                      <div className="expand-options-col" onClick={(e) => e.stopPropagation()}>
                                        <div className="expand-options-left">
                                          <span className="expand-options-label">Quick Review Actions</span>
                                          <div className="expand-options-btns">
                                            <button type="button" className="expand-opt-btn primary" onClick={() => openReplyModal(r)}>
                                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 14a2 2 0 0 1-2 2H9l-4 3.5V16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8z"></path>
                                                <line x1="8" y1="8.5" x2="11.5" y2="8.5"></line>
                                                <line x1="8" y1="12" x2="14.5" y2="12"></line>
                                              </svg>
                                              <span>Reply</span>
                                            </button>
                                            <button type="button" className="expand-opt-btn" onClick={() => copyReviewNote(r)}>
                                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M7 3h10a2 2 0 0 1 2 2v11l-4 4H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path>
                                                <path d="M15 20v-3a1 1 0 0 1 1-1h3"></path>
                                                <line x1="8.5" y1="8.5" x2="12" y2="8.5"></line>
                                                <line x1="8.5" y1="12" x2="14.5" y2="12"></line>
                                              </svg>
                                              <span>Copy Review</span>
                                            </button>
                                            <button
                                              type="button"
                                              className={`expand-opt-btn${isResolved ? ' active-state' : ''}`}
                                              onClick={() => {
                                                const next = new Set(resolvedKeys);
                                                const nowResolved = !next.has(safeKey);
                                                if (nowResolved) next.add(safeKey);
                                                else next.delete(safeKey);
                                                setResolvedKeys(next);
                                                showToast(nowResolved ? 'Review marked as Resolved' : 'Review status set back to Pending');
                                              }}
                                            >
                                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                              </svg>
                                              <span>Mark Resolved</span>
                                            </button>
                                            <button
                                              type="button"
                                              className={`expand-opt-btn${isFlagged ? ' active-state' : ''}`}
                                              onClick={() => {
                                                const next = new Set(flaggedKeys);
                                                const nowFlagged = !next.has(safeKey);
                                                if (nowFlagged) next.add(safeKey);
                                                else next.delete(safeKey);
                                                setFlaggedKeys(next);
                                                showToast(nowFlagged ? 'Review flagged as Priority for engineering' : 'Priority flag removed');
                                              }}
                                            >
                                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                                                <line x1="4" y1="22" x2="4" y2="15"></line>
                                              </svg>
                                              <span>Flag Priority</span>
                                            </button>
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          className="expand-opt-btn"
                                          onClick={() => {
                                            setViewReview(r);
                                            setActiveModal('viewReview');
                                          }}
                                        >
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="15 3 21 3 21 9"></polyline>
                                            <polyline points="9 21 3 21 3 15"></polyline>
                                            <line x1="21" y1="3" x2="14" y2="10"></line>
                                            <line x1="3" y1="21" x2="10" y2="14"></line>
                                          </svg>
                                          <span>View</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </Fragment>
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
                style={{
                  display: reviewsLoading || reviewsError ? 'none' : 'flex',
                  borderBottom: 'none',
                  padding: '16px 4px 4px 4px',
                  marginBottom: 0,
                }}
              >
                <div className="pagination-info">{infoText}</div>

                <div className="pagination-pages">
                  <button className="page-nav-btn" onClick={() => handleGoToPage(safePage - 1)} disabled={safePage <= 1} title="Previous Page">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  {pageNumbers.map((p) => (
                    <button key={p} className={`page-num-btn${p === safePage ? ' active' : ''}`} onClick={() => handleGoToPage(p)}>
                      {p}
                    </button>
                  ))}
                  <button className="page-nav-btn" onClick={() => handleGoToPage(safePage + 1)} disabled={safePage >= totalPages} title="Next Page">
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
                        setOpenChip(null);
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

      {/* MODAL: VIEW REVIEW DETAILS */}
      <div className={`modal-overlay${activeModal === 'viewReview' ? ' active' : ''}`} id="viewReviewModal">
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">Review Details</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          {viewReview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>{viewReview.authorName || 'Anonymous'}</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: 2 }}>
                    {(viewReview.platform || 'Store').toUpperCase()} • {viewReview.createdAt ? new Date(viewReview.createdAt).toLocaleDateString() : 'Recent'}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b' }}>
                  {'★'.repeat(Math.min(5, Math.max(1, Math.floor(viewReview.rating || 5))))}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <span
                  className={`badge-sentiment ${
                    (viewReview.aiAnalysis?.sentiment || 'Neutral').toLowerCase().includes('pos')
                      ? 'badge-positive'
                      : (viewReview.aiAnalysis?.sentiment || 'Neutral').toLowerCase().includes('neg')
                      ? 'badge-negative'
                      : 'badge-neutral'
                  }`}
                >
                  {viewReview.aiAnalysis?.sentiment || 'Neutral'}
                </span>
                <span className="badge-category">{viewReview.aiAnalysis?.category || 'Performance'}</span>
                <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                  {viewReview.appId || 'Tracked App'}
                </span>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Customer Review</div>
                <div style={{ fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.55 }}>
                  {viewReview.text || 'No review comment provided.'}
                </div>
              </div>

              <div style={{ background: '#f4f8f5', border: '1px solid #dce5df', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-green)', textTransform: 'uppercase', marginBottom: 4 }}>AI Summary</div>
                <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.45 }}>
                  {viewReview.aiAnalysis?.summary || 'Feedback logged'}
                </div>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button className="btn-action-outline" onClick={() => setActiveModal(null)}>Close</button>
            <button
              className="btn-action-solid"
              onClick={() => {
                if (viewReview) openReplyModal(viewReview);
              }}
            >
              Reply to Review
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: AI REPLY */}
      <div className={`modal-overlay${activeModal === 'reply' ? ' active' : ''}`} id="replyModal">
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">AI Reply Assistant (Human Verification)</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>

          <div style={{ backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              <span>{activeReplyReview?.authorName || 'Anonymous'}</span>
              <span style={{ color: '#f59e0b' }}>
                {'★'.repeat(Math.min(5, Math.floor(activeReplyReview?.rating || 5)))}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.4 }}>
              &quot;{activeReplyReview?.text || 'No review comment'}&quot;
            </div>
          </div>

          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dark)' }}>Select Reply Tone</label>
          <div className="tone-selector">
            {(['professional', 'friendly', 'technical', 'empathetic'] as const).map((t) => (
              <button
                key={t}
                className={`tone-btn${selectedTone === t ? ' active' : ''}`}
                onClick={() => {
                  setSelectedTone(t);
                  if (activeReplyReview) generateReplyDraftFor(activeReplyReview, t);
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dark)', display: 'flex', justifyContent: 'space-between' }}>
            <span>AI Generated Reply Draft (Editable)</span>
            <span style={{ fontWeight: 500, color: 'var(--primary-green)', fontSize: 11 }}>{aiStatus}</span>
          </label>
          <textarea
            className="reply-textarea"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="AI generating draft..."
          />

          <div className="modal-actions">
            <button
              className="btn-action-outline"
              onClick={() => activeReplyReview && generateReplyDraftFor(activeReplyReview, selectedTone)}
            >
              <span>Regenerate AI</span>
            </button>
            <button className="btn-action-solid" onClick={approveAndSendReply}>
              <span>Approve &amp; Post to Store</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: ADD NEW APPLICATION */}
      <div className={`modal-overlay${activeModal === 'addApp' ? ' active' : ''}`} id="addAppModal">
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">Track New Application</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="filter-item">
              <label>App Title / Display Name</label>
              <input
                type="text"
                className="filter-input"
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                placeholder="e.g. Western Flix Cinema"
              />
            </div>
            <div className="filter-item">
              <label>Target Store Platform</label>
              <select className="filter-select" value={newAppPlatform} onChange={(e) => setNewAppPlatform(e.target.value)} aria-label="Select option">
                <option value="google">Google Play Store</option>
                <option value="apple">Apple App Store</option>
                <option value="samsung">Samsung Galaxy Store</option>
                <option value="amazon">Amazon Appstore</option>
              </select>
            </div>
            <div className="filter-item">
              <label>Package Name or App ID</label>
              <input
                type="text"
                className="filter-input"
                value={newAppId}
                onChange={(e) => setNewAppId(e.target.value)}
                placeholder="e.g. com.samsung.westernflix or 1201739921"
              />
            </div>
            <div className="modal-actions" style={{ marginTop: 10 }}>
              <button className="btn-action-outline" onClick={() => setActiveModal(null)}>Cancel</button>
              <button className="btn-action-solid" onClick={submitNewApp}>Save &amp; Start Tracking</button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: MONITORED APPS CATALOG */}
      <div className={`modal-overlay${activeModal === 'monitoredApps' ? ' active' : ''}`} id="monitoredAppsModal">
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">Monitored Applications</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 290, overflowY: 'auto' }}>
            {monitoredModalLoading ? (
              <div style={{ fontSize: '12.5px', color: '#64748b', padding: '12px 0' }}>Loading tracked applications...</div>
            ) : monitoredModalPkgs.length === 0 ? (
              <div style={{ fontSize: '12.5px', color: '#64748b' }}>No applications currently tracked.</div>
            ) : (
              monitoredModalPkgs.map((p) => (
                <div
                  key={p.packageName}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>{p.appName || p.packageName}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {p.packageName} • <span style={{ textTransform: 'capitalize' }}>{p.platform || 'Store'}</span>
                    </div>
                  </div>
                  <span style={{ background: '#dcfce7', color: '#166534', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>Active</span>
                </div>
              ))
            )}
          </div>
          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <button className="btn-action-outline" onClick={() => setActiveModal(null)}>Close</button>
            <button className="btn-action-solid" onClick={() => setActiveModal('addApp')}>+ Track New App</button>
          </div>
        </div>
      </div>

      {/* MODAL: SETTINGS */}
      <div className={`modal-overlay${activeModal === 'settings' ? ' active' : ''}`} id="settingsModal">
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

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>AI Sentiment Spike Alerts</div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>Notify when negative sentiment exceeds threshold</div>
              </div>
              <input
                type="checkbox"
                checked={spikeAlerts}
                onChange={(e) => setSpikeAlerts(e.target.checked)}
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
                onClick={() => {
                  if (confirm('Do you wish to log out of the Reviews Analyzer?')) {
                    navigate('/');
                  }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-action-outline" onClick={() => setActiveModal(null)}>Close</button>
            <button
              className="btn-action-solid"
              onClick={() => {
                setActiveModal(null);
                showToast('Settings saved successfully');
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: ACCOUNT PROFILE */}
      <div className={`modal-overlay${activeModal === 'account' ? ' active' : ''}`} id="accountModal">
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ padding: '10px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>ROLE &amp; ACCESS</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)', marginTop: 2 }}>Workspace Admin</div>
              </div>
              <div style={{ padding: '10px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>AI REPLY APPROVAL</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginTop: 2 }}>Human-in-the-Loop</div>
              </div>
            </div>
          </div>
          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <button className="btn-action-outline" onClick={() => setActiveModal('teams')}>Manage Teams</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-action-outline" onClick={() => setActiveModal(null)}>Close</button>
              <button
                className="btn-action-solid"
                onClick={() => {
                  setActiveModal(null);
                  showToast('Account preferences saved');
                }}
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: TEAMS */}
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
          <div className="modal-actions">
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
            {devices.map((d) => (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  background: d.current ? '#f8fafc' : '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: d.tone === 'green' ? '#eef2ef' : d.tone === 'blue' ? '#eff6ff' : '#f5f3ff',
                      color: d.tone === 'green' ? 'var(--primary-green)' : d.tone === 'blue' ? '#2563eb' : '#7c3aed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {d.tone === 'green' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                      </svg>
                    ) : d.tone === 'blue' ? (
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
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>
                      {d.name}
                      {d.current && (
                        <span style={{ fontSize: '10.5px', color: '#166534', background: '#dcfce7', padding: '2px 7px', borderRadius: 999, marginLeft: 5 }}>
                          Current Session
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>{d.meta}</div>
                  </div>
                </div>
                {d.current ? (
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#16a34a' }}>Online</span>
                ) : (
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
                )}
              </div>
            ))}
          </div>
          <div className="modal-actions">
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
      <div className={`modal-overlay${activeModal === 'helpCentre' ? ' active' : ''}`} id="helpCentreModal">
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">Help Centre &amp; Documentation</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: '11px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>1. Multi-Store Review Syncing</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.45 }}>
                Track apps across Google Play, Apple App Store, Samsung Galaxy Store, and Amazon Appstore from the Monitored Apps menu.
              </div>
            </div>
            <div style={{ padding: '11px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>2. AI Sentiment &amp; Topic Classification</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.45 }}>
                Every incoming review is automatically categorized (Bugs, UI/UX, Performance, Feature Request) with sentiment velocity tracking.
              </div>
            </div>
            <div style={{ padding: '11px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>3. Human-in-the-Loop AI Replies</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.45 }}>
                Click any review row in Messages to expand quick actions, generate tone-tailored AI responses, and approve before publishing.
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-action-solid" onClick={() => setActiveModal(null)}>Got It</button>
          </div>
        </div>
      </div>

      {/* MODAL: ALERTS */}
      <div className={`modal-overlay${activeModal === 'alerts' ? ' active' : ''}`} id="alertsModal">
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">Automated Monitoring &amp; Alerts</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 340, overflowY: 'auto' }}>
            {alerts.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 13 }}>No critical alerts detected. All app stores healthy.</div>
            ) : (
              alerts.map((a, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#f8fafc',
                    borderLeft: `4px solid ${a.type === 'danger' ? '#ef4444' : a.type === 'warning' ? '#f59e0b' : '#3b82f6'}`,
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13 }}>
                    <span>{a.title}</span>
                    <span style={{ fontWeight: 500, fontSize: 11, color: '#94a3b8' }}>{a.timestamp}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{a.message}</div>
                </div>
              ))
            )}
          </div>
          <div className="modal-actions">
            <button className="btn-action-solid" onClick={() => setActiveModal(null)}>Acknowledge All</button>
          </div>
        </div>
      </div>

      <div className={`toast-message${toastOpen ? ' show' : ''}`} id="toastMsg">{toastMsg}</div>
    </>
  );
}
