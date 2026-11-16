import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';
import '../styles/legal.css';

export function PrivacyPage() {
  usePageMeta('legal', 'Privacy Policy - Sentriqe');

  return (
    <div className="legal-shell">
      <header className="legal-topbar">
        <Link to="/" className="legal-brand">
          <img src="/system-logo.png" alt="Sentriqe Logo" />
          <span>Sentriqe</span>
        </Link>

        <nav className="legal-nav" aria-label="Legal navigation">
          <Link to="/privacy" className="legal-nav-link active">
            Privacy Policy
          </Link>
          <Link to="/terms" className="legal-nav-link">
            Terms of Service
          </Link>
          <Link to="/" className="legal-nav-cta">
            Sign in
          </Link>
        </nav>
      </header>

      <main className="legal-card">
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-meta">Last updated: November 15, 2026 &middot; Sentriqe</p>

        <p className="legal-lead">
          Sentriqe (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) helps product and engineering teams
          aggregate, analyze, and respond to app store reviews across Google Play, Apple App Store, Samsung Galaxy
          Store, Amazon Appstore, and Roku. This Privacy Policy explains what data we collect, how we use it, and how
          your workspace data is isolated and protected.
        </p>

        <div className="legal-sections">
          <section className="legal-section">
            <h2>1. Information We Collect</h2>
            <ul>
              <li>
                <strong>Account Information:</strong> Name, email address, role, authentication provider (email or
                Google Sign-In), profile avatar, and optional company logo you upload in Settings.
              </li>
              <li>
                <strong>Monitored Applications:</strong> App names, package/bundle identifiers, and store platforms you
                add to your workspace.
              </li>
              <li>
                <strong>Store Integration Credentials:</strong> Service account JSON keys, App Store Connect API keys, or
                store tokens you explicitly connect to enable live reply publishing.
              </li>
              <li>
                <strong>Review &amp; AI Analysis Data:</strong> Publicly fetched app reviews, ratings, sentiment/category
                classifications, and draft or approved developer replies.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>2. How We Use Your Information</h2>
            <p>We process your information solely to operate and improve the Sentriqe platform:</p>
            <ul>
              <li>Authenticate your session and isolate your apps, analytics, and integrations per account.</li>
              <li>Fetch and classify app reviews, compute sentiment and rating trends, and surface product alerts.</li>
              <li>Generate AI-assisted draft replies and publish approved responses to connected app stores on your behalf.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Account Isolation &amp; Security</h2>
            <p>
              Each Sentriqe account is strictly scoped so your monitored apps, dashboard metrics, and store integration
              credentials are accessible only to your authenticated session. Passwords are salted and hashed with bcrypt,
              API access is protected with signed JWT tokens, and sensitive store credentials are redacted from API
              responses.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Third-Party Services</h2>
            <p>
              When you choose to sign in with Google or connect Google Play / Apple App Store Connect credentials, Sentriqe
              communicates directly with those official APIs to verify your identity or publish replies you have
              explicitly approved. We do not sell or share your data with third-party advertisers.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Data Retention &amp; Your Controls</h2>
            <p>
              You can remove monitored apps, disconnect store integrations, or remove your company logo at any time from
              the platform. Account preferences such as theme and brand color are stored locally in your browser, while
              account records and company logos persist in our database until removed.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Contact</h2>
            <p>
              If you have questions about this Privacy Policy or how your data is handled, contact your workspace
              administrator or reach out via the Help Centre inside Sentriqe.
            </p>
          </section>
        </div>
      </main>

      <footer className="legal-footer">
        <div>&copy; 2026 Sentriqe &middot; Unified App Store Intelligence</div>
        <div className="legal-footer-links">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
