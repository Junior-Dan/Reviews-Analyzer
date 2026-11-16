import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Sidebar } from '../components/Sidebar';
import { SkeletonTableRows } from '../components/Skeleton';
import { TopBar } from '../components/TopBar';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePageMeta } from '../hooks/usePageMeta';
import { ApiError, authFetchJson, queryKeys, useWorkspaceKey } from '../lib/queryClient';
import { authFetch, getStoredUser, getToken } from '../utils/api';
import { initTheme } from '../utils/theme';
import '../styles/monitored-apps.css';

type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface AuditEvent {
  id: string;
  severity: SeverityLevel;
  action: string;
  user: string;
  entity: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const SEVERITY_STYLES: Record<SeverityLevel, { bg: string; color: string }> = {
  LOW: { bg: '#dbeafe', color: '#2563eb' },
  MEDIUM: { bg: '#fef3c7', color: '#d97706' },
  HIGH: { bg: '#ffedd5', color: '#ea580c' },
  CRITICAL: { bg: '#fee2e2', color: '#dc2626' },
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatAuditTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export function AuditLogsPage() {
  usePageMeta('monitored-apps', 'Audit Logs | Reviews Analyzer');
  const navigate = useNavigate();

  const wsId = useWorkspaceKey();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 300);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calStart, setCalStart] = useState<Date | null>(null);
  const [calEnd, setCalEnd] = useState<Date | null>(null);
  const [dateLabel, setDateLabel] = useState('Dates');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [openFilter, setOpenFilter] = useState<'severity' | 'entity' | 'user' | null>(null);
  const [perPageDropdown, setPerPageDropdown] = useState<'top' | 'bottom' | null>(null);
  const filtersBarRef = useRef<HTMLDivElement | null>(null);
  const calendarWrapRef = useRef<HTMLDivElement | null>(null);
  const perPageTopWrapRef = useRef<HTMLDivElement | null>(null);
  const perPageBottomWrapRef = useRef<HTMLDivElement | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  useEffect(() => {
    initTheme();
    if (!getToken()) {
      navigate('/');
      return;
    }
    const wsRole = String(getStoredUser().workspaceRole || 'owner').toLowerCase();
    if (wsRole !== 'owner' && wsRole !== 'admin') {
      navigate('/dashboard');
    }
  }, [navigate]);

  useEffect(() => {
    if (!calendarOpen && !openFilter && !perPageDropdown) return;
    const handleOutside = (e: MouseEvent) => {
      if (calendarOpen && calendarWrapRef.current && !calendarWrapRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
      if (openFilter && filtersBarRef.current && !filtersBarRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
      if (perPageDropdown) {
        const activeRef = perPageDropdown === 'top' ? perPageTopWrapRef.current : perPageBottomWrapRef.current;
        if (activeRef && !activeRef.contains(e.target as Node)) {
          setPerPageDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [calendarOpen, openFilter, perPageDropdown]);

  const auditQuery = useQuery({
    queryKey: queryKeys.auditLogs(wsId, {
      page,
      limit,
      severityFilter,
      entityFilter,
      userFilter,
      search: debouncedSearch,
      dateFrom,
      dateTo,
    }),
    placeholderData: keepPreviousData,
    refetchInterval: 12_000,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (entityFilter !== 'all') params.set('entity', entityFilter);
      if (userFilter !== 'all') params.set('user', userFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      try {
        const data = await authFetchJson<{
          events?: AuditEvent[];
          total?: number;
          facets?: { entities?: string[]; users?: string[] };
        }>(`/api/audit-logs?${params.toString()}`, { signal });

        authFetch('/api/audit-logs/mark-seen', { method: 'POST' })
          .then(() => window.dispatchEvent(new Event('auditLogsSeen')))
          .catch(() => {});

        return data;
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          navigate('/dashboard');
        }
        throw err;
      }
    },
  });

  const events = auditQuery.data?.events ?? [];
  const total = Number(auditQuery.data?.total ?? 0);
  const entityOptions = auditQuery.data?.facets?.entities ?? [];
  const userOptions = auditQuery.data?.facets?.users ?? [];
  const loading = auditQuery.isPending;
  const isFetchingTransition = auditQuery.isFetching && auditQuery.isPlaceholderData;

  const hasActiveFilters =
    severityFilter !== 'all' ||
    entityFilter !== 'all' ||
    userFilter !== 'all' ||
    Boolean(searchTerm.trim()) ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const clearFilters = () => {
    setSeverityFilter('all');
    setEntityFilter('all');
    setUserFilter('all');
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setCalStart(null);
    setCalEnd(null);
    setActivePreset(null);
    setDateLabel('Dates');
    setPage(1);
  };

  const changeCalMonth = (delta: number) => {
    let nextMonth = calMonth + delta;
    let nextYear = calYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setCalMonth(nextMonth);
    setCalYear(nextYear);
  };

  const selectPresetRange = (preset: 'Today' | '7 Days' | '30 Days') => {
    const end = new Date();
    const start = new Date();
    if (preset === '7 Days') start.setDate(end.getDate() - 6);
    else if (preset === '30 Days') start.setDate(end.getDate() - 29);
    setCalStart(start);
    setCalEnd(end);
    setActivePreset(preset);
    setDateLabel(preset);
    setDateFrom(toIsoDate(start));
    setDateTo(toIsoDate(end));
    setPage(1);
    setCalendarOpen(false);
  };

  const selectCalDay = (cellDate: Date) => {
    setActivePreset(null);
    if (!calStart || (calStart && calEnd)) {
      setCalStart(cellDate);
      setCalEnd(null);
    } else if (cellDate < calStart) {
      setCalEnd(calStart);
      setCalStart(cellDate);
    } else {
      setCalEnd(cellDate);
    }
  };

  const applyCustomDateRange = () => {
    if (!calStart) return;
    const end = calEnd || calStart;
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    setDateLabel(isSameDay(calStart, end) ? fmt(calStart) : `${fmt(calStart)} – ${fmt(end)}`);
    setDateFrom(toIsoDate(calStart));
    setDateTo(toIsoDate(end));
    setPage(1);
    setCalendarOpen(false);
  };

  const today = new Date();
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calRangeHint = calStart
    ? calEnd
      ? `${calStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${calEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : `${calStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – pick end date`
    : 'Select start & end date';

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = total === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(total, page * limit);
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1);

  const renderPaginationBar = (position: 'top' | 'bottom') => (
    <div
      className="pagination-bar"
      style={{
        display: loading ? 'none' : 'flex',
        borderBottom: position === 'top' ? '1px solid var(--border-soft, #f1f5f9)' : 'none',
        padding: position === 'top' ? '12px 20px 14px' : '16px 20px 4px',
        marginBottom: 0,
      }}
    >
      <div className="pagination-info">
        Showing {startIndex} - {endIndex} of {total} results
      </div>

      <div className="pagination-pages">
        <button
          type="button"
          className="page-nav-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          title="Previous Page"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        {pageNumbers.map((p) => (
          <button
            key={p}
            type="button"
            className={`page-num-btn${p === page ? ' active' : ''}`}
            onClick={() => setPage(p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className="page-nav-btn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          title="Next Page"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <div className="pagination-per-page">
        <span>Items per page</span>
        <div
          ref={position === 'top' ? perPageTopWrapRef : perPageBottomWrapRef}
          className={`per-page-select-wrap${perPageDropdown === position ? ' open' : ''}`}
        >
          <button
            type="button"
            className="per-page-custom-btn"
            onClick={(e) => {
              e.stopPropagation();
              setPerPageDropdown((d) => (d === position ? null : position));
            }}
          >
            <span>{limit}</span>
            <svg className="per-page-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div className={`per-page-dropdown-menu${position === 'bottom' ? ' drop-up' : ''}`}>
            {[10, 20, 50].map((val) => (
              <div
                key={val}
                className={`per-page-option${limit === val ? ' selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setLimit(val);
                  setPage(1);
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
  );

  return (
    <>
      <Sidebar
        activePage="audit-logs"
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
            onSearchChange={(val) => {
              setSearchTerm(val);
              setPage(1);
            }}
            searchInputId="auditLogsSearch"
            onAddApp={() => navigate('/monitored-apps')}
            onAlerts={() => navigate('/alerts')}
            onProfile={() => navigate('/profile')}
          />

          <div className="page-scroll-body">
            {/* AUDIT TABLE CARD */}
            <div className="apps-table-card" style={{ padding: '0 0 14px' }}>
              {/* EVENT COUNT & FILTERS BAR INSIDE CARD */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border-soft, #f1f5f9)',
                }}
              >
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-dark)' }}>
                {total.toLocaleString()}{' '}
                <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>events</span>
              </div>

              <div ref={filtersBarRef} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {/* SEVERITY CHIP DROPDOWN */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarOpen(false);
                      setOpenFilter((prev) => (prev === 'severity' ? null : 'severity'));
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 11px',
                      borderRadius: 9,
                      border: `1px solid ${severityFilter !== 'all' || openFilter === 'severity' ? 'var(--primary-green)' : 'var(--border-soft, #e2e8f0)'}`,
                      background: 'var(--card-bg, #ffffff)',
                      color: severityFilter !== 'all' || openFilter === 'severity' ? 'var(--primary-green)' : 'var(--text-dark)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <line x1="6" y1="20" x2="6" y2="14" />
                      <line x1="12" y1="20" x2="12" y2="9" />
                      <line x1="18" y1="20" x2="18" y2="4" />
                    </svg>
                    <span>{severityFilter === 'all' ? 'Severities' : severityFilter}</span>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        marginLeft: 2,
                        transform: openFilter === 'severity' ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.15s ease',
                        opacity: 0.75,
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {openFilter === 'severity' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        minWidth: 165,
                        background: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--border-soft, #e2e8f0)',
                        borderRadius: 14,
                        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
                        padding: 6,
                        zIndex: 150,
                      }}
                    >
                      {[
                        { value: 'all', label: 'Severities' },
                        { value: 'LOW', label: 'LOW' },
                        { value: 'MEDIUM', label: 'MEDIUM' },
                        { value: 'HIGH', label: 'HIGH' },
                        { value: 'CRITICAL', label: 'CRITICAL' },
                      ].map((opt) => {
                        const selected = severityFilter === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSeverityFilter(opt.value);
                              setPage(1);
                              setOpenFilter(null);
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 11px',
                              borderRadius: 9,
                              border: 'none',
                              background: selected ? 'rgba(23, 83, 59, 0.1)' : 'transparent',
                              color: selected ? 'var(--primary-green)' : 'var(--text-dark)',
                              fontSize: 12.5,
                              fontWeight: selected ? 700 : 500,
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <span>{opt.label}</span>
                            {selected && (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ENTITY CHIP DROPDOWN */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarOpen(false);
                      setOpenFilter((prev) => (prev === 'entity' ? null : 'entity'));
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 11px',
                      borderRadius: 9,
                      border: `1px solid ${entityFilter !== 'all' || openFilter === 'entity' ? 'var(--primary-green)' : 'var(--border-soft, #e2e8f0)'}`,
                      background: 'var(--card-bg, #ffffff)',
                      color: entityFilter !== 'all' || openFilter === 'entity' ? 'var(--primary-green)' : 'var(--text-dark)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                    <span>{entityFilter === 'all' ? 'Entities' : entityFilter}</span>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        marginLeft: 2,
                        transform: openFilter === 'entity' ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.15s ease',
                        opacity: 0.75,
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {openFilter === 'entity' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        minWidth: 175,
                        maxHeight: 260,
                        overflowY: 'auto',
                        background: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--border-soft, #e2e8f0)',
                        borderRadius: 14,
                        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
                        padding: 6,
                        zIndex: 150,
                      }}
                    >
                      {['all', ...entityOptions].map((val) => {
                        const selected = entityFilter === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              setEntityFilter(val);
                              setPage(1);
                              setOpenFilter(null);
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 11px',
                              borderRadius: 9,
                              border: 'none',
                              background: selected ? 'rgba(23, 83, 59, 0.1)' : 'transparent',
                              color: selected ? 'var(--primary-green)' : 'var(--text-dark)',
                              fontSize: 12.5,
                              fontWeight: selected ? 700 : 500,
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <span>{val === 'all' ? 'Entities' : val}</span>
                            {selected && (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* USER CHIP DROPDOWN */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarOpen(false);
                      setOpenFilter((prev) => (prev === 'user' ? null : 'user'));
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 11px',
                      borderRadius: 9,
                      border: `1px solid ${userFilter !== 'all' || openFilter === 'user' ? 'var(--primary-green)' : 'var(--border-soft, #e2e8f0)'}`,
                      background: 'var(--card-bg, #ffffff)',
                      color: userFilter !== 'all' || openFilter === 'user' ? 'var(--primary-green)' : 'var(--text-dark)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      maxWidth: 200,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {userFilter === 'all' ? 'Users' : userFilter}
                    </span>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        marginLeft: 2,
                        flexShrink: 0,
                        transform: openFilter === 'user' ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.15s ease',
                        opacity: 0.75,
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {openFilter === 'user' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        minWidth: 210,
                        maxHeight: 260,
                        overflowY: 'auto',
                        background: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--border-soft, #e2e8f0)',
                        borderRadius: 14,
                        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
                        padding: 6,
                        zIndex: 150,
                      }}
                    >
                      {['all', ...userOptions].map((val) => {
                        const selected = userFilter === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              setUserFilter(val);
                              setPage(1);
                              setOpenFilter(null);
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                              padding: '8px 11px',
                              borderRadius: 9,
                              border: 'none',
                              background: selected ? 'rgba(23, 83, 59, 0.1)' : 'transparent',
                              color: selected ? 'var(--primary-green)' : 'var(--text-dark)',
                              fontSize: 12.5,
                              fontWeight: selected ? 700 : 500,
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {val === 'all' ? 'Users' : val}
                            </span>
                            {selected && (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* CALENDAR DATE RANGE PICKER (LIKE ANALYTICS) */}
                <div ref={calendarWrapRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenFilter(null);
                      setCalendarOpen((o) => !o);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 11px',
                      borderRadius: 9,
                      border: `1px solid ${dateFrom || calendarOpen ? 'var(--primary-green)' : 'var(--border-soft, #e2e8f0)'}`,
                      background: 'var(--card-bg, #ffffff)',
                      color: dateFrom || calendarOpen ? 'var(--primary-green)' : 'var(--text-dark)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>{dateLabel}</span>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        marginLeft: 2,
                        transform: calendarOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.15s ease',
                        opacity: 0.75,
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {calendarOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        zIndex: 120,
                        width: 280,
                        background: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--border-soft, #e2e8f0)',
                        borderRadius: 16,
                        padding: 14,
                        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16)',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                        {(['Today', '7 Days', '30 Days'] as const).map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => selectPresetRange(preset)}
                            style={{
                              flex: 1,
                              padding: '5px 8px',
                              borderRadius: 8,
                              border: '1px solid var(--border-soft, #e2e8f0)',
                              background: activePreset === preset ? 'var(--primary-green)' : 'transparent',
                              color: activePreset === preset ? '#ffffff' : 'var(--text-muted)',
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 10,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => changeCalMonth(-1)}
                          title="Previous Month"
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 7,
                            border: '1px solid var(--border-soft, #e2e8f0)',
                            background: 'transparent',
                            color: 'var(--text-dark)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                          </svg>
                        </button>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>
                          {MONTH_NAMES[calMonth]} {calYear}
                        </div>
                        <button
                          type="button"
                          onClick={() => changeCalMonth(1)}
                          title="Next Month"
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 7,
                            border: '1px solid var(--border-soft, #e2e8f0)',
                            background: 'transparent',
                            color: 'var(--text-dark)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(7, 1fr)',
                          textAlign: 'center',
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          marginBottom: 6,
                        }}
                      >
                        <span>Su</span>
                        <span>Mo</span>
                        <span>Tu</span>
                        <span>We</span>
                        <span>Th</span>
                        <span>Fr</span>
                        <span>Sa</span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(7, 1fr)',
                          gap: 2,
                        }}
                      >
                        {Array.from({ length: firstDayIndex }).map((_, i) => (
                          <div key={`empty-${i}`} style={{ height: 30 }} />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, idx) => {
                          const day = idx + 1;
                          const cellDate = new Date(calYear, calMonth, day);
                          const isStart = Boolean(calStart && isSameDay(cellDate, calStart));
                          const isEnd = Boolean(calEnd && isSameDay(cellDate, calEnd));
                          const inRange = Boolean(calStart && calEnd && cellDate > calStart && cellDate < calEnd);
                          const isToday = isSameDay(cellDate, today);

                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => selectCalDay(cellDate)}
                              style={{
                                height: 30,
                                borderRadius: 7,
                                border: isToday && !isStart && !isEnd ? '1px solid var(--primary-green)' : 'none',
                                background:
                                  isStart || isEnd
                                    ? 'var(--primary-green)'
                                    : inRange
                                    ? 'rgba(23, 83, 59, 0.14)'
                                    : 'transparent',
                                color: isStart || isEnd ? '#ffffff' : 'var(--text-dark)',
                                fontSize: 12,
                                fontWeight: isStart || isEnd || isToday ? 700 : 500,
                                cursor: 'pointer',
                              }}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          marginTop: 12,
                          paddingTop: 10,
                          borderTop: '1px solid var(--border-soft, #e2e8f0)',
                        }}
                      >
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                          {calRangeHint}
                        </div>
                        <button
                          type="button"
                          disabled={!calStart}
                          onClick={applyCustomDateRange}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 8,
                            border: 'none',
                            background: 'var(--primary-green)',
                            color: '#ffffff',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: calStart ? 'pointer' : 'not-allowed',
                            opacity: calStart ? 1 : 0.5,
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 9,
                      border: '1px solid var(--border-soft, #e2e8f0)',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
              </div>

              {/* TOP PAGINATION BAR */}
              {renderPaginationBar('top')}

              {isFetchingTransition && <div className="table-progress-bar" aria-label="Loading page" />}
              <div
                className="table-scroll-wrap"
                style={{
                  opacity: isFetchingTransition ? 0.65 : 1,
                  transition: 'opacity 0.15s ease',
                }}
              >
                <table className="apps-table" style={{ tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 96 }}>Severity</th>
                      <th>Action</th>
                      <th>User</th>
                      <th style={{ width: 100 }}>Entity</th>
                      <th>Description</th>
                      <th style={{ width: 145 }}>Time</th>
                      <th style={{ width: 64, textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <SkeletonTableRows
                        rows={6}
                        columns={[
                          { width: 72 },
                          { width: 120 },
                          { width: 140 },
                          { width: 100 },
                          { width: 220 },
                          { width: 110 },
                          { width: 32, align: 'right' },
                        ]}
                      />
                    ) : auditQuery.isError && events.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: 20 }}>
                          <div className="query-error-banner" role="alert">
                            <span>{(auditQuery.error as Error)?.message || 'Unable to load audit logs.'}</span>
                            <button type="button" className="query-retry-btn" onClick={() => void auditQuery.refetch()}>
                              Retry
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : events.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                          No audit events match your filters.
                        </td>
                      </tr>
                    ) : (
                      events.map((ev) => {
                        const sev = SEVERITY_STYLES[ev.severity] || SEVERITY_STYLES.LOW;
                        return (
                          <tr key={ev.id}>
                            <td>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 10px',
                                  borderRadius: 999,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: sev.bg,
                                  color: sev.color,
                                  letterSpacing: '0.02em',
                                }}
                              >
                                {ev.severity}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>
                              {ev.action}
                            </td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                              {ev.user}
                            </td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                              {ev.entity}
                            </td>
                            <td
                              style={{
                                fontSize: 12.5,
                                color: 'var(--text-muted)',
                                maxWidth: 260,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={ev.description}
                            >
                              {ev.description}
                            </td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                              {formatAuditTime(ev.createdAt)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn-action-sq"
                                title="View event details"
                                aria-label="View event details"
                                onClick={() => setSelectedEvent(ev)}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.9"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* BOTTOM PAGINATION BAR */}
              {renderPaginationBar('bottom')}
            </div>
          </div>
        </div>
      </main>

      {/* EVENT DETAIL MODAL */}
      {selectedEvent && (
        <div
          className="modal-overlay active"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEvent(null);
          }}
        >
          <div className="modal-card" style={{ maxWidth: 520, width: '92%' }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{selectedEvent.action}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {formatAuditTime(selectedEvent.createdAt)} • {selectedEvent.entity}
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedEvent(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                  USER
                </div>
                <div style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{selectedEvent.user}</div>
              </div>

              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                  DESCRIPTION
                </div>
                <div style={{ color: 'var(--text-dark)', lineHeight: 1.5 }}>{selectedEvent.description}</div>
              </div>

              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                    METADATA
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: 12,
                      borderRadius: 10,
                      background: 'var(--card-inner, #f8fafc)',
                      color: 'var(--text-dark)',
                      fontSize: 12,
                      overflowX: 'auto',
                    }}
                  >
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AuditLogsPage;
