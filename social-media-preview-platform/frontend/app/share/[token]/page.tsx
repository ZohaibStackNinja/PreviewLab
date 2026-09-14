import type { Metadata } from 'next';
import Link from 'next/link';
import { ClockIcon, ShareIcon, WarningIcon } from '@/components/icons';
import { SharedPreview } from '@/components/SharedPreview';
import { ShareComments } from '@/components/ShareComments';
import { formatDateTime, timeUntil } from '@/lib/format';
import { PLATFORMS, contextLabel } from '@/lib/platforms';
import { apiFetch, ServerApiError } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Review preview — Practiscale Preview Lab',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: { token: string };
}

interface ResolvedSharePayload {
  share: {
    id: string;
    platform: 'youtube' | 'instagram' | 'facebook' | 'tiktok' | 'linkedin';
    contextId: string;
    device: 'desktop' | 'mobile';
    theme: 'dark' | 'light';
    status: 'ACTIVE';
    expiresAt: string;
    createdAt: string;
  };
  project: { id: string; title: string };
  brand: {
    name: string;
    handle: string;
    tagline: string;
    logoUrl: string | null;
    bannerUrl: string | null;
  };
  variant: { id: string; name: string };
  asset: { id: string; url: string; width: number; height: number } | null;
}

function UnavailableState({ kind }: { kind: 'expired' | 'revoked' }) {
  return (
    <main className="share-state-page">
      <div className="share-state-card">
        <span className={`share-state-icon ${kind}`}>
          {kind === 'expired' ? (
            <ClockIcon size={24} />
          ) : (
            <WarningIcon size={24} />
          )}
        </span>
        <h1>
          {kind === 'expired'
            ? 'This preview link has expired.'
            : 'This preview link is no longer available.'}
        </h1>
        <p>
          {kind === 'expired'
            ? 'The owner can create a new review link if you still need access.'
            : 'Ask the person who shared this link to send a new one if you still need access.'}
        </p>
      </div>
    </main>
  );
}

/**
 * Public review page (SHR-007..010): opens the exact shared preview state for
 * anonymous reviewers. Expired/revoked/invalid links fail closed and never
 * reveal protected preview content.
 */
export default async function SharePage({ params }: PageProps) {
  let data: ResolvedSharePayload;
  try {
    data = await apiFetch<ResolvedSharePayload>(
      `/shares/resolved/${params.token}`,
    );
  } catch (error) {
    if (error instanceof ServerApiError && error.code === 'EXPIRED') {
      return <UnavailableState kind="expired" />;
    }
    return <UnavailableState kind="revoked" />;
  }

  let comments: Array<{
    id: string;
    displayName: string;
    body: string;
    createdAt: string;
  }> = [];
  try {
    const result = await apiFetch<{
      comments: Array<{
        id: string;
        displayName: string;
        body: string;
        createdAt: string;
      }>;
    }>(`/shares/token/${params.token}/comments`);
    comments = result.comments;
  } catch {
    comments = [];
  }

  const def = PLATFORMS[data.share.platform];
  const placement = contextLabel(data.share.platform, data.share.contextId);

  return (
    <main className="share-page">
      <header className="share-topbar">
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
          <span className="brand-mark" aria-hidden="true" />
          Practiscale Preview Lab
        </Link>
        <span className="topbar-divider" aria-hidden="true" />
        <span className="share-review-chip">
          <ShareIcon size={13} /> Review preview
        </span>
        <span className="topbar-spacer" />
        <span className="share-expiry-note">
          <ClockIcon size={14} /> Link active · expires{' '}
          {formatDateTime(data.share.expiresAt)} (
          {timeUntil(data.share.expiresAt)})
        </span>
      </header>

      <div className="share-body">
        <section className="share-stage">
          <h1 className="share-stage-title">
            {def.label} · {placement}
          </h1>
          <SharedPreview
            platform={data.share.platform}
            contextId={data.share.contextId}
            initialDevice={data.share.device}
            theme={data.share.theme}
            projectName={data.project.title}
            variantName={data.variant.name}
            imageUrl={data.asset?.url || null}
            brand={data.brand}
          />
          <p className="share-footer">
            Simulated preview for review purposes only — not affiliated with
            YouTube, Instagram, Facebook, TikTok or LinkedIn.
          </p>
        </section>

        <aside className="share-comments-aside">
          <ShareComments token={params.token} initialComments={comments} />
        </aside>
      </div>
    </main>
  );
}
