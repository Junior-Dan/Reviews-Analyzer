import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { SkeletonBox } from '../components/Skeleton';
import { usePageMeta } from '../hooks/usePageMeta';
import { authFetch } from '../utils/api';
import '../styles/dashboard.css';

type DashboardModal =
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

interface AlertItem {
  type?: string;
  title?: string;
  timestamp?: string;
  message?: string;
}

interface PackageItem {
  appName?: string;
  packageName?: string;
  platform?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatShortDate(d: Date) {
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function isSameDay(a: Date | null, b: Date | null) {
  return Boolean(
    a &&
      b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
  );
}

export function DashboardPage() {
  usePageMeta('dashboard', 'Reviews Analyzer - Executive Dashboard');
  const navigate = useNavigate();

  const barCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyticsChartRef = useRef<Chart | null>(null);
  const waveChartRef = useRef<Chart | null>(null);
  const calendarWrapperRef = useRef<HTMLDivElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<DashboardModal>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  // Calendar state
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calCurrentYear, setCalCurrentYear] = useState(() => new Date().getFullYear());
  const [calCurrentMonth, setCalCurrentMonth] = useState(() => new Date().getMonth());
  const [calStartDate, setCalStartDate] = useState<Date | null>(null);
  const [calEndDate, setCalEndDate] = useState<Date | null>(null);
  const [periodLabel, setPeriodLabel] = useState('3 Months');
  const [activePreset, setActivePreset] = useState<string | null>('3 Months');

  // KPI & Gauge state
  const [kpiAnalyzedVal, setKpiAnalyzedVal] = useState('0');
  const [kpiPosPercentVal, setKpiPosPercentVal] = useState('0%');
  const [kpiStoreTotalVal, setKpiStoreTotalVal] = useState('0');
  const [kpiReplyTimeVal, setKpiReplyTimeVal] = useState('0%');

  const [gauge1, setGauge1] = useState({ pct: 0, count: '0' });
  const [gauge2, setGauge2] = useState({ pct: 0, count: '0' });
  const [gauge3, setGauge3] = useState({ pct: 0, count: '0' });

  const [topCategories, setTopCategories] = useState(['0 rev', '0 rev', '0 rev']);
  const [topChannels, setTopChannels] = useState(['0.0 ★', '0.0 ★', '0.0 ★']);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [trendStats, setTrendStats] = useState({ positive: 0, bugs: 0, total: 0 });
  const monthlyTrendsRef = useRef<{ name: string; total: number; positive: number; negative: number }[]>([]);

  // Wave card state
  const [scopeTab, setScopeTab] = useState<'all' | 'focus'>('focus');
  const [wavePeriod, setWavePeriod] = useState<'year' | 'month' | 'day'>('day');

  // Modal states
  const [newAppName, setNewAppName] = useState('');
  const [newAppPlatform, setNewAppPlatform] = useState('google');
  const [newAppId, setNewAppId] = useState('');

  const [monitoredPackages, setMonitoredPackages] = useState<PackageItem[] | null>(null);
  const [monitoredError, setMonitoredError] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Support Agent');
  const [devices, setDevices] = useState([
    { id: 's24', name: 'Samsung Galaxy S24 Ultra (QA Device)', meta: 'Android 14 • Google Play & Galaxy Store Push', iconBg: '#eff6ff', iconColor: '#2563eb', type: 'phone' },
    { id: 'tizen', name: 'Samsung Smart TV Tizen 8.0 Lab', meta: 'Tizen OS • Telemetry & Crash Log Bridge', iconBg: '#f5f3ff', iconColor: '#7c3aed', type: 'tv' },
  ]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastVisible(false), 3200);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (calendarWrapperRef.current && !calendarWrapperRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    const isDarkTheme = document.documentElement.dataset.theme === 'dark';
    if (barCanvasRef.current) {
      analyticsChartRef.current = new Chart(barCanvasRef.current, {
        type: 'bar',
        data: {
          labels: ['No Data'],
          datasets: [
            {
              type: 'bar',
              label: 'Previous Period',
              data: [0],
              backgroundColor: '#e2e8f0',
              borderRadius: 5,
              barPercentage: 0.55,
              categoryPercentage: 0.65,
            },
            {
              type: 'bar',
              label: 'Current Period',
              data: [0],
              backgroundColor: '#a2d2be',
              hoverBackgroundColor: '#4ea67e',
              borderRadius: 5,
              barPercentage: 0.55,
              categoryPercentage: 0.65,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#17533b',
              titleFont: { size: 11, weight: 'bold' },
              padding: 8,
              cornerRadius: 6,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: isDarkTheme ? '#ffffff' : '#64748b', font: { size: 11, weight: 'bold' } },
            },
            y: {
              display: false,
              grid: { display: false },
              beginAtZero: true,
            },
          },
        },
      });
    }

    if (waveCanvasRef.current) {
      waveChartRef.current = new Chart(waveCanvasRef.current, {
        type: 'line',
        data: {
          labels: ['No Data'],
          datasets: [
            {
              data: [0],
              borderColor: '#17533b',
              borderWidth: 2,
              tension: 0.45,
              pointRadius: 0,
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: isDarkTheme ? '#ffffff' : '#94a3b8', font: { size: 8.5 } },
            },
            y: {
              display: false,
              grid: { display: false },
            },
          },
        },
      });
    }

    const loadSummaryData = async () => {
      try {
        const res = await authFetch('/dashboard/summary');
        if (!res.ok) return;
        const data = await res.json();
        const summary = data.summary;
        if (!summary) return;

        const hasData = Number(summary.totalReviews || 0) > 0;
        const parsedPos = parseInt(summary.kpis?.positiveRatio, 10);
        const displayPosRatio = !hasData
          ? '0%'
          : !isNaN(parsedPos)
          ? `${parsedPos}%`
          : '0%';
        setKpiAnalyzedVal(hasData ? summary.kpis?.analyzedCount || '0' : '0');
        setKpiPosPercentVal(displayPosRatio);
        setKpiStoreTotalVal(hasData ? summary.kpis?.storeRatingsCount || '0' : '0');
        setKpiReplyTimeVal(hasData ? summary.kpis?.responseRate || '0%' : '0%');

        const csatPct = hasData && summary.kpis?.csat ? summary.kpis.csat.percentage : 0;
        setGauge1({ pct: csatPct, count: (summary.kpis?.csat?.count ?? 0).toLocaleString() });
        setGauge2({
          pct: summary.kpis?.bugResolution?.percentage ?? 0,
          count: (summary.kpis?.bugResolution?.count ?? 0).toLocaleString(),
        });
        setGauge3({
          pct: summary.kpis?.featureEngagement?.percentage ?? 0,
          count: (summary.kpis?.featureEngagement?.count ?? 0).toLocaleString(),
        });

        const cats = (summary.categoryDist || {}) as Record<string, number>;
        const catEntries = Object.entries(cats).sort((a, b) => b[1] - a[1]);
        setTopCategories([
          catEntries[0] ? `${catEntries[0][1]} rev` : '0 rev',
          catEntries[1] ? `${catEntries[1][1]} rev` : '0 rev',
          catEntries[2] ? `${catEntries[2][1]} rev` : '0 rev',
        ]);

        const platforms = summary.platformBreakdown || [];
        if (platforms.length > 0) {
          setTopChannels([
            platforms[0] ? `${platforms[0].avgRating || '0.0'} ★` : '0.0 ★',
            platforms[1] ? `${platforms[1].avgRating || '0.0'} ★` : '0.0 ★',
            platforms[2] ? `${platforms[2].avgRating || '0.0'} ★` : '0.0 ★',
          ]);
        } else {
          setTopChannels(['0.0 ★', '0.0 ★', '0.0 ★']);
        }

        setAlerts(summary.alerts || []);

        setTrendStats({
          positive: Number(summary.sentimentDist?.Positive || 0),
          bugs: Number(summary.categoryDist?.['Bugs & Crashes'] || 0),
          total: Number(summary.totalReviews || 0),
        });

        const trends: { name: string; total: number; positive: number; negative: number }[] =
          Array.isArray(summary.monthlyTrends) ? summary.monthlyTrends : [];
        monthlyTrendsRef.current = trends;

        if (analyticsChartRef.current) {
          if (trends.length > 0) {
            const recent = trends.slice(-3);
            analyticsChartRef.current.data.labels = recent.map((r) => r.name);
            analyticsChartRef.current.data.datasets[0].data = recent.map((r) => Math.round(r.total * 0.6));
            analyticsChartRef.current.data.datasets[1].data = recent.map((r) => r.total);
          } else {
            analyticsChartRef.current.data.labels = ['No Data'];
            analyticsChartRef.current.data.datasets[0].data = [0];
            analyticsChartRef.current.data.datasets[1].data = [0];
          }
          analyticsChartRef.current.update();
        }

        if (waveChartRef.current) {
          if (trends.length > 0) {
            waveChartRef.current.data.labels = trends.map((r) => r.name);
            waveChartRef.current.data.datasets[0].data = trends.map((r) => r.total);
          } else {
            waveChartRef.current.data.labels = ['No Data'];
            waveChartRef.current.data.datasets[0].data = [0];
          }
          waveChartRef.current.update();
        }
      } catch (err) {
        console.error('Error loading summary:', err);
      } finally {
        setSummaryLoading(false);
      }
    };

    loadSummaryData();

    return () => {
      analyticsChartRef.current?.destroy();
      waveChartRef.current?.destroy();
    };
  }, []);

  const gaugeOffset = (pct: number) => {
    const circumference = 2 * Math.PI * 28;
    return circumference - (pct / 100) * circumference;
  };

  const handleWavePeriod = (period: 'year' | 'month' | 'day') => {
    setWavePeriod(period);
    const chart = waveChartRef.current;
    if (!chart) return;
    const trends = monthlyTrendsRef.current;
    if (trends.length === 0) {
      chart.data.labels = ['No Data'];
      chart.data.datasets[0].data = [0];
      chart.update();
      return;
    }
    if (period === 'year') {
      const byYear = new Map<string, number>();
      trends.forEach((t) => {
        const yr = t.name.split(' ').pop() || t.name;
        byYear.set(yr, (byYear.get(yr) || 0) + t.total);
      });
      chart.data.labels = Array.from(byYear.keys());
      chart.data.datasets[0].data = Array.from(byYear.values());
    } else if (period === 'month') {
      const recent = trends.slice(-6);
      chart.data.labels = recent.map((t) => t.name);
      chart.data.datasets[0].data = recent.map((t) => t.total);
    } else {
      const recent = trends.slice(-3);
      chart.data.labels = recent.map((t) => t.name);
      chart.data.datasets[0].data = recent.map((t) => t.total);
    }
    chart.update();
  };

  const changeCalMonth = (delta: number) => {
    let nextMonth = calCurrentMonth + delta;
    let nextYear = calCurrentYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setCalCurrentMonth(nextMonth);
    setCalCurrentYear(nextYear);
  };

  const selectCalDay = (clickedDate: Date) => {
    setActivePreset(null);
    if (!calStartDate || (calStartDate && calEndDate)) {
      setCalStartDate(clickedDate);
      setCalEndDate(null);
    } else if (clickedDate < calStartDate) {
      setCalEndDate(calStartDate);
      setCalStartDate(clickedDate);
    } else {
      setCalEndDate(clickedDate);
    }
  };

  const selectPresetPeriod = (presetLabel: string) => {
    setActivePreset(presetLabel);
    setCalStartDate(null);
    setCalEndDate(null);
    setPeriodLabel(presetLabel);

    const chart = analyticsChartRef.current;
    if (chart) {
      if (presetLabel === '3 Months') {
        chart.data.labels = ['October', 'November', 'December'];
        chart.data.datasets[0].data = [180, 240, 210];
        chart.data.datasets[1].data = [290, 420, 320];
      } else if (presetLabel === '6 Months') {
        chart.data.labels = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        chart.data.datasets[0].data = [140, 165, 190, 180, 240, 210];
        chart.data.datasets[1].data = [210, 250, 275, 290, 420, 320];
      } else if (presetLabel === '1 Year') {
        chart.data.labels = ['Q1', 'Q2', 'Q3', 'Q4'];
        chart.data.datasets[0].data = [520, 610, 590, 630];
        chart.data.datasets[1].data = [680, 790, 840, 1030];
      }
      chart.update();
    }

    setCalendarOpen(false);
    showToast(`Analytics period set to ${presetLabel}`);
  };

  const applyCustomDateRange = () => {
    if (!calStartDate) {
      setCalendarOpen(false);
      return;
    }
    const end = calEndDate || calStartDate;
    const labelText = isSameDay(calStartDate, end)
      ? `${formatShortDate(calStartDate)}, ${calStartDate.getFullYear()}`
      : `${formatShortDate(calStartDate)} - ${formatShortDate(end)}`;
    setPeriodLabel(labelText);

    const chart = analyticsChartRef.current;
    if (chart) {
      const diffDays = Math.max(1, Math.round((end.getTime() - calStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const steps = Math.min(6, Math.max(3, diffDays));
      const newLabels: string[] = [];
      const prevData: number[] = [];
      const currData: number[] = [];

      for (let i = 0; i < steps; i++) {
        const d = new Date(
          calStartDate.getTime() + ((end.getTime() - calStartDate.getTime()) * i) / Math.max(1, steps - 1)
        );
        newLabels.push(formatShortDate(d));
        const seed = (d.getDate() * 13 + (d.getMonth() + 1) * 29 + i * 17) % 180;
        prevData.push(110 + seed);
        currData.push(180 + Math.round(seed * 1.35));
      }

      chart.data.labels = newLabels;
      chart.data.datasets[0].data = prevData;
      chart.data.datasets[1].data = currData;
      chart.update();
    }

    setCalendarOpen(false);
    showToast(`Filtered Analytics: ${labelText}`);
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
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to add app');
      }
    } catch {
      showToast('App registered');
      setActiveModal(null);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Do you wish to log out of the Reviews Analyzer?')) {
      navigate('/');
    }
  };

  const firstDayIndex = new Date(calCurrentYear, calCurrentMonth, 1).getDay();
  const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
  const today = new Date();
  const calRangeHint =
    calStartDate && calEndDate
      ? `${formatShortDate(calStartDate)} – ${formatShortDate(calEndDate)}`
      : calStartDate
        ? `${formatShortDate(calStartDate)} (pick end)`
        : 'Select date or range';

  return (
    <>
      <Sidebar
        activePage="dashboard"
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
            onSearchKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigate(`/reviews?search=${encodeURIComponent(searchQuery)}`);
              }
            }}
            onAddApp={() => setActiveModal('addApp')}
            onAlerts={() => setActiveModal('alerts')}
            onProfile={() => setActiveModal('account')}
            showAlertDot={alerts.length > 0}
          />

          <div className="dashboard-grid">
            <div className="grid-column">
              <div className="card card-analytics">
                <div className="card-header">
                  <div className="card-title">Analytics</div>
                  <div className="calendar-wrapper" id="analyticsCalendarWrapper" ref={calendarWrapperRef}>
                    <div
                      className="pill-badge pill-badge-green"
                      id="periodSelectBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCalendarOpen((prev) => !prev);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <span id="periodLabel">{periodLabel}</span>
                    </div>

                    <div
                      className={`custom-calendar-popover${calendarOpen ? ' open' : ''}`}
                      id="customCalendarPopover"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="cal-presets">
                        {['3 Months', '6 Months', '1 Year'].map((preset) => (
                          <button
                            key={preset}
                            className={`cal-preset-btn${activePreset === preset ? ' active' : ''}`}
                            onClick={() => selectPresetPeriod(preset)}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      <div className="cal-header">
                        <button className="cal-nav-btn" onClick={() => changeCalMonth(-1)} title="Previous Month">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                          </svg>
                        </button>
                        <div className="cal-month-title" id="calMonthTitle">
                          {MONTH_NAMES[calCurrentMonth]} {calCurrentYear}
                        </div>
                        <button className="cal-nav-btn" onClick={() => changeCalMonth(1)} title="Next Month">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </button>
                      </div>

                      <div className="cal-weekdays">
                        <span>Su</span>
                        <span>Mo</span>
                        <span>Tu</span>
                        <span>We</span>
                        <span>Th</span>
                        <span>Fr</span>
                        <span>Sa</span>
                      </div>

                      <div className="cal-days-grid" id="calDaysGrid">
                        {Array.from({ length: firstDayIndex }).map((_, i) => (
                          <div key={`empty-${i}`} className="cal-day empty" />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, idx) => {
                          const day = idx + 1;
                          const cellDate = new Date(calCurrentYear, calCurrentMonth, day);
                          const classes = ['cal-day'];
                          if (isSameDay(cellDate, today)) classes.push('today');
                          if (calStartDate && isSameDay(cellDate, calStartDate)) classes.push('selected-start');
                          if (calEndDate && isSameDay(cellDate, calEndDate)) classes.push('selected-end');
                          if (calStartDate && calEndDate && cellDate > calStartDate && cellDate < calEndDate) {
                            classes.push('in-range');
                          }
                          return (
                            <div
                              key={day}
                              className={classes.join(' ')}
                              onClick={() => selectCalDay(cellDate)}
                            >
                              {day}
                            </div>
                          );
                        })}
                      </div>

                      <div className="cal-footer">
                        <div className="cal-range-hint" id="calRangeHint">
                          {calRangeHint}
                        </div>
                        <button className="cal-apply-btn" onClick={applyCustomDateRange}>
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="chart-container-rel">
                  <canvas ref={barCanvasRef} id="analyticsBarChart"></canvas>
                </div>
              </div>

              <div className="card card-visitors">
                <div className="card-title" style={{ marginBottom: '6px' }}>
                  Review Velocity
                </div>

                <div className="metrics-container">
                  <div className="metric-row">
                    <div className="metric-main">
                      <div className="metric-num" id="kpiAnalyzedVal">
                        {summaryLoading ? <SkeletonBox width={64} height={26} /> : kpiAnalyzedVal}
                      </div>
                      <div className="metric-label">Analyzed Reviews</div>
                    </div>

                    <div className="sparkline-box">
                      <svg viewBox="0 0 110 28" preserveAspectRatio="none">
                        <polyline points="4,19 23,14 33,19 63,11 72,17 104,3" fill="none" stroke="#92c848" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"></polyline>
                      </svg>
                    </div>

                    <div className="metric-sub-group">
                      <div className="metric-sub-val" id="kpiPosPercentVal">
                        {summaryLoading ? <SkeletonBox width={48} height={22} /> : kpiPosPercentVal}
                      </div>
                      <div className="metric-label">Positive Sentiment</div>
                    </div>

                    <div className="pill-tag up" title="Sentiment score increased by 14.2% this period">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                        <polyline points="17 6 23 6 23 12"></polyline>
                      </svg>
                      <span>+14.2%</span>
                    </div>
                  </div>

                  <div className="metric-row">
                    <div className="metric-main">
                      <div className="metric-num" id="kpiStoreTotalVal">
                        {summaryLoading ? <SkeletonBox width={64} height={26} /> : kpiStoreTotalVal}
                      </div>
                      <div className="metric-label">Total Store Reach</div>
                    </div>

                    <div className="sparkline-box">
                      <svg viewBox="0 0 110 28" preserveAspectRatio="none">
                        <polyline points="4,24 19,14 38,20 55,8 78,23 108,3" fill="none" stroke="#2fa4dc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"></polyline>
                      </svg>
                    </div>

                    <div className="metric-sub-group">
                      <div className="metric-sub-val" id="kpiReplyTimeVal">
                        {summaryLoading ? <SkeletonBox width={48} height={22} /> : kpiReplyTimeVal}
                      </div>
                      <div className="metric-label">Response Rate</div>
                    </div>

                    <div className="pill-tag time" title="Developer & AI response coverage increased by 8.4%">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                        <polyline points="17 6 23 6 23 12"></polyline>
                      </svg>
                      <span>+8.4%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card card-donuts">
                <div className="card-title" style={{ marginBottom: '6px' }}>
                  Customer Health &amp; CSAT
                </div>

                <div className="donuts-flex">
                  <div className="donut-item">
                    <div className="gauge-wrapper">
                      <svg>
                        <circle className="gauge-bg" cx="36" cy="36" r="28"></circle>
                        <circle
                          className="gauge-meter"
                          id="gaugeRing1"
                          cx="36"
                          cy="36"
                          r="28"
                          stroke="#f59e0b"
                          strokeDasharray="175.9"
                          strokeDashoffset={gaugeOffset(gauge1.pct)}
                        ></circle>
                      </svg>
                      <div className="gauge-center-text" id="gauge1Val">
                        {gauge1.pct}%
                      </div>
                    </div>
                    <div className="gauge-details">
                      <div className="gauge-label">Positive CSAT</div>
                      <div className="gauge-count" id="gauge1Count">
                        {gauge1.count}
                      </div>
                    </div>
                  </div>

                  <div className="donut-item">
                    <div className="gauge-wrapper">
                      <svg>
                        <circle className="gauge-bg" cx="36" cy="36" r="28"></circle>
                        <circle
                          className="gauge-meter"
                          id="gaugeRing2"
                          cx="36"
                          cy="36"
                          r="28"
                          stroke="#862469"
                          strokeDasharray="175.9"
                          strokeDashoffset={gaugeOffset(gauge2.pct)}
                        ></circle>
                      </svg>
                      <div className="gauge-center-text" id="gauge2Val">
                        {gauge2.pct}%
                      </div>
                    </div>
                    <div className="gauge-details">
                      <div className="gauge-label">Bug Resolution</div>
                      <div className="gauge-count" id="gauge2Count">
                        {gauge2.count}
                      </div>
                    </div>
                  </div>

                  <div className="donut-item">
                    <div className="gauge-wrapper">
                      <svg>
                        <circle className="gauge-bg" cx="36" cy="36" r="28"></circle>
                        <circle
                          className="gauge-meter"
                          id="gaugeRing3"
                          cx="36"
                          cy="36"
                          r="28"
                          stroke="#5d66df"
                          strokeDasharray="175.9"
                          strokeDashoffset={gaugeOffset(gauge3.pct)}
                        ></circle>
                      </svg>
                      <div className="gauge-center-text" id="gauge3Val">
                        {gauge3.pct}%
                      </div>
                    </div>
                    <div className="gauge-details">
                      <div className="gauge-label">Feature Requests</div>
                      <div className="gauge-count" id="gauge3Count">
                        {gauge3.count}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid-column">
              <div className="card card-wave">
                <div className="card-title" style={{ marginBottom: '10px' }}>
                  Multi-Store Rating Trajectory
                </div>

                <div className="segment-switch-wrapper">
                  <div
                    className={`segment-tab${scopeTab === 'all' ? ' active' : ''}`}
                    id="tabAllIn"
                    onClick={() => setScopeTab('all')}
                  >
                    All Stores
                  </div>
                  <div
                    className={`segment-tab${scopeTab === 'focus' ? ' active' : ''}`}
                    id="tabDolor"
                    onClick={() => setScopeTab('focus')}
                  >
                    Active Store
                  </div>
                </div>

                <div className="card-subtitle">Rating &amp; Sentiment Velocity</div>

                <div className="trend-stats-box">
                  <div className="trend-metrics-row">
                    <div className="trend-metric-col">
                      <div className="trend-metric-val" id="statSoldOut">
                        {summaryLoading ? <SkeletonBox width={46} height={20} /> : trendStats.positive.toLocaleString()}
                      </div>
                      <div className="trend-metric-sub">Positive</div>
                    </div>
                    <div className="trend-metric-col">
                      <div className="trend-metric-val" id="statRefund">
                        {summaryLoading ? <SkeletonBox width={46} height={20} /> : trendStats.bugs.toLocaleString()}
                      </div>
                      <div className="trend-metric-sub">Critical Bugs</div>
                    </div>
                    <div className="trend-metric-col">
                      <div className="trend-metric-val" id="statStock">
                        {summaryLoading ? (
                          <SkeletonBox width={46} height={20} />
                        ) : trendStats.total >= 1000 ? (
                          `${(trendStats.total / 1000).toFixed(1)}K`
                        ) : (
                          trendStats.total.toLocaleString()
                        )}
                      </div>
                      <div className="trend-metric-sub">Total Feedback</div>
                    </div>
                  </div>

                  <div className="wave-chart-box">
                    <canvas ref={waveCanvasRef} id="splineWaveChart"></canvas>
                  </div>

                  <div className="period-pill-group">
                    <div
                      className={`period-pill${wavePeriod === 'year' ? ' active' : ''}`}
                      onClick={() => handleWavePeriod('year')}
                    >
                      Yearly
                    </div>
                    <div
                      className={`period-pill${wavePeriod === 'month' ? ' active' : ''}`}
                      onClick={() => handleWavePeriod('month')}
                    >
                      Monthly
                    </div>
                    <div
                      className={`period-pill${wavePeriod === 'day' ? ' active' : ''}`}
                      onClick={() => handleWavePeriod('day')}
                    >
                      Day
                    </div>
                  </div>
                </div>
              </div>

              <div className="card card-lists">
                <div className="card-title" style={{ marginBottom: '2px' }}>
                  Key Performance Drivers
                </div>

                <div className="lists-grid">
                  <div>
                    <div className="list-header">Top Issue Areas</div>
                    <ul className="ranked-list" id="topProductsList">
                      <li className="ranked-item">
                        <span className="ranked-item-name">1. UI &amp; Design</span>
                        <span className="ranked-item-right">
                          <span className="ranked-item-val" id="tp1">
                            {topCategories[0]}
                          </span>
                          <span className="mini-trend-line" title="Rising trend">
                            <svg viewBox="0 0 28 12" preserveAspectRatio="none">
                              <polyline points="1,10 8,7 14,9 21,4 27,2" fill="none" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"></polyline>
                            </svg>
                          </span>
                        </span>
                      </li>
                      <li className="ranked-item">
                        <span className="ranked-item-name">2. Bug Fixes</span>
                        <span className="ranked-item-right">
                          <span className="ranked-item-val" id="tp2">
                            {topCategories[1]}
                          </span>
                          <span className="mini-trend-line" title="Falling trend">
                            <svg viewBox="0 0 28 12" preserveAspectRatio="none">
                              <polyline points="1,2 8,5 14,4 21,9 27,10" fill="none" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"></polyline>
                            </svg>
                          </span>
                        </span>
                      </li>
                      <li className="ranked-item">
                        <span className="ranked-item-name">3. Performance</span>
                        <span className="ranked-item-right">
                          <span className="ranked-item-val" id="tp3">
                            {topCategories[2]}
                          </span>
                          <span className="mini-trend-line" title="Rising trend">
                            <svg viewBox="0 0 28 12" preserveAspectRatio="none">
                              <polyline points="1,9 7,6 14,8 20,3 27,2" fill="none" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"></polyline>
                            </svg>
                          </span>
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <div className="list-header">Store Channels</div>
                    <ul className="ranked-list" id="topBuyerList">
                      <li className="ranked-item">
                        <span className="ranked-item-name">1. Google Play</span>
                        <span className="ranked-item-right">
                          <span className="ranked-item-val" id="tb1">
                            {topChannels[0]}
                          </span>
                          <span className="mini-trend-line" title="Rising trend">
                            <svg viewBox="0 0 28 12" preserveAspectRatio="none">
                              <polyline points="1,10 8,6 15,8 21,3 27,2" fill="none" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"></polyline>
                            </svg>
                          </span>
                        </span>
                      </li>
                      <li className="ranked-item">
                        <span className="ranked-item-name">2. Samsung Store</span>
                        <span className="ranked-item-right">
                          <span className="ranked-item-val" id="tb2">
                            {topChannels[1]}
                          </span>
                          <span className="mini-trend-line" title="Falling trend">
                            <svg viewBox="0 0 28 12" preserveAspectRatio="none">
                              <polyline points="1,3 8,6 14,5 21,9 27,11" fill="none" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"></polyline>
                            </svg>
                          </span>
                        </span>
                      </li>
                      <li className="ranked-item">
                        <span className="ranked-item-name">3. Apple Store</span>
                        <span className="ranked-item-right">
                          <span className="ranked-item-val" id="tb3">
                            {topChannels[2]}
                          </span>
                          <span className="mini-trend-line" title="Rising trend">
                            <svg viewBox="0 0 28 12" preserveAspectRatio="none">
                              <polyline points="1,9 9,5 15,7 22,3 27,1" fill="none" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"></polyline>
                            </svg>
                          </span>
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="downloads-section">
                  <div className="list-header">Top Downloads</div>
                  <ul className="downloads-list" id="topDownloadsList">
                    <li className="ranked-item">
                      <span className="ranked-item-name">1. Google Play</span>
                      <span className="ranked-item-right">
                        <span className="ranked-item-val" id="td1">124K</span>
                        <span className="mini-trend-line" title="Rising trend">
                          <svg viewBox="0 0 28 12" preserveAspectRatio="none">
                            <polyline points="1,10 8,7 14,9 21,4 27,2" fill="none" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"></polyline>
                          </svg>
                        </span>
                      </span>
                    </li>
                    <li className="ranked-item">
                      <span className="ranked-item-name">2. Apple Store</span>
                      <span className="ranked-item-right">
                        <span className="ranked-item-val" id="td2">64.5K</span>
                        <span className="mini-trend-line" title="Rising trend">
                          <svg viewBox="0 0 28 12" preserveAspectRatio="none">
                            <polyline points="1,11 7,7 14,8 20,4 27,2" fill="none" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"></polyline>
                          </svg>
                        </span>
                      </span>
                    </li>
                    <li className="ranked-item">
                      <span className="ranked-item-name">3. Samsung Store</span>
                      <span className="ranked-item-right">
                        <span className="ranked-item-val" id="td3">24.4K</span>
                        <span className="mini-trend-line" title="Falling trend">
                          <svg viewBox="0 0 28 12" preserveAspectRatio="none">
                            <polyline points="1,2 8,5 14,4 21,9 27,10" fill="none" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"></polyline>
                          </svg>
                        </span>
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: ADD NEW APPLICATION */}
      <div className={`modal-overlay${activeModal === 'addApp' ? ' active' : ''}`} id="addAppModal">
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
                id="newAppName"
                placeholder="e.g. Western Flix Cinema"
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Store Platform
              </label>
              <select
                id="newAppPlatform"
                value={newAppPlatform}
                onChange={(e) => setNewAppPlatform(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px', outline: 'none' }}
                aria-label="Select option"
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
                id="newAppId"
                placeholder="e.g. com.samsung.westernflix or 1201739921"
                value={newAppId}
                onChange={(e) => setNewAppId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
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

      {/* MODAL: MONITORED APPS CATALOG */}
      <div className={`modal-overlay${activeModal === 'monitoredApps' ? ' active' : ''}`} id="monitoredAppsModal">
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">Monitored Applications</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>
              &times;
            </button>
          </div>

          <div id="monitoredAppsListContainer" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '290px', overflowY: 'auto' }}>
            {monitoredError ? (
              <div style={{ fontSize: '12.5px', color: '#64748b' }}>Unable to load tracked applications.</div>
            ) : monitoredPackages === null ? (
              <div style={{ fontSize: '12.5px', color: '#64748b', padding: '12px 0' }}>Loading tracked applications...</div>
            ) : monitoredPackages.length === 0 ? (
              <div style={{ fontSize: '12.5px', color: '#64748b' }}>No applications currently tracked.</div>
            ) : (
              monitoredPackages.map((p, idx) => (
                <div
                  key={idx}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>{p.appName || p.packageName}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {p.packageName} • <span style={{ textTransform: 'capitalize' }}>{p.platform || 'Store'}</span>
                    </div>
                  </div>
                  <span style={{ background: '#dcfce7', color: '#166534', fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '999px' }}>
                    Active
                  </span>
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <button className="btn-action-outline" onClick={() => setActiveModal(null)}>
              Close
            </button>
            <button className="btn-action-solid" onClick={() => setActiveModal('addApp')}>
              + Track New App
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: SETTINGS */}
      <div className={`modal-overlay${activeModal === 'settings' ? ' active' : ''}`} id="settingsModal">
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
              <input type="checkbox" defaultChecked style={{ width: '16px', height: '16px', accentColor: 'var(--primary-green)', cursor: 'pointer' }} aria-label="Input field" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>AI Sentiment Spike Alerts</div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>Notify when negative sentiment exceeds threshold</div>
              </div>
              <input type="checkbox" defaultChecked style={{ width: '16px', height: '16px', accentColor: 'var(--primary-green)', cursor: 'pointer' }} aria-label="Input field" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', marginTop: '4px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>Session &amp; Security</div>
                <div style={{ fontSize: '11.5px', color: '#b91c1c' }}>Sign out of your current workspace session</div>
              </div>
              <button
                onClick={handleLogout}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button className="btn-action-outline" onClick={() => setActiveModal(null)}>
              Close
            </button>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '10px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>ROLE &amp; ACCESS</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginTop: '2px' }}>Workspace Admin</div>
              </div>
              <div style={{ padding: '10px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>AI REPLY APPROVAL</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534', marginTop: '2px' }}>Human-in-the-Loop</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
            <button className="btn-action-outline" onClick={() => setActiveModal('teams')}>
              Manage Teams
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-action-outline" onClick={() => setActiveModal(null)}>
                Close
              </button>
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

      {/* MODAL: TEAMS & PERMISSIONS */}
      <div
        className={`modal-overlay${activeModal === 'teams' ? ' active' : ''}`}
        id="teamsModal"
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
                id="inviteTeamEmail"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                style={{ flex: 1, padding: '8px 11px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none' }}
              />
              <select
                id="inviteTeamRole"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff', color: '#0f172a', fontWeight: 600, outline: 'none' }}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '11px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--primary-green)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                    YN
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                      Don Carlos{' '}
                      <span style={{ fontSize: '10.5px', color: '#166534', background: '#dcfce7', padding: '2px 6px', borderRadius: '999px', marginLeft: '4px' }}>
                        You
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>admin@reviews-analyzer.ai</div>
                  </div>
                </div>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a', background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px' }}>
                  Workspace Admin
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '11px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                    SJ
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>Sarah Jenkins</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>s.jenkins@reviews-analyzer.ai</div>
                  </div>
                </div>
                <select
                  defaultValue="Support Agent"
                  onChange={(e) => showToast(`Updated Sarah Jenkins role to ${e.target.value}`)}
                  style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11.5px', fontWeight: 600, background: '#f8fafc', color: '#334155', outline: 'none', cursor: 'pointer' }}
                  aria-label="Select option"
                >
                  <option>Admin</option>
                  <option>Support Agent</option>
                  <option>Developer</option>
                  <option>Viewer</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '11px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#7c3aed', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                    AR
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>Alex Rivera</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>a.rivera@reviews-analyzer.ai</div>
                  </div>
                </div>
                <select
                  defaultValue="Developer"
                  onChange={(e) => showToast(`Updated Alex Rivera role to ${e.target.value}`)}
                  style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11.5px', fontWeight: 600, background: '#f8fafc', color: '#334155', outline: 'none', cursor: 'pointer' }}
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
        id="connectedDevicesModal"
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
                    {dev.type === 'phone' ? (
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

      {/* MODAL: HELP CENTRE */}
      <div className={`modal-overlay${activeModal === 'helpCentre' ? ' active' : ''}`} id="helpCentreModal">
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">Help Centre &amp; Documentation</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>
              &times;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '11px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>1. Multi-Store Review Syncing</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: 1.45 }}>
                Track apps across Google Play, Apple App Store, Samsung Galaxy Store, and Amazon Appstore from the Monitored Apps menu.
              </div>
            </div>

            <div style={{ padding: '11px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>2. AI Sentiment &amp; Topic Classification</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: 1.45 }}>
                Every incoming review is automatically categorized (Bugs, UI/UX, Performance, Feature Request) with sentiment velocity tracking.
              </div>
            </div>

            <div style={{ padding: '11px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>3. Human-in-the-Loop AI Replies</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: 1.45 }}>
                Click any review row in Messages to expand quick actions, generate tone-tailored AI responses, and approve before publishing.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button className="btn-action-solid" onClick={() => setActiveModal(null)}>
              Got It
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: ALERTS & MONITORING */}
      <div className={`modal-overlay${activeModal === 'alerts' ? ' active' : ''}`} id="alertsModal">
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-title">System Alerts &amp; Review Spikes</div>
            <button className="modal-close" onClick={() => setActiveModal(null)}>
              &times;
            </button>
          </div>

          <div id="alertsContainer" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
            {alerts.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '13px' }}>
                No critical alerts detected. All app stores healthy.
              </div>
            ) : (
              alerts.map((a, idx) => {
                const borderCol = a.type === 'danger' ? '#ef4444' : a.type === 'warning' ? '#f59e0b' : '#3b82f6';
                return (
                  <div
                    key={idx}
                    style={{
                      background: '#f8fafc',
                      borderLeft: `4px solid ${borderCol}`,
                      padding: '10px',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '12.5px' }}>
                      <span>{a.title}</span>
                      <span style={{ fontWeight: 500, fontSize: '10px', color: '#94a3b8' }}>{a.timestamp}</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#47569', marginTop: '3px' }}>{a.message}</div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button className="btn-action-solid" onClick={() => setActiveModal(null)}>
              Close
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
