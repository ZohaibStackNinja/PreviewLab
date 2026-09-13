'use client';

import { useState } from 'react';
import { DesktopIcon, MobileIcon } from '@/components/icons';
import { PreviewRenderer } from '@/components/previews/PreviewRenderer';
import type {
  DeviceMode,
  PlatformId,
  PreviewBrand,
  PreviewTheme,
} from '@/lib/types';

export function SharedPreview({
  platform,
  contextId,
  initialDevice,
  theme,
  projectName,
  variantName,
  imageUrl,
  brand,
}: {
  platform: PlatformId;
  contextId: string;
  initialDevice: DeviceMode;
  theme: PreviewTheme;
  projectName: string;
  variantName: string;
  imageUrl: string | null;
  brand: PreviewBrand;
}) {
  const [device, setDevice] = useState<DeviceMode>(initialDevice);

  return (
    <>
      <div
        className="share-device-switcher"
        role="group"
        aria-label="Review device mode"
      >
        <button
          className={`seg-btn ${device === 'desktop' ? 'active' : ''}`}
          onClick={() => setDevice('desktop')}
          aria-pressed={device === 'desktop'}
        >
          <DesktopIcon size={15} /> Desktop
        </button>
        <button
          className={`seg-btn ${device === 'mobile' ? 'active' : ''}`}
          onClick={() => setDevice('mobile')}
          aria-pressed={device === 'mobile'}
        >
          <MobileIcon size={15} /> Mobile
        </button>
      </div>
      <p className="share-stage-sub">
        {device === 'desktop' ? 'Desktop' : 'Mobile'} · {projectName} ·{' '}
        {variantName}
        <span className="sim-badge">Simulated preview</span>
      </p>
      <div className="share-stage-canvas">
        <PreviewRenderer
          platform={platform}
          contextId={contextId}
          device={device}
          theme={theme}
          context={{
            projectName,
            variantName,
            imageUrl,
            fit: 'crop',
            brand,
          }}
        />
      </div>
    </>
  );
}
