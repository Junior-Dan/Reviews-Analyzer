import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';
import '../styles/legal.css';

export function TermsPage() {
  usePageMeta('legal', 'Terms of Service - Sentriqe');

  return (
    <div className="legal-shell">
      <header className="legal-topbar">
        <Link to="/" className="legal-brand">
          <img src="/system-logo.png" alt="Sentriqe Logo" />
          <span>Sentriqe</span>
        </Link>

        <nav className="legal-nav" aria-label="Legal navigation">
          <Link to="/privacy" className="legal-nav-link">
            Privacy Policy
          </Link>
          <Link to="/terms" className="legal-nav-link active">
            Terms of Service
          </Link>
          <Link to="/" className="legal-nav-cta">
            Sign in
          </Link>
        </nav>
      </header>

      <main className="legal-card">
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-meta">Last updated: November 15, 2026 &middot; Sentriqe</p>

        <p className="legal-lead">
          By accessing or using Sentriqe, you agree to be bound by these Terms of Service. Please read them carefully
          before creating an account, monitoring applications, or connecting app store credentials.
        </p>

        <div className="legal-sections">
          <section className="legal-section">
            <h2>1. Accounts &amp; Eligibility</h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials and Google-linked
              session. You must provide accurate account information and notify us promptly if you suspect unauthorized
              access to your workspace.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Store Integrations &amp; Publishing</h2>
            <p>
              Connecting Google Play Developer or Apple App Store Connect credentials is optional. When you configure
              store credentials, you confirm that you have full authorization to read and respond to reviews for those
              applications. Sentriqe publishes live replies only after explicit approval in the dashboard.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. AI-Assisted Insights &amp; Replies</h2>
            <p>
              Sentriqe provides automated sentiment analysis, issue categorization, and AI-drafted reply suggestions as
              decision-support tools. You remain solely responsible for reviewing, editing, and approving any response
              before it is sent to customers or published to an app store.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Acceptable Use</h2>
            <ul>
              <li>Do not attempt to access another user&apos;s monitored apps, credentials, or workspace data.</li>
              <li>Do not use automated scraping or reply publishing in violation of app store developer policies.</li>
              <li>Do not upload malicious files, harmful scripts, or unlawful content through the platform.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Service Availability &amp; Liability</h2>
            <p>
              Sentriqe is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. While we strive for
              reliable uptime and accurate analytics, we are not liable for third-party store API outages, rate limits,
              or indirect damages arising from your use of the service.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of Sentriqe after updated Terms are posted
              constitutes acceptance of the revised Terms.
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
