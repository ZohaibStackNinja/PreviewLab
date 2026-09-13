import type { DeviceMode, PlatformId } from './types';

// Platform context catalogue (SRS §5 — the system distinguishes platform from
// placement/context; each platform defines its supported contexts, natural
// aspect ratio and deterministic fit rule). First context = default.

export interface PlatformContextDef {
  id: string;
  label: string;
}

export interface PlatformDef {
  id: PlatformId;
  label: string;
  /** Supported placement contexts, first = default. */
  contexts: PlatformContextDef[];
  /** Natural image presentation ratio (w/h) for the primary MVP context. */
  ratio: number;
  /** Whether the context naturally crops the creative to its ratio. */
  naturalCrop: boolean;
  /** Mobile-first platforms default to the mobile device state. */
  mobileFirst: boolean;
  supportsDesktop: boolean;
  supportsMobile: boolean;
  accent: string; // used only for tiny nav dots / badges
}

export const PLATFORMS: Record<PlatformId, PlatformDef> = {
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    contexts: [
      { id: 'watch', label: 'Watch feed' },
      { id: 'search', label: 'Search results' },
      { id: 'channel', label: 'Channel page' },
    ],
    ratio: 16 / 9,
    naturalCrop: true,
    mobileFirst: false,
    supportsDesktop: true,
    supportsMobile: true,
    accent: '#FF0033',
  },
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    contexts: [
      { id: 'feed', label: 'Feed post' },
      { id: 'profile', label: 'Profile grid' },
    ],
    ratio: 4 / 5,
    naturalCrop: true,
    mobileFirst: false,
    supportsDesktop: true,
    supportsMobile: true,
    accent: '#D63384',
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    contexts: [
      { id: 'feed', label: 'Feed post' },
      { id: 'page', label: 'Page + feed' },
    ],
    ratio: 1.91,
    naturalCrop: true,
    mobileFirst: false,
    supportsDesktop: true,
    supportsMobile: true,
    accent: '#1877F2',
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    contexts: [
      { id: 'foryou', label: 'For You feed' },
      { id: 'profile', label: 'Profile grid' },
    ],
    ratio: 9 / 16,
    naturalCrop: true,
    mobileFirst: true,
    supportsDesktop: true,
    supportsMobile: true,
    accent: '#111111',
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    contexts: [
      { id: 'feed', label: 'Feed post' },
      { id: 'page', label: 'Page + feed' },
    ],
    ratio: 1.91,
    naturalCrop: true,
    mobileFirst: false,
    supportsDesktop: true,
    supportsMobile: true,
    accent: '#0A66C2',
  },
};

export const PLATFORM_IDS: PlatformId[] = ['youtube', 'instagram', 'facebook', 'tiktok', 'linkedin'];

export function isPlatformId(value: string): value is PlatformId {
  return (PLATFORM_IDS as string[]).includes(value);
}

export function isDeviceMode(value: string): value is DeviceMode {
  return value === 'desktop' || value === 'mobile';
}

/** True when `contextId` is a valid placement for the platform. */
export function isValidContext(platform: PlatformId, contextId: unknown): boolean {
  if (typeof contextId !== 'string') return false;
  return PLATFORMS[platform].contexts.some((c) => c.id === contextId);
}

export function defaultContext(platform: PlatformId): string {
  return PLATFORMS[platform].contexts[0].id;
}

export function contextLabel(platform: PlatformId, contextId: string | null | undefined): string {
  const def = PLATFORMS[platform].contexts.find((c) => c.id === contextId);
  return def ? def.label : PLATFORMS[platform].contexts[0].label;
}

export const DEFAULT_PLATFORM: PlatformId = 'linkedin';
export const DEFAULT_DEVICE: DeviceMode = 'desktop';
