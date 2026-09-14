import { ApiError } from "../middleware/error.middleware";
import { Project, ProjectDoc } from "../models/project.model";
import { Asset, AssetDoc } from "../models/asset.model";
import { Variant, VariantDoc } from "../models/variant.model";
import { ShareLink, ShareLinkDoc } from "../models/shareLink.model";
import { Comment } from "../models/comment.model";
import { shareState } from "../utils/token";
import mongoose from "mongoose";

/* ---------- response shapes ---------- */

export interface VariantView {
  id: string;
  projectId: string;
  name: string;
  assetId: string;
  adjustments: Record<string, { x: number; y: number; scale: number }>;
  createdAt: string;
  updatedAt: string;
  asset: {
    id: string;
    url: string;
    width: number;
    height: number;
    mimeType: string;
    bytes: number;
  } | null;
}

export interface ShareView {
  id: string;
  projectId: string;
  variantId: string;
  platform: string;
  contextId: string;
  device: string;
  theme: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  url: string | null;
  commentCount?: number;
}

export interface ProjectSummaryView {
  id: string;
  title: string;
  description: string;
  lastPlatform: string;
  lastDevice: string;
  lastContext?: string | null;
  brandName?: string | null;
  brandHandle?: string | null;
  brandTagline?: string | null;
  logoAssetId: string | null;
  bannerAssetId: string | null;
  activeVariantId: string | null;
  variantCount: number;
  coverAssetId: string | null;
  activeShareCount: number;
  createdAt: string;
  updatedAt: string;
}

export const assetUrl = (asset: Pick<AssetDoc, "provider" | "_id" | "url">): string =>
  asset.provider === "cloudinary" ? asset.url : `/api/assets/${asset._id.toString()}`;

export function toVariantView(variant: VariantDoc, asset: AssetDoc | null): VariantView {
  const adjustments: Record<string, { x: number; y: number; scale: number }> = {};
  const rawAdjustments = variant.adjustments as unknown;
  const entries =
    rawAdjustments instanceof Map
      ? Array.from(rawAdjustments.entries())
      : Object.entries(
          (rawAdjustments || {}) as Record<string, { x: number; y: number; scale: number }>,
        );
  for (const [key, value] of entries) {
    adjustments[key] = { x: value.x, y: value.y, scale: value.scale };
  }
  return {
    id: variant._id.toString(),
    projectId: variant.projectId.toString(),
    name: variant.name,
    assetId: variant.assetId.toString(),
    adjustments,
    createdAt: variant.createdAt.toISOString(),
    updatedAt: variant.updatedAt.toISOString(),
    asset: asset
      ? {
          id: asset._id.toString(),
          url: assetUrl(asset),
          width: asset.width,
          height: asset.height,
          mimeType: asset.mimeType,
          bytes: asset.bytes,
        }
      : null,
  };
}

export function toShareView(share: ShareLinkDoc, url?: string, commentCount?: number): ShareView {
  return {
    id: share._id.toString(),
    projectId: share.projectId.toString(),
    variantId: share.variantId.toString(),
    platform: share.platform,
    contextId: share.contextId,
    device: share.device,
    theme: share.theme,
    status: shareState(share),
    expiresAt: share.expiresAt.toISOString(),
    revokedAt: share.revokedAt ? share.revokedAt.toISOString() : null,
    createdAt: share.createdAt.toISOString(),
    url: url ?? null,
    commentCount,
  };
}

export async function toProjectSummaryView(project: ProjectDoc): Promise<ProjectSummaryView> {
  const variants = await Variant.find({ projectId: project._id })
    .sort({ createdAt: 1 })
    .lean<VariantDoc[]>();
  const activeId = project.activeVariantId?.toString();
  const ordered = [...variants].sort((a, b) =>
    a._id.toString() === activeId ? -1 : b._id.toString() === activeId ? 1 : 0,
  );
  const shares = await ShareLink.find({ projectId: project._id }).lean<ShareLinkDoc[]>();
  const now = Date.now();
  const activeShareCount = shares.filter((s) => !s.revokedAt && s.expiresAt.getTime() > now).length;

  let coverAssetUrl: string | null = null;
  const coverAssetId = ordered[0] ? ordered[0].assetId.toString() : null;
  if (coverAssetId) {
    const asset = await Asset.findById(coverAssetId).lean<AssetDoc | null>();
    if (asset) coverAssetUrl = assetUrl(asset);
  }

  return {
    id: project._id.toString(),
    title: project.title,
    description: project.description,
    lastPlatform: project.lastPlatform,
    lastDevice: project.lastDevice,
    lastContext: project.lastContext ?? null,
    brandName: project.brandName ?? null,
    brandHandle: project.brandHandle ?? null,
    brandTagline: project.brandTagline ?? null,
    logoAssetId: project.logoAssetId ? project.logoAssetId.toString() : null,
    bannerAssetId: project.bannerAssetId ? project.bannerAssetId.toString() : null,
    activeVariantId: activeId ?? null,
    variantCount: variants.length,
    coverAssetId,
    coverAssetUrl,
    activeShareCount,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

/**
 * Loads a project owned by the session. Ownership is bound into the query
 * itself (record id + session), so missing and foreign projects are
 * indistinguishable 404s (SEC-008).
 */
export async function getOwnedProject(projectId: string, sessionId: string): Promise<ProjectDoc> {
  const project = await Project.findOne({
    _id: projectId,
    ownerSessionId: sessionId,
  }).lean<ProjectDoc | null>();
  if (!project) {
    throw new ApiError(404, "NOT_FOUND", "This project could not be found.");
  }
  return project;
}

/* ---------- projects ---------- */

export async function listProjects(sessionId: string): Promise<ProjectSummaryView[]> {
  const projects = await Project.find({ ownerSessionId: sessionId })
    .sort({ updatedAt: -1 })
    .lean<ProjectDoc[]>();

  const projectIds = projects.map((p) => p._id);
  const variants = await Variant.find({ projectId: { $in: projectIds } })
    .sort({ createdAt: 1 })
    .lean<VariantDoc[]>();
  const shares = await ShareLink.find({ projectId: { $in: projectIds } }).lean<ShareLinkDoc[]>();
  const assets = await Asset.find({ _id: { $in: variants.map((v) => v.assetId) } }).lean<
    AssetDoc[]
  >();

  const assetById = new Map(assets.map((a) => [a._id.toString(), a]));
  const variantsByProject = new Map<string, VariantDoc[]>();
  for (const v of variants) {
    const pid = v.projectId.toString();
    if (!variantsByProject.has(pid)) variantsByProject.set(pid, []);
    variantsByProject.get(pid)!.push(v);
  }
  const sharesByProject = new Map<string, ShareLinkDoc[]>();
  for (const s of shares) {
    const pid = s.projectId.toString();
    if (!sharesByProject.has(pid)) sharesByProject.set(pid, []);
    sharesByProject.get(pid)!.push(s);
  }

  const now = Date.now();
  return projects.map((project) => {
    const pVariants = variantsByProject.get(project._id.toString()) || [];
    const pShares = sharesByProject.get(project._id.toString()) || [];
    const activeId = project.activeVariantId?.toString();
    const ordered = [...pVariants].sort((a, b) =>
      a._id.toString() === activeId ? -1 : b._id.toString() === activeId ? 1 : 0,
    );
    const coverAssetId = ordered[0] ? ordered[0].assetId.toString() : null;
    let coverAssetUrl = null;
    if (coverAssetId) {
      const asset = assetById.get(coverAssetId);
      if (asset) coverAssetUrl = assetUrl(asset);
    }
    const activeShareCount = pShares.filter(
      (s) => !s.revokedAt && s.expiresAt.getTime() > now,
    ).length;

    return {
      id: project._id.toString(),
      title: project.title,
      description: project.description,
      lastPlatform: project.lastPlatform,
      lastDevice: project.lastDevice,
      lastContext: project.lastContext ?? null,
      brandName: project.brandName ?? null,
      brandHandle: project.brandHandle ?? null,
      brandTagline: project.brandTagline ?? null,
      logoAssetId: project.logoAssetId ? project.logoAssetId.toString() : null,
      bannerAssetId: project.bannerAssetId ? project.bannerAssetId.toString() : null,
      activeVariantId: activeId ?? null,
      variantCount: pVariants.length,
      coverAssetId,
      coverAssetUrl,
      activeShareCount,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  });
}

export async function createProject(
  sessionId: string,
  dto: { title: string; description?: string },
): Promise<ProjectSummaryView> {
  const project = await Project.create({
    title: dto.title,
    description: dto.description ?? "",
    ownerSessionId: sessionId,
  });
  return toProjectSummaryView(project.toObject() as ProjectDoc);
}

export async function getProjectDetail(
  projectId: string,
  sessionId: string,
): Promise<{
  project: ProjectSummaryView;
  variants: VariantView[];
  shares: ShareView[];
}> {
  const project = await getOwnedProject(projectId, sessionId);
  
  const [variants, shares] = await Promise.all([
    Variant.find({ projectId: project._id }).sort({ createdAt: 1 }).lean<VariantDoc[]>(),
    ShareLink.find({ projectId: project._id }).sort({ createdAt: -1 }).lean<ShareLinkDoc[]>()
  ]);

  const [assets, commentCounts] = await Promise.all([
    Asset.find({ _id: { $in: variants.map((v) => v.assetId) } }).lean<AssetDoc[]>(),
    Comment.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { shareId: { $in: shares.map((s) => s._id) } } },
      { $group: { _id: "$shareId", count: { $sum: 1 } } },
    ])
  ]);

  const assetById = new Map(assets.map((a) => [a._id.toString(), a]));
  const countsByShareId = new Map(commentCounts.map((c) => [c._id.toString(), c.count]));
  
  const activeId = project.activeVariantId?.toString();
  const orderedVariants = [...variants].sort((a, b) =>
    a._id.toString() === activeId ? -1 : b._id.toString() === activeId ? 1 : 0,
  );
  const coverAssetId = orderedVariants[0] ? orderedVariants[0].assetId.toString() : null;
  let coverAssetUrl: string | null = null;
  if (coverAssetId) {
    const asset = assetById.get(coverAssetId);
    if (asset) coverAssetUrl = assetUrl(asset);
  }

  const now = Date.now();
  const activeShareCount = shares.filter((s) => !s.revokedAt && s.expiresAt.getTime() > now).length;

  const projectView: ProjectSummaryView = {
    id: project._id.toString(),
    title: project.title,
    description: project.description,
    lastPlatform: project.lastPlatform,
    lastDevice: project.lastDevice,
    lastContext: project.lastContext ?? null,
    brandName: project.brandName ?? null,
    brandHandle: project.brandHandle ?? null,
    brandTagline: project.brandTagline ?? null,
    logoAssetId: project.logoAssetId ? project.logoAssetId.toString() : null,
    bannerAssetId: project.bannerAssetId ? project.bannerAssetId.toString() : null,
    activeVariantId: activeId ?? null,
    variantCount: variants.length,
    coverAssetId,
    coverAssetUrl,
    activeShareCount,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };

  return {
    project: projectView,
    variants: variants.map((v) => toVariantView(v, assetById.get(v.assetId.toString()) || null)),
    shares: shares.map((s) =>
      toShareView(s, undefined, countsByShareId.get(s._id.toString()) || 0),
    ),
  };
}

export interface UpdateProjectDto {
  title?: string;
  description?: string;
  activeVariantId?: string | null;
  lastPlatform?: string;
  lastDevice?: "desktop" | "mobile";
  lastContext?: string;
  brandName?: string | null;
  brandHandle?: string | null;
  brandTagline?: string | null;
}

export async function updateProject(
  projectId: string,
  sessionId: string,
  dto: UpdateProjectDto,
): Promise<ProjectSummaryView> {
  const project = await getOwnedProject(projectId, sessionId);

  // BR-002: the active variant must belong to this project.
  if (typeof dto.activeVariantId === "string") {
    const variant = await Variant.findOne({
      _id: dto.activeVariantId,
      projectId: project._id,
    })
      .lean()
      .exec();
    if (!variant) {
      throw new ApiError(400, "INVALID_VARIANT", "That variant does not belong to this project.");
    }
  }

  const updated = await Project.findByIdAndUpdate(
    project._id,
    { $set: dto },
    { new: true, runValidators: true },
  ).lean<ProjectDoc | null>();
  return toProjectSummaryView(updated as ProjectDoc);
}

export async function deleteProject(projectId: string, sessionId: string): Promise<void> {
  const project = await getOwnedProject(projectId, sessionId);
  const shares = await ShareLink.find({ projectId: project._id }).lean<ShareLinkDoc[]>();
  await Promise.all([
    Variant.deleteMany({ projectId: project._id }),
    Asset.deleteMany({ projectId: project._id }),
    ShareLink.deleteMany({ projectId: project._id }),
    Comment.deleteMany({ shareId: { $in: shares.map((s) => s._id) } }),
  ]);
  await Project.deleteOne({ _id: project._id });
}
