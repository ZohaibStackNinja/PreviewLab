'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client';
import type { ProjectSummary } from '@/lib/types';
import { DEFAULT_PLATFORM } from '@/lib/platforms';
import {
  SearchIcon,
  MoreIcon,
  YouTubeIcon,
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
  LinkedInIcon,
} from '@/components/icons';

function formatModifiedDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return 'Modified today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Modified yesterday';

  return `Modified ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function PlatformIcon({ platform }: { platform: string }) {
  switch (platform) {
    case 'youtube':
      return <YouTubeIcon size={16} />;
    case 'instagram':
      return <InstagramIcon size={16} />;
    case 'facebook':
      return <FacebookIcon size={16} />;
    case 'tiktok':
      return <TikTokIcon size={16} />;
    case 'linkedin':
      return <LinkedInIcon size={16} />;
    default:
      return <LinkedInIcon size={16} />;
  }
}

export default function BootstrapPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api('/api/session', { method: 'POST' });
        let { projects } = await api<{ projects: ProjectSummary[] }>(
          '/api/projects',
        );
        if (projects.length === 0) {
          router.replace('/start');
          return;
        }
        if (cancelled) return;
        setProjects(projects);
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof ApiError
              ? e.message
              : 'Could not open the workspace. Please try again.',
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const filtered = useMemo(() => {
    if (!projects) return [];
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter((p) => p.title.toLowerCase().includes(q));
  }, [projects, search]);

  if (error) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p
            className="field-error"
            role="alert"
            style={{ justifyContent: 'center', marginTop: 8 }}
          >
            {error}
          </p>
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => router.replace('/')}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!projects) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <span
            className="brand-mark"
            aria-hidden="true"
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              margin: '0 auto 14px',
              display: 'flex',
            }}
          />
          <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
            Preview Lab
          </p>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-2)',
              marginTop: 4,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="spinner" aria-hidden="true" /> Loading your
            projects...
          </p>
        </div>
      </main>
    );
  }

  return (
    <div
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <header
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          background: 'white',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 28,
              height: 28,
              background: 'var(--brand)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            P
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
            Practiscale Preview
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: 'var(--text-2)',
            fontSize: 13,
          }}
        >
          <span>Maya Chen</span>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              background: '#e0f2f1',
            }}
          />
        </div>
      </header>

      <main
        style={{ flex: 1, background: 'var(--surface)', padding: '48px 32px' }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 32,
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  marginBottom: 8,
                  color: 'var(--text)',
                }}
              >
                My Projects
              </h1>
              <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
                Reopen, review and share your saved previews.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => router.push('/start')}
            >
              + New Project
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 32,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: 320,
                background: 'white',
                borderRadius: 8,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 14,
                  top: 11,
                  color: 'var(--text-3)',
                }}
              >
                <SearchIcon size={16} />
              </span>
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  height: 38,
                  paddingLeft: 40,
                  paddingRight: 16,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  outline: 'none',
                  fontSize: 14,
                  background: 'transparent',
                }}
              />
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
              {filtered.length} project{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 24,
            }}
          >
            {filtered.map((p) => (
              <div
                key={p.id}
                className="project-card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onClick={() =>
                  router.push(
                    `/project/${p.id}/${p.lastPlatform || DEFAULT_PLATFORM}`,
                  )
                }
              >
                <div
                  style={{
                    height: 160,
                    background: 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {p.coverAssetId ? (
                    <img
                      src={`/api/assets/${p.coverAssetId}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      alt=""
                    />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'var(--text-3)',
                        fontSize: 13,
                      }}
                    >
                      No creative
                    </div>
                  )}
                </div>
                <div
                  style={{
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    flex: 1,
                    background: 'white',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        margin: 0,
                        color: 'var(--text)',
                      }}
                    >
                      {p.title}
                    </h3>
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      style={{ color: 'var(--text-3)' }}
                    >
                      <MoreIcon size={20} />
                    </button>
                  </div>

                  <div
                    style={{ display: 'flex', gap: 6, color: 'var(--text-3)' }}
                  >
                    <PlatformIcon
                      platform={p.lastPlatform || DEFAULT_PLATFORM}
                    />
                    {p.variantCount > 1 && p.lastPlatform !== 'instagram' && (
                      <PlatformIcon platform="instagram" />
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      marginTop: 'auto',
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {formatModifiedDate(p.updatedAt)}
                    </span>
                    <div>
                      {p.activeShareCount > 0 ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            background: '#e0f2f1',
                            color: '#00c4b5',
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: 12,
                          }}
                        >
                          Shared · {p.activeShareCount} link
                          {p.activeShareCount !== 1 ? 's' : ''} active
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            background: 'var(--surface)',
                            color: 'var(--text-2)',
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: 12,
                          }}
                        >
                          Private
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
