import { Types } from "mongoose";
import { ApiError } from "../middleware/error.middleware";
import { generateToken, hashShareToken, shareState } from "../utils/token";
import { defaultContext, isValidContext } from "../utils/platforms";
import { ShareLink, ShareLinkDoc } from "../models/shareLink.model";
import { Comment, CommentDoc } from "../models/comment.model";
import { Project } from "../models/project.model";
import { Variant } from "../models/variant.model";
import { toShareView, ShareView } from "./project.service";

const DEFAULT_EXPIRY_HOURS = 24;

/**
 * Ownership assertion bound into the query itself: the project record must
 * match BOTH its id and the current session — otherwise 404, so missing and
 * foreign resources are indistinguishable (SEC-008).
 */
export async function assertProjectOwnership(projectId: string, sessionId: string): Promise<void> {
  const owned = await Project.exists({ _id: projectId, ownerSessionId: sessionId }).exec();
  if (!owned) {
    throw new ApiError(404, "NOT_FOUND", "This share link could not be found.");
  }
}

/**
 * Owner share access: the share's parent project must match BOTH its id and
 * the current session (joint ownership query), else 404 (SEC-008).
 */
async function getOwnedShare(shareId: string, sessionId: string): Promise<ShareLinkDoc> {
  const share = await ShareLink.findById(shareId).lean<ShareLinkDoc | null>();
  if (!share) {
    throw new ApiError(404, "NOT_FOUND", "This share link could not be found.");
  }
  const owned = await Project.exists({
    _id: share.projectId,
    ownerSessionId: sessionId,
  }).exec();
  if (!owned) {
    throw new ApiError(404, "NOT_FOUND", "This share link could not be found.");
  }
  return share;
}

export interface CreateShareDto {
  variantId: string;
  platform: string;
  context?: string;
  device: "desktop" | "mobile";
  theme?: "dark" | "light";
  expiresAt?: string;
  expiresInHours?: number;
}

/** POST create share — snapshots the exact preview state (SHR-001..008). */
export async function createShare(
  projectId: string,
  sessionId: string,
  origin: string,
  dto: CreateShareDto,
): Promise<ShareView> {
  await assertProjectOwnership(projectId, sessionId);

  // Joint query: the variant must belong to a project owned by this session
  // (BR-002) — foreign and missing variants are indistinguishable (SEC-008).
  let variantId: import("mongoose").Types.ObjectId | null = null;
  try {
    const rows = (await Variant.aggregate([
      { $match: { _id: new Types.ObjectId(dto.variantId) } },
      { $limit: 1 },
      {
        $lookup: {
          from: "projects",
          localField: "projectId",
          foreignField: "_id",
          as: "project",
          pipeline: [{ $match: { ownerSessionId: sessionId } }, { $project: { _id: 1 } }],
        },
      },
      { $unwind: "$project" },
      { $project: { _id: 1 } },
    ])) as Array<{ _id: import("mongoose").Types.ObjectId }>;
    if (rows[0]) variantId = rows[0]._id;
  } catch {
    // malformed id falls through to the not-found branch
  }
  if (!variantId) {
    throw new ApiError(404, "NOT_FOUND", "This share link could not be found.");
  }

  // BR-003/BR-004: platform + placement context must be a supported pair.
  const contextId = dto.context === undefined ? defaultContext(dto.platform) : dto.context;
  if (!isValidContext(dto.platform, contextId)) {
    throw new ApiError(
      400,
      "INVALID_CONTEXT",
      "That placement is not available for this platform.",
    );
  }

  // SHR-002/003/004: default 24h, or a strictly future owner-chosen expiry.
  let expiresAt: Date;
  if (dto.expiresAt) {
    expiresAt = new Date(dto.expiresAt);
  } else {
    expiresAt = new Date(Date.now() + (dto.expiresInHours ?? DEFAULT_EXPIRY_HOURS) * 3600_000);
  }
  if (expiresAt.getTime() <= Date.now()) {
    throw new ApiError(400, "EXPIRY_IN_PAST", "The expiry must be later than the current time.");
  }

  const token = generateToken(24);
  const share = await ShareLink.create({
    projectId,
    variantId,
    platform: dto.platform,
    contextId,
    device: dto.device,
    theme: dto.theme || "dark",
    tokenHash: hashShareToken(token),
    expiresAt,
    revokedAt: null,
    createdAt: new Date(),
  });

  return toShareView(share, `${origin}/share/${token}`);
}

/** GET list — owner list of all links for a project. */
export async function listShares(projectId: string, sessionId: string): Promise<ShareView[]> {
  await assertProjectOwnership(projectId, sessionId);
  const shares = await ShareLink.find({ projectId }).sort({ createdAt: -1 }).lean<ShareLinkDoc[]>();
  return shares.map((s) => toShareView(s));
}

export interface ShareDetailView {
  share: ShareView;
  comments: PublicCommentView[];
}

/** GET detail — owner view of one link + its comments. */
export async function getShareDetail(shareId: string, sessionId: string): Promise<ShareDetailView> {
  const share = await getOwnedShare(shareId, sessionId);
  const comments = await Comment.find({ shareId: share._id })
    .sort({ createdAt: 1 })
    .lean<CommentDoc[]>();
  return {
    share: toShareView(share),
    comments: publicComments(comments),
  };
}

/** Owner comments endpoint — ownership is checked through the share's project. */
export async function createOwnerComment(
  shareId: string,
  sessionId: string,
  dto: { displayName: string; body: string },
): Promise<PublicCommentView> {
  const share = await getOwnedShare(shareId, sessionId);
  const comment = await Comment.create({
    shareId: share._id,
    displayName: dto.displayName,
    body: dto.body,
    createdAt: new Date(),
  });
  return publicComment(comment.toObject() as CommentDoc);
}

/** POST revoke — owner revokes an active link immediately (SHR-005, UC-09). */
export async function revokeShare(shareId: string, sessionId: string): Promise<ShareView> {
  const share = await getOwnedShare(shareId, sessionId);
  if (share.revokedAt) return toShareView(share);
  const updated = await ShareLink.findByIdAndUpdate(
    share._id,
    { $set: { revokedAt: new Date() } },
    { new: true },
  ).lean<ShareLinkDoc | null>();
  return toShareView(updated as ShareLinkDoc);
}

/* ---------- public token access (anonymous reviewers) ---------- */

export interface PublicCommentView {
  id: string;
  displayName: string;
  body: string;
  createdAt: string;
}

export function publicComment(c: CommentDoc): PublicCommentView {
  return {
    id: c._id.toString(),
    displayName: c.displayName,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
  };
}

export function publicComments(comments: CommentDoc[]): PublicCommentView[] {
  return comments.map(publicComment);
}

interface ResolvedShareRow {
  _id: import("mongoose").Types.ObjectId;
  platform: string;
  contextId: string;
  device: "desktop" | "mobile";
  theme: "dark" | "light";
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  project: {
    _id: import("mongoose").Types.ObjectId;
    title: string;
    description: string;
    brandName: string | null;
    brandHandle: string | null;
    brandTagline: string | null;
    logoAssetId: import("mongoose").Types.ObjectId | null;
    bannerAssetId: import("mongoose").Types.ObjectId | null;
  };
  variant: { _id: import("mongoose").Types.ObjectId; name: string };
  asset: {
    _id: import("mongoose").Types.ObjectId;
    width: number;
    height: number;
    url: string;
    provider: string;
  } | null;
}

export interface ResolvedShare {
  share: {
    id: string;
    platform: string;
    contextId: string;
    device: string;
    theme: string;
    status: "ACTIVE";
    expiresAt: string;
    createdAt: string;
  };
  project: { id: string; title: string };
  brand: {
    name: string;
    handle: string;
    tagline: string;
    logoUrl: string | null;
    bannerUrl: string | null;
  };
  variant: { id: string; name: string };
  asset: { id: string; url: string; width: number; height: number } | null;
}

/**
 * Resolves a raw share token into the full public review payload with a
 * single aggregation pipeline — every joined record is derived from the
 * token's own document, never from client-supplied ids. The pipeline returns
 * the raw share even when expired/revoked so the caller can fail closed with
 * the documented states (SHR-010, SEC-004/008).
 */
async function resolveShareRow(token: string): Promise<ResolvedShareRow | null> {
  const rows = await ShareLink.aggregate<ResolvedShareRow>([
    { $match: { tokenHash: hashShareToken(token) } },
    { $limit: 1 },
    {
      $lookup: {
        from: "projects",
        localField: "projectId",
        foreignField: "_id",
        as: "project",
        pipeline: [
          {
            $project: {
              title: 1,
              description: 1,
              brandName: 1,
              brandHandle: 1,
              brandTagline: 1,
              logoAssetId: 1,
              bannerAssetId: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$project" },
    {
      $lookup: {
        from: "variants",
        localField: "variantId",
        foreignField: "_id",
        as: "variant",
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    { $unwind: "$variant" },
    {
      $lookup: {
        from: "assets",
        localField: "variantId",
        foreignField: "variantId",
        as: "assets",
        pipeline: [{ $project: { _id: 1, width: 1, height: 1, url: 1, provider: 1 } }],
      },
    },
    { $addFields: { asset: { $arrayElemAt: ["$assets", 0] } } },
  ]);
  return rows[0] || null;
}

export async function resolveShareToken(
  token: string,
): Promise<{ status: "ACTIVE" | "EXPIRED" | "REVOKED" | "INVALID"; data: ResolvedShare | null }> {
  const share = await resolveShareRow(token);
  if (!share) return { status: "INVALID", data: null };
  const state = shareState(share);
  if (state !== "ACTIVE") return { status: state, data: null };

  const project = share.project;
  const asset = share.asset;
  return {
    status: "ACTIVE",
    data: {
      share: {
        id: share._id.toString(),
        platform: share.platform,
        contextId: share.contextId,
        device: share.device,
        theme: share.theme,
        status: "ACTIVE",
        expiresAt: share.expiresAt.toISOString(),
        createdAt: share.createdAt.toISOString(),
      },
      project: { id: project._id.toString(), title: project.title },
      brand: {
        name: project.brandName || project.title,
        handle: project.brandHandle
          ? project.brandHandle.startsWith("@")
            ? project.brandHandle
            : "@" + project.brandHandle
          : "@" +
            project.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "")
              .slice(0, 20),
        tagline: project.brandTagline || project.description || "",
        logoUrl: project.logoAssetId ? `/api/assets/${project.logoAssetId.toString()}` : null,
        bannerUrl: project.bannerAssetId ? `/api/assets/${project.bannerAssetId.toString()}` : null,
      },
      variant: { id: share.variant._id.toString(), name: share.variant.name },
      asset: asset
        ? {
            id: asset._id.toString(),
            url:
              asset.provider === "cloudinary" ? asset.url : `/api/assets/${asset._id.toString()}`,
            width: asset.width,
            height: asset.height,
          }
        : null,
    },
  };
}

/** GET resolved — public review payload (fails closed, SHR-010). */
export async function resolveShare(token: string): Promise<ResolvedShare> {
  const { status, data } = await resolveShareToken(token);
  if (status === "ACTIVE" && data) return data;
  const httpStatus = status === "EXPIRED" || status === "REVOKED" ? 410 : 404;
  const message =
    status === "EXPIRED"
      ? "This preview link has expired."
      : "This preview link is no longer available.";
  throw new ApiError(httpStatus, status === "EXPIRED" ? "EXPIRED" : "SHARE_UNAVAILABLE", message);
}

/** GET public comments — active links only (BR-009). */
export async function listPublicComments(token: string): Promise<PublicCommentView[]> {
  const { status, data } = await resolveShareToken(token);
  if (status !== "ACTIVE" || !data) {
    throw new ApiError(410, "SHARE_UNAVAILABLE", "This preview link is no longer available.");
  }
  const comments = await Comment.find({ shareId: data.share.id })
    .sort({ createdAt: 1 })
    .lean<CommentDoc[]>();
  return publicComments(comments);
}

// Light in-memory throttle on the public comment endpoint (Architecture §10.3).
const recentPosts = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (recentPosts.get(key) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recentPosts.set(key, hits);
  return hits.length > MAX_PER_WINDOW;
}

/** POST public comment — guest comment with display name (COM-001..003). */
export async function createPublicComment(
  token: string,
  dto: { displayName: string; body: string },
): Promise<PublicCommentView> {
  const { status, data } = await resolveShareToken(token);
  if (status !== "ACTIVE" || !data) {
    throw new ApiError(410, "SHARE_UNAVAILABLE", "This preview link is no longer available.");
  }
  const shareId = data.share.id;
  if (rateLimited(shareId)) {
    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Too many comments were sent in a short time. Please wait a moment and try again.",
    );
  }
  const comment = await Comment.create({
    shareId,
    displayName: dto.displayName,
    body: dto.body,
    createdAt: new Date(),
  });
  return publicComment(comment.toObject() as CommentDoc);
}
