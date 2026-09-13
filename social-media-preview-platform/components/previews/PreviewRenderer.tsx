import type { CropAdjustment, DeviceMode, FitMode, PlatformId, PreviewBrand, PreviewTheme } from '@/lib/types';
import { YouTubePreview } from './YouTubePreview';
import { InstagramPreview } from './InstagramPreview';
import { FacebookPreview } from './FacebookPreview';
import { TikTokPreview } from './TikTokPreview';
import { LinkedInPreview } from './LinkedInPreview';

/** Creative + project data shared by every platform mockup. */
export interface PreviewContext {
  projectName: string;
  variantName: string;
  imageUrl: string | null;
  fit: FitMode;
  /** Brand identity (logo/banner/names) resolved from the project. */
  brand: PreviewBrand;
  /** Crop adjustment of the active variant for this platform. */
  adjustment?: CropAdjustment;
}

export interface PreviewInput {
  platform: PlatformId;
  /** Placement context id (platforms with several placements, e.g. YouTube). */
  contextId?: string;
  device: DeviceMode;
  /** Simulated app theme (YouTube only; dark by default). */
  theme?: PreviewTheme;
  context: PreviewContext;
}

/**
 * Preview engine (Development Document §7): a preview is composed from the
 * creative, the brand identity, the platform context and the device mode.
 * Each platform owns its authentic chrome and structure.
 */
export function PreviewRenderer({ platform, contextId, device, theme, context }: PreviewInput) {
  switch (platform) {
    case 'youtube':
      return <YouTubePreview context={context} device={device} contextId={contextId} theme={theme} />;
    case 'instagram':
      return <InstagramPreview context={context} device={device} contextId={contextId} />;
    case 'facebook':
      return <FacebookPreview context={context} device={device} contextId={contextId} />;
    case 'tiktok':
      return <TikTokPreview context={context} device={device} contextId={contextId} />;
    case 'linkedin':
      return <LinkedInPreview context={context} device={device} contextId={contextId} />;
  }
}
