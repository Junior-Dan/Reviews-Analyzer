import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

export function PairDevicePage() {
  usePageMeta('login', 'Pair Device | Reviews Analyzer');
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workspaceName, setWorkspaceName] = useState('Reviews Analyzer');
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState<'phone' | 'tablet' | 'desktop' | 'other'>('phone');
  const [osName, setOsName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paired, setPaired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadInfo() {
      if (!code) {
        setError('Missing pairing code. Please scan the QR code again.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/devices/pair-info/${encodeURIComponent(code)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data.message || 'Invalid or expired QR code.');
          setLoading(false);
          return;
        }
        if (data.status === 'active') {
          setPaired(true);
          setDeviceName(data.device?.name || 'Your Device');
          setLoading(false);
          return;
        }
        setWorkspaceName(data.workspaceName || 'Reviews Analyzer');
        setDeviceName(data.suggestedName || 'Mobile Phone');
        if (['phone', 'tablet', 'desktop', 'other'].includes(data.suggestedType)) {
          setDeviceType(data.suggestedType);
        }
        setOsName(data.suggestedOs || '');
      } catch {
        if (!cancelled) setError('Network error while checking pairing code.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadInfo();
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function handlePair(e: React.FormEvent) {
    e.preventDefault();
    if (!code || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/devices/complete-pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name: deviceName.trim() || 'Mobile Phone',
          deviceType,
          os: osName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Could not pair device.');
        setSubmitting(false);
        return;
      }
      setPaired(true);
    } catch {
      setError('Failed to connect to server.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'linear-gradient(145deg, #0f172a 0%, #111827 55%, #064e3b 100%)',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#ffffff',
          borderRadius: 20,
          padding: '28px 24px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#17533b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Pair Device</div>
            <div style={{ fontSize: 12.5, color: '#64748b' }}>Workspace: {workspaceName}</div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '28px 0', textAlign: 'center', color: '#64748b', fontSize: 13.5 }}>
            Verifying pairing session...
          </div>
        ) : paired ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              Device Connected!
            </div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              <strong>{deviceName}</strong> is now linked to your Reviews Analyzer workspace. You can close this tab.
            </div>
          </div>
        ) : error ? (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        ) : (
          <form onSubmit={handlePair} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Device Name
              </label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. Dan's iPhone 15"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  color: '#0f172a',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Device Type
              </label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value as 'phone' | 'tablet' | 'desktop' | 'other')}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  color: '#0f172a',
                  background: '#ffffff',
                  boxSizing: 'border-box',
                }}
              >
                <option value="phone">Phone</option>
                <option value="tablet">Tablet</option>
                <option value="desktop">Desktop / Laptop</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 4,
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: 'none',
                background: '#17533b',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Pairing...' : 'Pair This Device'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default PairDevicePage;
