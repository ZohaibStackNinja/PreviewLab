'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client';
import type {
  DeviceMode,
  PlatformId,
  Project,
  ShareView,
  VariantView,
} from '@/lib/types';
import {
  PLATFORMS,
  defaultContext,
  isDeviceMode,
  isPlatformId,
  isValidContext,
} from '@/lib/platforms';
import { Workspace } from '@/components/Workspace';
import { LoaderScreen } from '@/components/LoaderScreen';

interface WorkspaceClientLoaderProps {
  projectId: string;
  platform: string;
  initialDevice?: string;
  initialContext?: string;
}

export function WorkspaceClientLoader({
  projectId,
  platform: rawPlatform,
  initialDevice: requestedDevice,
  initialContext: requestedContext,
}: WorkspaceClientLoaderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    project: Project;
    variants: VariantView[];
    shares: ShareView[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api<{
          project: Project;
          variants: VariantView[];
          shares: ShareView[];
        }>(`/api/projects/${projectId}`);
        if (cancelled) return;
        setData(res);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not load the workspace. Please try again.',
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
    return <LoaderScreen />;
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

  const { project, variants, shares } = data;
  const platform: PlatformId = isPlatformId(rawPlatform)
    ? (rawPlatform as PlatformId)
    : 'instagram';

  const initialDevice: DeviceMode = isDeviceMode(requestedDevice || '')
    ? (requestedDevice as DeviceMode)
    : PLATFORMS[platform].mobileFirst
      ? 'mobile'
      : project.lastDevice;

  const initialContext = isValidContext(platform, requestedContext)
    ? (requestedContext as string)
    : isValidContext(platform, project.lastContext)
      ? (project.lastContext as string)
      : defaultContext(platform);

  return (
    <Workspace
      project={project}
      initialVariants={variants}
      initialShares={shares}
      platform={platform}
      initialDevice={initialDevice}
      initialContext={initialContext}
    />
  );
}
