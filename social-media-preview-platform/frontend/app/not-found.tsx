import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="share-state-page">
      <div className="share-state-card">
        <span className="share-state-icon revoked">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
            <path d="M8 11h6" />
          </svg>
        </span>
        <h1>Page not found</h1>
        <p>The page you are looking for doesn&apos;t exist, or you don&apos;t have access to it.</p>
        <p style={{ marginTop: 16 }}>
          <Link className="btn btn-primary" href="/">
            Back to projects
          </Link>
        </p>
      </div>
    </main>
  );
}
