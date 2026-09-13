import { NextRequest } from 'next/server';
import { resolveSession } from '@/lib/auth';
import { fail, ok } from '@/lib/api-helpers';
import { deleteAssetBinary, deleteVariant, findAsset, findProject, findVariant, updateVariant } from '@/lib/db';
import { toVariantView } from '@/lib/serialize';
import { isPlatformId, PLATFORM_IDS } from '@/lib/platforms';
import type { CropAdjustment } from '@/lib/types';
import { normalize, validateVariantName } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Ctx = { params: { variantId: string } };

function loadOwned(req: NextRequest, variantId: string) {
  const { session, setCookie } = resolveSession(req);
  const variant = findVariant(variantId);
  const project = variant ? findProject(variant.projectId) : null;
  if (!variant || !project || project.ownerSessionId !== session.id)
    return { error: true as const, setCookie };
  return { error: false as const, variant, project, setCookie };
}

/** Validates a crop-adjustment payload keyed by platform id. */
function parseAdjustments(input: unknown): Record<string, CropAdjustment> | string {
  if (input === null) return {};
  if (typeof input !== 'object') return 'INVALID_ADJUSTMENT';
  const out: Record<string, CropAdjustment> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!isPlatformId(key)) return 'INVALID_PLATFORM';
    const v = (value || {}) as Record<string, unknown>;
    const x = Number(v.x) || 0;
    const y = Number(v.y) || 0;
    const scale = Number(v.scale) || 1;
    if (x < -50 || x > 50 || y < -50 || y > 50 || scale < 1 || scale > 2)
      return 'INVALID_ADJUSTMENT';
    out[key] = { x, y, scale };
  }
  return out;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const owned = loadOwned(req, ctx.params.variantId);
  if (owned.error) return fail(404, 'NOT_FOUND', 'This variant could not be found.');

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'INVALID_BODY', 'The request body must be valid JSON.');
  }

  const patch: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = normalize(body.name);
    const err = validateVariantName(name);
    if (err) return fail(400, err.code, err.message);
    patch.name = name;
  }

  if (body.adjustments !== undefined) {
    const parsed = parseAdjustments(body.adjustments);
    if (typeof parsed === 'string')
      return fail(
        400,
        parsed,
        'Adjustments are limited to supported platforms with an offset of ±50% and a scale of 1–2×.',
      );
    patch.adjustments = parsed;
  }

  if (Object.keys(patch).length === 0)
    return fail(400, 'NOTHING_TO_UPDATE', 'Nothing to update.');

  const updated = updateVariant(owned.variant.id, patch);
  return ok({ variant: toVariantView(updated!, findAsset(owned.variant.assetId)) }, owned.setCookie);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const owned = loadOwned(req, ctx.params.variantId);
  if (owned.error) return fail(404, 'NOT_FOUND', 'This variant could not be found.');
  const removed = deleteVariant(owned.variant.id);
  if (removed && removed.assetId) deleteAssetBinary(removed.assetId);
  return ok({ deleted: true }, owned.setCookie);
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const owned = loadOwned(req, ctx.params.variantId);
  if (owned.error) return fail(404, 'NOT_FOUND', 'This variant could not be found.');
  void PLATFORM_IDS;
  return ok({ variant: toVariantView(owned.variant, findAsset(owned.variant.assetId)) }, owned.setCookie);
}
