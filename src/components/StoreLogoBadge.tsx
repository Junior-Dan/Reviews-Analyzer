export function StoreLogoBadge({ store, uid }: { store: string; uid: string }) {
  if (store === 'Google Play') {
    return (
      <div className="alert-avatar-badge" style={{ background: '#ffffff' }}>
        <svg width="21" height="21" viewBox="0 0 48 48">
          <defs>
            <clipPath id={`gpClip_${uid}`}>
              <path d="M9 5.8 C9 3.6 11.4 2.2 13.3 3.3 L41.2 19.8 C43.1 20.9 43.1 23.7 41.2 24.8 L13.3 41.3 C11.4 42.4 9 41.0 9 38.8 Z" />
            </clipPath>
          </defs>
          <g clipPath={`url(#gpClip_${uid})`}>
            <polygon fill="#0086F9" points="8,2 8,43 27.5,22.3" />
            <polygon fill="#00A94F" points="8,2 34.5,15.5 27.5,22.3" />
            <polygon fill="#FF3A44" points="8,43 34.5,29.1 27.5,22.3" />
            <polygon fill="#FFBD00" points="27.5,22.3 34.5,15.5 44,22.3 34.5,29.1" />
          </g>
        </svg>
      </div>
    );
  }

  if (store === 'Apple App Store') {
    return (
      <div className="alert-avatar-badge" style={{ background: 'linear-gradient(180deg, #1FB6FF 0%, #0066CC 100%)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round">
          <line x1="12" y1="4.5" x2="6.2" y2="18.5" />
          <line x1="12" y1="4.5" x2="17.8" y2="18.5" />
          <line x1="5.2" y1="14.8" x2="18.8" y2="14.8" />
        </svg>
      </div>
    );
  }

  if (store === 'Samsung Galaxy Store') {
    return (
      <div className="alert-avatar-badge" style={{ background: '#ffffff' }}>
        <svg width="22" height="22" viewBox="0 0 48 48">
          <defs>
            <linearGradient id={`samG_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF3B8D" />
              <stop offset="50%" stopColor="#D92B7A" />
              <stop offset="100%" stopColor="#FF6B4A" />
            </linearGradient>
          </defs>
          <path
            fill={`url(#samG_${uid})`}
            d="M10 15h28l-2.4 23.2c-.3 2.7-2.6 4.8-5.3 4.8H17.7c-2.7 0-5-2.1-5.3-4.8L10 15z"
          />
          <path
            fill="none"
            stroke="#FF3B8D"
            strokeWidth="3.4"
            strokeLinecap="round"
            d="M17.5 15V12.5a6.5 6.5 0 0 1 13 0V15"
          />
          <path
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.8"
            strokeLinecap="round"
            d="M18.5 23a5.5 5.5 0 0 0 11 0"
          />
        </svg>
      </div>
    );
  }

  if (store === 'Amazon Appstore') {
    return (
      <div className="alert-avatar-badge" style={{ background: '#ffffff' }}>
        <svg width="27" height="27" viewBox="0 0 100 100">
          <text
            x="50"
            y="52"
            textAnchor="middle"
            fill="#0f1419"
            fontFamily="'Plus Jakarta Sans', 'Inter', Arial, sans-serif"
            fontSize="33"
            fontWeight="800"
            letterSpacing="-1.5"
          >
            apps
          </text>
          <path
            transform="translate(7, 0)"
            fill="#F38B1C"
            d="M80.5 72.8c-10.2 7.5-24.9 11.5-37.6 11.5-17.8 0-33.8-6.6-45.9-17.5-1-.9-.1-2 1.1-1.3 13.1 7.6 29.2 12.2 46 12.2 11.3 0 23.7-2.3 35.1-7.2 1.7-.7 3.2 1.1 1.3 2.3zm4.2-4.8c-1.3-1.6-8.6-.8-11.9-.4-1 .1-1.2-.7-.3-1.4 5.8-4.1 15.3-2.9 16.5-1.5 1.1 1.4-.3 10.9-5.7 15.5-.8.7-1.6.3-1.3-.6 1.2-3.1 4-9.9 2.7-11.6z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="alert-avatar-badge" style={{ background: '#f1f5f9' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>AI</span>
    </div>
  );
}
