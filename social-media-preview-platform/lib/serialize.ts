import type { Asset, Comment, Project, Share, Variant } from './types';
import { listShares, listVariants, shareStatus } from './db';
import { defaultContext } from './platforms';
import type { ProjectSummary, ShareView, VariantView } from './types';

export function toProjectSummary(project: Project): ProjectSummary {
  const variants = listVariants(project.id);
  const ordered = [...variants].sort((a, b) =>
    a.id === project.activeVariantId ? -1 : b.id === project.activeVariantId ? 1 : 0,
  );
  const activeShareCount = listShares(project.id).filter(
    (s) => shareStatus(s) === 'ACTIVE',
  ).length;
  return {
    ...project,
    variantCount: variants.length,
    coverAssetId: ordered[0]?.assetId ?? null,
    activeShareCount,
  };
}

export function toVariantView(variant: Variant, asset: Asset | null): VariantView {
  return {
    id: variant.id,
    projectId: variant.projectId,
    name: variant.name,
    assetId: variant.assetId,
    adjustments: variant.adjustments,
    createdAt: variant.createdAt,
    updatedAt: variant.updatedAt,
    asset: asset
      ? { id: asset.id, width: asset.width, height: asset.height, mimeType: asset.mimeType, bytes: asset.bytes }
      : null,
  };
}

export function toShareView(share: Share, url?: string): ShareView {
  return {
    id: share.id,
    projectId: share.projectId,
    variantId: share.variantId,
    platform: share.platform,
    // Older share records predate contexts; fall back to the platform default.
    contextId: share.contextId || defaultContext(share.platform),
    device: share.device,
    theme: share.theme || 'dark',
    status: shareStatus(share),
    expiresAt: share.expiresAt,
    revokedAt: share.revokedAt,
    createdAt: share.createdAt,
    url: url ?? null,
  };
}

export function publicComment(c: Comment) {
  return { id: c.id, displayName: c.displayName, body: c.body, createdAt: c.createdAt };
}
