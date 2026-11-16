export type ThemeMode = 'system' | 'light' | 'dark';

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(mode);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = mode;
  document.documentElement.style.colorScheme = resolved;
}

export function applyBrandColor(color?: string | null): void {
  if (typeof document === 'undefined') return;
  const cleaned = String(color || '').trim();
  const normalized = cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    document.documentElement.style.setProperty('--brand-color', normalized.toUpperCase());
    document.documentElement.dataset.hasBrandColor = 'true';
  } else {
    document.documentElement.style.removeProperty('--brand-color');
    delete document.documentElement.dataset.hasBrandColor;
  }
}

export function getSavedBrandColor(): string | null {
  try {
    const raw = localStorage.getItem('reviewsAiSettings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.brandColor === 'string' && /^#?[0-9a-fA-F]{6}$/.test(parsed.brandColor.trim())) {
        const c = parsed.brandColor.trim();
        return c.startsWith('#') ? c : `#${c}`;
      }
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function getSavedTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem('reviewsAiSettings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.theme === 'light' || parsed?.theme === 'dark' || parsed?.theme === 'system') {
        return parsed.theme;
      }
    }
  } catch {
    // ignore storage errors
  }
  return 'light';
}

export function initTheme(): void {
  applyTheme(getSavedTheme());
  applyBrandColor(getSavedBrandColor());

  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (getSavedTheme() === 'system') {
        applyTheme('system');
      }
    };
    mq.addEventListener?.('change', onChange);
  }
}

export const COMPANY_LOGO_KEY = 'sentriq_company_logo';

export function getCompanyLogo(): string | null {
  try {
    const val = localStorage.getItem(COMPANY_LOGO_KEY);
    return val && val.trim() ? val : null;
  } catch {
    return null;
  }
}

export function setCompanyLogo(dataUrl: string | null): void {
  try {
    if (dataUrl) {
      localStorage.setItem(COMPANY_LOGO_KEY, dataUrl);
    } else {
      localStorage.removeItem(COMPANY_LOGO_KEY);
    }
    window.dispatchEvent(new Event('companyLogoChange'));
  } catch {
    // ignore storage quota errors
  }
}
