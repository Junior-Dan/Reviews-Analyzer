import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';
import { setAuthSession } from '../utils/api';
import '../styles/login.css';

type AuthStep = 'entry' | 'password' | 'register';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

export function LoginPage() {
  usePageMeta('login', 'Sentriqe — Unified App Store Intelligence');
  const navigate = useNavigate();
  const arenaRef = useRef<HTMLDivElement | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<AuthStep>('entry');
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const lensSweeperRef = useRef<HTMLDivElement | null>(null);
  const lensGlassRef = useRef<HTMLDivElement | null>(null);
  const wordmarkTextRef = useRef<HTMLSpanElement | null>(null);
  const magnifiedTextRef = useRef<HTMLSpanElement | null>(null);

  const [playLensIntro, setPlayLensIntro] = useState(() => {
    try {
      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) return false;
      const playedInSession = sessionStorage.getItem('sentriqe_lens_intro_played') === '1';
      if (!playedInSession) return true;
      const lastPlayedAt = Number(localStorage.getItem('sentriqe_lens_intro_at') || '0');
      const cooldownMs = 20 * 60 * 1000;
      return !lastPlayedAt || Date.now() - lastPlayedAt >= cooldownMs;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!playLensIntro) return;
    const sweeper = lensSweeperRef.current;
    const glass = lensGlassRef.current;
    const textEl = wordmarkTextRef.current;
    const magEl = magnifiedTextRef.current;
    if (!sweeper || !glass || !textEl || !magEl) return;

    const markTimer = window.setTimeout(() => {
      try {
        sessionStorage.setItem('sentriqe_lens_intro_played', '1');
        localStorage.setItem('sentriqe_lens_intro_at', String(Date.now()));
      } catch {
        // ignore storage errors
      }
    }, 150);

    const iconSize = 44;
    const ringCenterX = 0.609 * iconSize; // 26.8px inside 44px icon
    const ringCenterY = 0.388 * iconSize; // 17.1px inside 44px icon
    const glassRadius = 10.2;
    const magFactor = 1.48;

    const textLeft = textEl.offsetLeft;
    const textWidth = textEl.offsetWidth || 96;
    const restLensX = ringCenterX;
    const sweepStartX = textLeft - 2;
    const sweepEndX = textLeft + textWidth + 2;
    const targetDy = 22 - ringCenterY; // aligns ring center vertically with Sentriqe

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

    const delayMs = 200;
    const totalMs = 3000;
    let rafId = 0;
    let startTime = 0;

    const renderFrame = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime - delayMs;

      if (elapsed < 0) {
        sweeper.style.transform = 'translate3d(0px, 0px, 0) scale(1)';
        glass.style.opacity = '0';
        rafId = window.requestAnimationFrame(renderFrame);
        return;
      }

      const progress = Math.min(1, elapsed / totalMs);
      let lensWorldX = restLensX;
      let scale = 1;
      let glassOpacity = 0;
      let dyFactor = 0;

      if (progress < 0.14) {
        const k = easeInOutSine(progress / 0.14);
        lensWorldX = restLensX + (sweepStartX - restLensX) * k;
        scale = 1 + 0.28 * k;
        dyFactor = k;
        glassOpacity = Math.max(0, (k - 0.3) / 0.7);
      } else if (progress < 0.54) {
        const k = easeInOutSine((progress - 0.14) / 0.4);
        lensWorldX = sweepStartX + (sweepEndX - sweepStartX) * k;
        scale = 1.28;
        dyFactor = 1;
        glassOpacity = 1;
      } else if (progress < 0.88) {
        const k = easeInOutSine((progress - 0.54) / 0.34);
        lensWorldX = sweepEndX + (sweepStartX - sweepEndX) * k;
        scale = 1.28;
        dyFactor = 1;
        glassOpacity = 1;
      } else {
        const k = easeInOutSine((progress - 0.88) / 0.12);
        lensWorldX = sweepStartX + (restLensX - sweepStartX) * k;
        scale = 1.28 - 0.28 * k;
        dyFactor = 1 - k;
        glassOpacity = Math.max(0, 1 - k / 0.75);
      }

      const tx = lensWorldX - (22 + (ringCenterX - 22) * scale);
      const scaledDy = targetDy - (ringCenterY - 22) * (scale - 1);
      const frameDy = scaledDy * dyFactor;
      sweeper.style.transform = `translate3d(${tx.toFixed(2)}px, ${frameDy.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      glass.style.opacity = glassOpacity.toFixed(3);

      const lensXInText = lensWorldX - textLeft;
      const localMagScale = magFactor / scale;
      magEl.style.left = `${(glassRadius - lensXInText).toFixed(2)}px`;
      magEl.style.transformOrigin = `${lensXInText.toFixed(2)}px 50%`;
      magEl.style.transform = `translateY(-50%) scale(${localMagScale.toFixed(4)})`;

      if (progress < 1) {
        rafId = window.requestAnimationFrame(renderFrame);
      } else {
        sweeper.style.transform = '';
        glass.style.opacity = '0';
        setPlayLensIntro(false);
      }
    };

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.clearTimeout(markTimer);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [playLensIntro]);

  useEffect(() => {
    const arena = arenaRef.current;
    if (!arena) return;

    const ballEls = Array.from(arena.querySelectorAll<HTMLElement>('.store-ball'));
    const R = 54;
    const W = arena.clientWidth || 450;
    const H = arena.clientHeight || 460;
    const cols = 3;

    const balls = ballEls.map((el, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = 76 + col * 149;
      const y = 82 + row * 148;
      const speed = 0.24 + (idx % 3) * 0.05;
      const angle = idx * 1.15 + 0.4;
      return {
        el,
        x: Math.min(W - R - 4, Math.max(R + 4, x)),
        y: Math.min(H - R - 4, Math.max(R + 4, y)),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: R,
      };
    });

    let rafId = 0;

    const stepPhysics = () => {
      const width = arena.clientWidth || 450;
      const height = arena.clientHeight || 460;

      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        b.x += b.vx;
        b.y += b.vy;

        if (b.x - b.r < 0) {
          b.x = b.r;
          b.vx = Math.abs(b.vx);
        } else if (b.x + b.r > width) {
          b.x = width - b.r;
          b.vx = -Math.abs(b.vx);
        }

        if (b.y - b.r < 0) {
          b.y = b.r;
          b.vy = Math.abs(b.vy);
        } else if (b.y + b.r > height) {
          b.y = height - b.r;
          b.vy = -Math.abs(b.vy);
        }
      }

      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const b1 = balls[i];
          const b2 = balls[j];
          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b1.r + b2.r + 2;

          if (dist < minDist && dist > 0.0001) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minDist - dist) / 2;
            b1.x -= nx * overlap;
            b1.y -= ny * overlap;
            b2.x += nx * overlap;
            b2.y += ny * overlap;

            const kx = b1.vx - b2.vx;
            const ky = b1.vy - b2.vy;
            const p = nx * kx + ny * ky;
            if (p > 0) {
              b1.vx -= p * nx;
              b1.vy -= p * ny;
              b2.vx += p * nx;
              b2.vy += p * ny;
            }
          }
        }
      }

      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        b.el.style.transform = `translate3d(${(b.x - b.r).toFixed(1)}px, ${(b.y - b.r).toFixed(1)}px, 0)`;
      }

      rafId = requestAnimationFrame(stepPhysics);
    };

    rafId = requestAnimationFrame(stepPhysics);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    fetch('/api/auth/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.googleClientId) setGoogleClientId(data.googleClientId);
      })
      .catch(() => {});
  }, []);

  const openAuthModal = (_mode?: string) => {
    setError('');
    setInfoMsg('');
    setStep('entry');
    setPassword('');
    setFullName('');
    setModalOpen(true);
  };

  const closeAuthModal = () => {
    setModalOpen(false);
    setError('');
    setInfoMsg('');
  };

  const handleGoogleContinue = async () => {
    setError('');
    setInfoMsg('');

    let clientId = googleClientId;
    if (!clientId) {
      try {
        const res = await fetch('/api/auth/config');
        if (res.ok) {
          const cfg = await res.json();
          clientId = cfg.googleClientId || '';
          setGoogleClientId(clientId);
        }
      } catch {
        // Ignore
      }
    }

    if (!clientId) {
      setInfoMsg('Add GOOGLE_CLIENT_ID to .env to enable the live Google Sign-In popup.');
      return;
    }

    setGoogleLoading(true);
    try {
      if (!window.google?.accounts?.oauth2) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Google Sign-In script'));
          document.head.appendChild(script);
        });
      }

      const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: async (resp) => {
          if (resp.error || !resp.access_token) {
            setError('Google sign-in was cancelled or failed.');
            setGoogleLoading(false);
            return;
          }
          try {
            const authRes = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken: resp.access_token }),
            });
            const data = await authRes.json();
            if (!authRes.ok) throw new Error(data.message || 'Google authentication failed');
            setAuthSession(data);
            navigate('/dashboard');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Google authentication failed');
          } finally {
            setGoogleLoading(false);
          }
        },
      });

      tokenClient?.requestAccessToken();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Google Sign-In');
      setGoogleLoading(false);
    }
  };

  const handleEmailContinue = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setInfoMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not verify email');
      setStep(data.exists ? 'password' : 'register');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify email');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = step === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        step === 'register'
          ? { name: fullName.trim(), email: email.trim(), password, role: 'Developer' }
          : { email: email.trim(), password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Authentication failed');
      setAuthSession(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="top-login-btn" onClick={() => openAuthModal()}>
        Login
      </button>

      <div className="landing-shell">
        <div className="hero-main">
          <div className="brand-col">
            <div
              className="brand-wordmark"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, position: 'relative' }}
            >
              <div ref={lensSweeperRef} className="brand-logo-sweeper">
                {playLensIntro && (
                  <div ref={lensGlassRef} className="brand-lens-glass" aria-hidden="true">
                    <span ref={magnifiedTextRef} className="brand-wordmark-magnified">
                      Sentriqe
                    </span>
                  </div>
                )}
                <img
                  src="/system-logo.png"
                  alt="Sentriqe Logo"
                  className="brand-logo-img"
                  style={{
                    width: 44,
                    height: 44,
                    objectFit: 'contain',
                  }}
                />
              </div>
              <span ref={wordmarkTextRef} className="brand-wordmark-text">
                Sentriqe
              </span>
            </div>

            <div className="hero-left-copy">
              <div className="hero-eyebrow">Unified App Store Intelligence</div>
              <h1 className="hero-headline">
                Turn every
                <br />
                app review into
                <br />
                a clear product
                <br />
                advantage.
              </h1>
              <p className="hero-subtext">
                Connect your developer workspace. Sentriqe tracks ratings, uncovers user sentiment, and drafts replies across every store.
              </p>

              <div className="hero-features-grid">
                <div className="hero-feature-item">
                  <span className="hero-feature-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>Live sync: see reviews from every store in one feed</span>
                </div>
                <div className="hero-feature-item">
                  <span className="hero-feature-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>Compare star trends before your next release</span>
                </div>
                <div className="hero-feature-item">
                  <span className="hero-feature-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>Reply directly to users with AI-drafted responses</span>
                </div>
                <div className="hero-feature-item">
                  <span className="hero-feature-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>Instant alerts for bug reports &amp; priority feedback</span>
                </div>
              </div>

              <div className="bottom-cta-wrap">
                <div className="bottom-cta-bar">
                  <div className="bottom-cta-text">
                    Connect your developer workspace
                  </div>
                  <button className="bottom-cta-btn" onClick={() => openAuthModal('register')}>
                    Get Started
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-right-cluster">
            <div className="physics-container" ref={arenaRef} id="storePhysicsArena">
              <div className="store-ball" onClick={() => openAuthModal('login')} title="Google Play Store">
                <svg viewBox="0 0 64 64" fill="none">
                  <defs>
                    <clipPath id="playTriClip">
                      <path d="M19.5 17.5C19.5 15.5 21.7 14.3 23.4 15.3L47.6 29.8C49.2 30.8 49.2 33.2 47.6 34.2L23.4 48.7C21.7 49.7 19.5 48.5 19.5 46.5V17.5Z" />
                    </clipPath>
                  </defs>
                  <circle cx="32" cy="32" r="32" fill="#1e293b" />
                  <g clipPath="url(#playTriClip)">
                    <polygon points="18,13 33.5,32 18,51" fill="#4285F4" />
                    <polygon points="18,13 40.8,26 33.5,32" fill="#34A853" />
                    <polygon points="18,51 33.5,32 40.8,38" fill="#EA4335" />
                    <polygon points="33.5,32 40.8,26 51,32 40.8,38" fill="#FBBC04" />
                  </g>
                </svg>
              </div>

              <div className="store-ball" onClick={() => openAuthModal('login')} title="Apple App Store">
                <svg viewBox="0 0 64 64" fill="none">
                  <defs>
                    <linearGradient id="appleStoreGrad" x1="32" y1="0" x2="32" y2="64" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#28B5F5" />
                      <stop offset="100%" stopColor="#0066CC" />
                    </linearGradient>
                  </defs>
                  <circle cx="32" cy="32" r="32" fill="url(#appleStoreGrad)" />
                  <path d="M32 16.5L34.6 12C35.4 10.6 37.5 11.8 36.7 13.2L24.2 34.8H33.3C36 34.8 36.9 38.4 34.8 39.3H16C14.4 39.3 14.4 34.8 16 34.8H19.4L29.3 17.5L27.2 13.9C26.4 12.5 28.5 11.3 29.3 12.7L32 16.5Z" fill="#ffffff" />
                  <path d="M21.3 41.8L18.7 46.3C17.9 47.7 15.8 46.5 16.6 45.1L18.5 41.8H21.3Z" fill="#ffffff" />
                  <path d="M40 34.8H47.9C49.5 34.8 49.5 39.3 47.9 39.3H42.6L47.1 45.1C47.9 46.5 45.8 47.7 45 46.3L33.2 26C32.3 23.9 34.5 21.6 36.1 24.1L40 34.8Z" fill="#ffffff" />
                </svg>
              </div>

              <div className="store-ball" onClick={() => openAuthModal('login')} title="Samsung Galaxy Store">
                <svg viewBox="0 0 64 64" fill="none">
                  <defs>
                    <linearGradient id="galaxyGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#A82490" />
                      <stop offset="50%" stopColor="#E11D48" />
                      <stop offset="100%" stopColor="#F97316" />
                    </linearGradient>
                  </defs>
                  <circle cx="32" cy="32" r="32" fill="url(#galaxyGrad)" />
                  <path d="M23 24V21C23 16.5 27 13.5 32 13.5C37 13.5 41 16.5 41 21V24" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
                  <rect x="17.5" y="23.5" width="29" height="24" rx="6" fill="#ffffff" />
                  <path d="M32 29L34 33.2L38.6 33.9L35.2 37.1L36.1 41.7L32 39.5L27.9 41.7L28.8 37.1L25.4 33.9L30 33.2L32 29Z" fill="#D91B5C" />
                </svg>
              </div>

              <div className="store-ball" onClick={() => openAuthModal('login')} title="Amazon Appstore">
                <svg viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="32" fill="#232F3E" />
                  <text x="32" y="34" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="800" fontFamily="Inter, sans-serif">
                    amazon
                  </text>
                  <path d="M16.5 41C23.5 46.2 38.5 46.2 46.5 41" stroke="#FF9900" strokeWidth="3.2" strokeLinecap="round" />
                  <path d="M43.5 38.5L48 40.5L45.8 44.8" stroke="#FF9900" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="store-ball" onClick={() => openAuthModal('login')} title="Huawei AppGallery">
                <svg viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="32" fill="#CE0E2D" />
                  <path d="M23 20C23 25 27 29 32 29C37 29 41 25 41 20" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
                  <text x="32" y="44" textAnchor="middle" fill="#ffffff" fontSize="10.5" fontWeight="800" fontFamily="Inter, sans-serif">
                    HUAWEI
                  </text>
                </svg>
              </div>

              <div className="store-ball" onClick={() => openAuthModal('login')} title="Apple iOS">
                <svg viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="32" fill="#0f172a" />
                  <path d="M40.8 33.8C40.7 28.9 44.8 26.5 45 26.3C42.7 23 39.1 22.5 37.9 22.4C34.9 22.1 32 24.1 30.5 24.1C29 24.1 26.6 22.4 24.1 22.5C20.7 22.6 17.6 24.4 15.9 27.3C12.4 33.4 15 42.4 18.4 47.2C20.1 49.6 22 52.3 24.6 52.2C27.1 52.1 28.1 50.6 31.1 50.6C34.1 50.6 34.9 52.2 37.6 52.1C40.2 52 41.9 49.7 43.6 47.3C45.5 44.5 46.3 41.7 46.3 41.6C46.2 41.5 40.9 39.4 40.8 33.8ZM35.9 19.2C37.2 17.5 38.2 15.2 37.9 12.9C35.9 13 33.4 14.2 32 15.9C30.7 17.3 29.6 19.7 29.9 22C32.1 22.1 34.4 20.9 35.9 19.2Z" fill="#ffffff" />
                </svg>
              </div>

              <div className="store-ball" onClick={() => openAuthModal('login')} title="Android OS">
                <svg viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="32" fill="#073042" />
                  <path d="M21.5 28L17.8 21.6C17.4 21 17.6 20.2 18.2 19.8C18.8 19.5 19.6 19.7 20 20.3L23.8 26.8C26.2 25.7 29 25.1 32 25.1C35 25.1 37.8 25.7 40.2 26.8L44 20.3C44.4 19.7 45.2 19.5 45.8 19.8C46.4 20.2 46.6 21 46.2 21.6L42.5 28C47.1 31 50.2 36.1 50.4 42H13.6C13.8 36.1 16.9 31 21.5 28Z" fill="#3DDC84" />
                  <circle cx="25" cy="34.5" r="2" fill="#073042" />
                  <circle cx="39" cy="34.5" r="2" fill="#073042" />
                </svg>
              </div>

              <div className="store-ball" onClick={() => openAuthModal('login')} title="Xiaomi GetApps">
                <svg viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="32" fill="#FF6900" />
                  <path d="M18 42V24C18 22.3 19.3 21 21 21H32C35.3 21 38 23.7 38 27V42" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
                  <line x1="28" y1="29" x2="28" y2="42" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
                  <line x1="45" y1="21" x2="45" y2="42" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-bottom">
          <footer className="landing-footer">
            <div>&copy; 2026 Sentriqe &middot; Unified App Store Intelligence</div>
            <div className="landing-footer-links">
              <Link to="/terms">Terms</Link>
              <Link to="/privacy">Privacy</Link>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  openAuthModal('login');
                }}
              >
                Cookies
              </a>
            </div>
          </footer>
        </div>
      </div>

      <div
        className={`auth-modal-overlay${modalOpen ? ' active' : ''}`}
        id="authModal"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeAuthModal();
        }}
      >
        <div className="auth-card auth-card-clean">
          <button className="auth-close" onClick={closeAuthModal} aria-label="Close">
            &times;
          </button>

          <div className="auth-clean-header">
            <img
              src="/system-logo.png"
              alt="Sentriqe Logo"
              style={{
                width: 48,
                height: 48,
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto 10px',
              }}
            />
            <p
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#0f172a',
                margin: 0,
              }}
            >
              Sign in to Sentriqe
            </p>
          </div>

          {error && (
            <div id="errorAlert" className="alert" style={{ display: 'block', marginBottom: 14 }}>
              {error}
            </div>
          )}

          {infoMsg && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#334155',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: 12.5,
                marginBottom: 14,
                lineHeight: 1.45,
              }}
            >
              {infoMsg}
            </div>
          )}

          {step === 'entry' ? (
            <>
              <div className="auth-provider-list">
                <button
                  type="button"
                  className="auth-provider-btn"
                  disabled={googleLoading}
                  onClick={handleGoogleContinue}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
                </button>
              </div>

              <div className="auth-divider">OR</div>

              <form onSubmit={handleEmailContinue}>
                <input
                  type="email"
                  className="auth-pill-input"
                  placeholder="Email address"
                  aria-label="Email address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button type="submit" className="auth-continue-btn" disabled={loading}>
                  {loading ? 'Checking...' : 'Continue'}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handlePasswordSubmit}>
              <div className="auth-email-chip">
                <span>{email}</span>
                <button
                  type="button"
                  className="auth-email-change"
                  onClick={() => {
                    setStep('entry');
                    setError('');
                    setPassword('');
                  }}
                >
                  Edit
                </button>
              </div>

              {step === 'register' && (
                <input
                  type="text"
                  className="auth-pill-input"
                  style={{ marginBottom: 10 }}
                  placeholder="Full name"
                  aria-label="Full name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              )}

              <input
                type="password"
                className="auth-pill-input"
                placeholder={step === 'register' ? 'Create password (min 6 chars)' : 'Password'}
                aria-label="Password"
                required
                minLength={6}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button type="submit" className="auth-continue-btn" disabled={loading}>
                {loading
                  ? 'Please wait...'
                  : step === 'register'
                  ? 'Create account'
                  : 'Log in'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
