import { NextRequest } from 'next/server';
import { resolveSession } from '@/lib/auth';
import { fail, ok } from '@/lib/api-helpers';
import {
  deleteProject,
  findProject,
  findAsset,
  findVariant,
  listShares,
  listVariants,
  updateProject,
} from '@/lib/db';
import { toShareView, toVariantView } from '@/lib/serialize';
import { isDeviceMode, isPlatformId } from '@/lib/platforms';
import { normalize, validateDescription, validateTitle } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Ctx = { params: { projectId: string } };

function requireOwned(req: NextRequest, projectId: string) {
  const { session, setCookie } = resolveSession(req);
  const project = findProject(projectId);
  // Not-owned and not-found are indistinguishable by design (SEC-008).
  if (!project || project.ownerSessionId !== session.id) return { error: true as const, setCookie };
  return { error: false as const, project, session, setCookie };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const owned = requireOwned(req, ctx.params.projectId);
  if (owned.error) return fail(404, 'NOT_FOUND', 'This project could not be found.');
  const variants = listVariants(owned.project.id).map((v) =>
    toVariantView(v, findAsset(v.assetId)),
  );
  const shares = listShares(owned.project.id).map((s) => toShareView(s));
  return ok({ project: owned.project, variants, shares }, owned.setCookie);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const owned = requireOwned(req, ctx.params.projectId);
  if (owned.error) return fail(404, 'NOT_FOUND', 'This project could not be found.');

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'INVALID_BODY', 'The request body must be valid JSON.');
  }

  const patch: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = normalize(body.title);
    const err = validateTitle(title);
    if (err) return fail(400, err.code, err.message);
    patch.title = title;
  }
  if (body.description !== undefined) {
    const err = validateDescription(body.description);
    if (err) return fail(400, err.code, err.message);
    patch.description = normalize(body.description);
  }
  if (body.activeVariantId !== undefined) {
    const variantId = body.activeVariantId;
    if (variantId === null) patch.activeVariantId = null;
    else {
      const variant = typeof variantId === 'string' ? findVariant(variantId) : null;
      if (!variant || variant.projectId !== owned.project.id)
        return fail(400, 'INVALID_VARIANT', 'That variant does not belong to this project.');
      patch.activeVariantId = variant.id;
    }
  }
  if (body.lastPlatform !== undefined) {
    if (typeof body.lastPlatform !== 'string' || !isPlatformId(body.lastPlatform))
      return fail(400, 'INVALID_PLATFORM', 'That preview destination is not supported.');
    patch.lastPlatform = body.lastPlatform;
  }
  if (body.lastDevice !== undefined) {
    if (typeof body.lastDevice !== 'string' || !isDeviceMode(body.lastDevice))
      return fail(400, 'INVALID_DEVICE', 'That device mode is not supported.');
    patch.lastDevice = body.lastDevice;
  }
  if (body.lastContext !== undefined) {
    if (typeof body.lastContext !== 'string' || body.lastContext.length > 40)
      return fail(400, 'INVALID_CONTEXT', 'That placement is not supported.');
    patch.lastContext = body.lastContext;
  }

  // Brand identity fields (display metadata for the platform mockups).
  if (body.brandName !== undefined) {
    if (body.brandName === null) patch.brandName = null;
    else {
      const v = normalize(body.brandName);
      if (v.length > 80)
        return fail(400, 'BRAND_NAME_TOO_LONG', 'Brand names are limited to 80 characters.');
      patch.brandName = v || null;
    }
  }
  if (body.brandHandle !== undefined) {
    if (body.brandHandle === null) patch.brandHandle = null;
    else {
      const v = normalize(body.brandHandle)
        .replace(/^@+/, '')
        .replace(/[^a-zA-Z0-9._]/g, '')
        .toLowerCase();
      if (v.length > 40)
        return fail(400, 'BRAND_HANDLE_TOO_LONG', 'Handles are limited to 40 characters.');
      patch.brandHandle = v || null;
    }
  }
  if (body.brandTagline !== undefined) {
    if (body.brandTagline === null) patch.brandTagline = null;
    else {
      const v = normalize(body.brandTagline);
      if (v.length > 160)
        return fail(400, 'BRAND_TAGLINE_TOO_LONG', 'Taglines are limited to 160 characters.');
      patch.brandTagline = v || null;
    }
  }

  const updated = updateProject(owned.project.id, patch);
  return ok({ project: updated }, owned.setCookie);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const owned = requireOwned(req, ctx.params.projectId);
  if (owned.error) return fail(404, 'NOT_FOUND', 'This project could not be found.');
  deleteProject(owned.project.id);
  return ok({ deleted: true }, owned.setCookie);
}
