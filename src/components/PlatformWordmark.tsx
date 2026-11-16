interface PlatformWordmarkProps {
  platform?: string;
  className?: string;
}

const LABELS: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
  samsung: 'Samsung',
  amazon: 'Amazon',
  roku: 'Roku',
};

const BRAND_COLORS: Record<string, string> = {
  samsung: '#1428A0',
  roku: '#662D91',
  apple: '#1d1d1f',
  amazon: '#232F3E',
};

/** Renders the platform name using its official brand wordmark colors. */
export function PlatformWordmark({ platform, className }: PlatformWordmarkProps) {
  const key = (platform || '').toLowerCase();

  if (key === 'google') {
    return (
      <span
        className={className}
        aria-label="Google"
        style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.02em' }}
      >
        <span style={{ color: '#4285F4' }}>G</span>
        <span style={{ color: '#EA4335' }}>o</span>
        <span style={{ color: '#FBBC05' }}>o</span>
        <span style={{ color: '#4285F4' }}>g</span>
        <span style={{ color: '#34A853' }}>l</span>
        <span style={{ color: '#EA4335' }}>e</span>
      </span>
    );
  }

  const label = LABELS[key] || platform || 'Store';
  const color = BRAND_COLORS[key] || '#334155';

  return (
    <span
      className={className}
      data-platform={key}
      style={{
        color,
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '-0.01em',
        textTransform: 'capitalize',
      }}
    >
      {label}
    </span>
  );
}
