// Shared domain contracts (packages/contracts in the Architecture document).
// These types are the single source of truth for API payloads and UI state.

export type PlatformId = 'youtube' | 'instagram' | 'facebook' | 'tiktok' | 'linkedin';
export type DeviceMode = 'desktop' | 'mobile';
export type FitMode = 'crop' | 'contain';
/** Simulated app theme (currently applied to the YouTube mockups). */
export type PreviewTheme = 'dark' | 'light';

export type ShareStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface Session {
  id: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
}

export interface Project {
  id: string;
  ownerSessionId?: string;
  title: string;
  description: string;
  activeVariantId: string | null;
  lastPlatform: PlatformId;
  lastDevice: DeviceMode;
  lastContext?: string;
  // Brand identity used by the platform mockups (logo, banner, names).
  brandName?: string;
  brandHandle?: string;
  brandTagline?: string;
  logoAssetId?: string | null;
  bannerAssetId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Brand identity resolved for the preview mockups. */
export interface PreviewBrand {
  name: string;
  handle: string;
  tagline: string;
  logoUrl: string | null;
  bannerUrl: string | null;
}

export interface Asset {
  id: string;
  projectId: string;
  /** null for brand assets (logo/banner) that are not tied to a variant. */
  variantId: string | null;
  fileName: string;
  mimeType: string;
  bytes: number;
  width: number;
  height: number;
  createdAt: string;
}

/** Per-platform crop adjustment for a variant's creative. */
export interface CropAdjustment {
  /** Horizontal offset of the crop window, -50..50 (percent). */
  x: number;
  /** Vertical offset of the crop window, -50..50 (percent). */
  y: number;
  /** Zoom scale, 1..2. */
  scale: number;
}

export interface Variant {
  id: string;
  projectId: string;
  name: string;
  assetId: string;
  /** Crop adjustments keyed by platform id. */
  adjustments?: Record<string, CropAdjustment>;
  createdAt: string;
  updatedAt: string;
}

export interface Share {
  id: string;
  projectId: string;
  variantId: string;
  platform: PlatformId;
  /** Placement context snapshot (e.g. youtube: watch | search | channel). */
  contextId: string;
  device: DeviceMode;
  /** Simulated app theme for platforms that support one (YouTube). */
  theme?: PreviewTheme;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  shareId: string;
  displayName: string;
  body: string;
  createdAt: string;
}

// ---------- API payloads ----------

export interface ProjectSummary extends Project {
  variantCount: number;
  coverAssetId: string | null;
  /** Number of currently active (non-expired, non-revoked) share links. */
  activeShareCount: number;
}

export interface VariantView extends Variant {
  asset: Pick<Asset, 'id' | 'width' | 'height' | 'mimeType' | 'bytes'> | null;
}

export interface ShareView {
  id: string;
  projectId: string;
  variantId: string;
  platform: PlatformId;
  contextId: string;
  device: DeviceMode;
  theme: PreviewTheme;
  status: ShareStatus;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  url: string | null; // only set right after creation (raw token is shown once)
  commentCount?: number;
}

export interface ShareResolveResult {
  share: {
    id: string;
    platform: PlatformId;
    contextId: string;
    device: DeviceMode;
    theme: PreviewTheme;
    status: ShareStatus;
    expiresAt: string;
    createdAt: string;
  };
  project: { id: string; title: string };
  brand: PreviewBrand;
  variant: { id: string; name: string };
  asset: { id: string; width: number; height: number } | null;
  comments: Array<Pick<Comment, 'id' | 'displayName' | 'body' | 'createdAt'>>;
}

// API envelope (Development Document §4.2)
export type ApiEnvelope<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: { code: string; message: string } };
