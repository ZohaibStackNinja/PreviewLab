'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client';
import type { PlatformId, Project, VariantView } from '@/lib/types';
import { CompareView } from '@/components/CompareView';

interface CompareClientLoaderProps {
  projectId: string;
  left: PlatformId;
  right: PlatformId;
}

export function CompareClientLoader({
  projectId,
  left,
  right,
}: CompareClientLoaderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    project: Project;
    variants: VariantView[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api<{
          project: Project;
          variants: VariantView[];
        }>(`/api/projects/${projectId}`);
        if (cancelled) return;
        setData(res);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not load compare view. Please try again.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
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
            <span className="spinner" aria-hidden="true" /> Loading
            comparison...
          </p>
        </div>
      </main>
    );
  }

  if (error || !data) {
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
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
          <p
            className="field-error"
            role="alert"
            style={{ justifyContent: 'center', marginTop: 8 }}
          >
            {error || 'This project could not be found.'}
          </p>
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
            }}
          >
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => router.push('/')}
            >
              Back to Projects
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  const { project, variants } = data;
  return (
    <div className="subpage">
      <header className="subpage-topbar">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Preview Lab
        </span>
        <span className="topbar-divider" aria-hidden="true" />
        <span className="subpage-project truncate">{project.title}</span>
        <span className="topbar-spacer" />
        <Link
          className="btn btn-secondary btn-sm"
          href={`/project/${project.id}/${project.lastPlatform || 'instagram'}`}
        >
          Back to workspace
        </Link>
      </header>
      <CompareView
        project={project}
        variants={variants}
        activeVariantId={project.activeVariantId}
        initialLeft={left}
        initialRight={right}
      />
    </div>
  );
}
