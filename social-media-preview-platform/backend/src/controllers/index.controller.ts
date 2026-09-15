import { Request, Response } from "express";
import { env } from "../config/env";
import { ApiError, ok } from "../middleware/error.middleware";
import { ensureSession } from "../middleware/session.middleware";
import * as projectService from "../services/project.service";
import * as brandService from "../services/brand.service";
import * as variantService from "../services/variant.service";
import * as shareService from "../services/share.service";

/**
 * Controllers: HTTP parsing + session handling + response mapping only.
 * Business rules live in services; persistence in Mongoose models.
 */

/* ---------- session ---------- */

export async function createSession(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  ok(res, { sessionId });
}

export async function probeSession(_req: Request, res: Response): Promise<void> {
  ok(res, { authenticated: true });
}

/* ---------- projects ---------- */

export async function listProjects(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  ok(res, { projects: await projectService.listProjects(sessionId) });
}

export async function createProject(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  const { title, description, lastPlatform } = req.body as {
    title: string;
    description?: string;
    lastPlatform?: string;
  };
  ok(
    res,
    {
      project: await projectService.createProject(sessionId, { title, description, lastPlatform }),
    },
    201,
  );
}

export async function getProjectDetail(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  const origin = env.allowedOrigins[0] || `${req.protocol}://${req.get("host")}`;
  ok(res, await projectService.getProjectDetail(req.params.projectId, sessionId, origin));
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  ok(res, {
    project: await projectService.updateProject(
      req.params.projectId,
      sessionId,
      req.body as projectService.UpdateProjectDto,
    ),
  });
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  await projectService.deleteProject(req.params.projectId, sessionId);
  ok(res, { deleted: true });
}

/* ---------- brand identity ---------- */

export async function getBrandAsset(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  ok(
    res,
    await brandService.getBrandAsset(
      req.params.projectId,
      sessionId,
      req.params.kind as "logo" | "banner",
    ),
  );
}

export async function uploadBrandAsset(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  ok(
    res,
    await brandService.uploadBrandAsset(
      req.params.projectId,
      sessionId,
      req.params.kind as "logo" | "banner",
      req.file,
      { width: Number(req.body?.width) || 0, height: Number(req.body?.height) || 0 },
    ),
    201,
  );
}

export async function clearBrandAsset(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  ok(
    res,
    await brandService.clearBrandAsset(
      req.params.projectId,
      sessionId,
      req.params.kind as "logo" | "banner",
    ),
  );
}

/* ---------- creative variants ---------- */

export async function createVariant(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  ok(
    res,
    {
      variant: await variantService.createVariant(req.params.projectId, sessionId, req.file, {
        width: Number(req.body?.width) || 0,
        height: Number(req.body?.height) || 0,
        name: req.body?.name,
      }),
    },
    201,
  );
}

export async function replaceVariantImage(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  ok(res, {
    variant: await variantService.replaceVariantImage(req.params.variantId, sessionId, req.file, {
      width: Number(req.body?.width) || 0,
      height: Number(req.body?.height) || 0,
    }),
  });
}

export async function updateVariant(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  ok(res, {
    variant: await variantService.updateVariant(
      req.params.variantId,
      sessionId,
      req.body as {
        name?: string;
        adjustments?: Record<string, { x: number; y: number; scale: number }> | null;
      },
    ),
  });
}

export async function getVariant(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  ok(res, { variant: await variantService.getVariant(req.params.variantId, sessionId) });
}

export async function deleteVariant(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  await variantService.deleteVariant(req.params.variantId, sessionId);
  ok(res, { deleted: true });
}

export async function getAsset(req: Request, res: Response): Promise<void> {
  const asset = await variantService.getAsset(req.params.assetId);
  const assetDoc = await variantService.getAssetDocument(req.params.assetId);
  if (assetDoc.provider === "cloudinary") {
    res.redirect(asset.url);
    return;
  }
  const buffer = variantService.readLocalImage(assetDoc.fileName);
  if (!buffer) {
    throw new ApiError(404, "NOT_FOUND", "Not found.");
  }
  res
    .status(200)
    .set("Content-Type", asset.mimeType)
    .set("Content-Length", String(buffer.length))
    .set("Cache-Control", "public, max-age=31536000, immutable")
    .send(buffer);
}

/* ---------- share links ---------- */

export async function listShares(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  const origin = env.allowedOrigins[0] || `${req.protocol}://${req.get("host")}`;
  ok(res, { shares: await shareService.listShares(req.params.projectId, sessionId, origin) });
}

export async function createShare(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  const origin = env.allowedOrigins[0] || `${req.protocol}://${req.get("host")}`;
  ok(res, {
    share: await shareService.createShare(req.params.projectId, sessionId, origin, req.body),
  });
}

export async function getShareDetail(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  const origin = env.allowedOrigins[0] || `${req.protocol}://${req.get("host")}`;
  ok(res, await shareService.getShareDetail(req.params.shareId, sessionId, origin));
}

export async function listOwnerComments(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  const origin = env.allowedOrigins[0] || `${req.protocol}://${req.get("host")}`;
  ok(res, await shareService.getShareDetail(req.params.shareId, sessionId, origin));
}

export async function createOwnerComment(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  ok(res, {
    comment: await shareService.createOwnerComment(
      req.params.shareId,
      sessionId,
      req.body as { displayName: string; body: string },
    ),
  });
}

export async function revokeShare(req: Request, res: Response): Promise<void> {
  const { sessionId } = await ensureSession(req, res);
  const origin = env.allowedOrigins[0] || `${req.protocol}://${req.get("host")}`;
  ok(res, { share: await shareService.revokeShare(req.params.shareId, sessionId, origin) });
}

/* ---------- public token access (anonymous reviewers) ---------- */

export async function resolveShare(req: Request, res: Response): Promise<void> {
  ok(res, await shareService.resolveShare(req.params.token));
}

export async function listPublicComments(req: Request, res: Response): Promise<void> {
  ok(res, { comments: await shareService.listPublicComments(req.params.token) });
}

export async function createPublicComment(req: Request, res: Response): Promise<void> {
  ok(res, {
    comment: await shareService.createPublicComment(req.params.token, req.body),
  });
}
