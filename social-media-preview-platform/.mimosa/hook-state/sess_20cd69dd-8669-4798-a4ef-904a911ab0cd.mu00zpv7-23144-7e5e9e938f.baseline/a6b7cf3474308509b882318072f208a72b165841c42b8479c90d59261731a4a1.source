import {
  findAsset,
  findProject,
  findShareByTokenHash,
  findVariant,
  listComments,
  shareStatus,
} from './db';
import { defaultContext } from './platforms';
import { hashShareToken } from './tokens';
import type { ShareResolveResult } from './types';

export type ShareAccess = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'INVALID';

// Share access flow (Architecture §10.2): hash the presented token, look it
// up, reject if missing/revoked/expired, then return ONLY public review data.
export function resolveShareToken(token: string): {
  access: ShareAccess;
  data: ShareResolveResult | null;
} {
  const share = findShareByTokenHash(hashShareToken(token));
  if (!share) return { access: 'INVALID', data: null };
  const status = shareStatus(share);
  if (status !== 'ACTIVE') return { access: status, data: null };

  const project = findProject(share.projectId);
  const variant = findVariant(share.variantId);
  if (!project || !variant) return { access: 'INVALID', data: null };
  const asset = findAsset(variant.assetId);

  return {
    access: 'ACTIVE',
    data: {
      share: {
        id: share.id,
        platform: share.platform,
        contextId: share.contextId || defaultContext(share.platform),
        device: share.device,
        theme: share.theme || 'dark',
        status: 'ACTIVE',
        expiresAt: share.expiresAt,
        createdAt: share.createdAt,
      },
      project: { id: project.id, title: project.title },
      brand: {
        name: project.brandName || project.title,
        handle: project.brandHandle
          ? project.brandHandle.startsWith('@')
            ? project.brandHandle
            : '@' + project.brandHandle
          : '@' + project.title.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20),
        tagline: project.brandTagline || project.description || '',
        logoUrl: project.logoAssetId ? `/api/assets/${project.logoAssetId}` : null,
        bannerUrl: project.bannerAssetId ? `/api/assets/${project.bannerAssetId}` : null,
      },
      variant: { id: variant.id, name: variant.name },
      asset: asset ? { id: asset.id, width: asset.width, height: asset.height } : null,
      comments: listComments(share.id).map((c) => ({
        id: c.id,
        displayName: c.displayName,
        body: c.body,
        createdAt: c.createdAt,
      })),
    },
  };
}
