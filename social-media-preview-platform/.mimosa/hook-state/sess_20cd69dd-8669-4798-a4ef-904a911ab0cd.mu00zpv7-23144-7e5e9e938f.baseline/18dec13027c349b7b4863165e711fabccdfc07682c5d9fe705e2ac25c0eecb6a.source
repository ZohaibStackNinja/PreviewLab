import { NextRequest } from 'next/server';
import { resolveSession } from '@/lib/auth';
import { fail, ok, originFrom } from '@/lib/api-helpers';
import {
  findProject,
  findVariant,
  insertShare,
  listShares,
} from '@/lib/db';
import { newId } from '@/lib/db';
import { defaultContext, isDeviceMode, isPlatformId, isValidContext } from '@/lib/platforms';
import { toShareView } from '@/lib/serialize';
import { generateToken, hashShareToken } from '@/lib/tokens';
import { validateExpiry } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Ctx = { params: { projectId: string } };

const DEFAULT_EXPIRY_HOURS = 24;

export async function GET(req: NextRequest, ctx: Ctx) {
  const { session, setCookie } = resolveSession(req);
  const project = findProject(ctx.params.projectId);
  if (!project || project.ownerSessionId !== session.id)
    return fail(404, 'NOT_FOUND', 'This project could not be found.');
  const shares = listShares(project.id).map((s) => toShareView(s));
  return ok({ shares }, setCookie);
}

/**
 * Creates a share link snapshot of the current preview state
 * (variant + platform + device). Default expiry is 24 hours (SHR-002);
 * the owner may pass `expiresAt` (ISO) or `expiresInHours` (SHR-003).
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { session, setCookie } = resolveSession(req);
  const project = findProject(ctx.params.projectId);
  if (!project || project.ownerSessionId !== session.id)
    return fail(404, 'NOT_FOUND', 'This project could not be found.');

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'INVALID_BODY', 'The request body must be valid JSON.');
  }

  // BR-002: the variant must belong to this project.
  const variant = typeof body.variantId === 'string' ? findVariant(body.variantId) : null;
  if (!variant || variant.projectId !== project.id)
    return fail(400, 'INVALID_VARIANT', 'Select a variant before sharing this preview.');

  // BR-003/BR-005: platform + device must be a supported combination.
  if (typeof body.platform !== 'string' || !isPlatformId(body.platform))
    return fail(400, 'INVALID_PLATFORM', 'That preview destination is not supported.');
  if (typeof body.device !== 'string' || !isDeviceMode(body.device))
    return fail(400, 'INVALID_DEVICE', 'That device mode is not supported.');

  // BR-004: the placement context must be valid for the selected platform.
  const contextId =
    body.context === undefined
      ? defaultContext(body.platform)
      : isValidContext(body.platform, body.context)
        ? (body.context as string)
        : null;
  if (!contextId)
    return fail(400, 'INVALID_CONTEXT', 'That placement is not available for this platform.');

  // Simulated app theme (YouTube); defaults to dark.
  const theme = body.theme === undefined ? 'dark' : body.theme;
  if (theme !== 'dark' && theme !== 'light')
    return fail(400, 'INVALID_THEME', 'That theme is not supported.');

  // Expiry: default 24h, or an owner-chosen future timestamp (SHR-002/003/004).
  let expiresAt: Date;
  if (body.expiresAt !== undefined) {
    if (typeof body.expiresAt !== 'string')
      return fail(400, 'INVALID_EXPIRY', 'That expiry date is not valid.');
    const err = validateExpiry(body.expiresAt);
    if (err) return fail(400, err.code, err.message);
    expiresAt = new Date(body.expiresAt);
  } else if (body.expiresInHours !== undefined) {
    const hours = Number(body.expiresInHours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 365 * 24)
      return fail(400, 'INVALID_EXPIRY', 'Choose an expiry between 1 hour and 365 days from now.');
    expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  } else {
    expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000);
  }

  const token = generateToken(24);
  const share = insertShare({
    id: newId(),
    projectId: project.id,
    variantId: variant.id,
    platform: body.platform,
    contextId,
    device: body.device,
    theme,
    tokenHash: hashShareToken(token),
    expiresAt: expiresAt.toISOString(),
    revokedAt: null,
    createdAt: new Date().toISOString(),
  });

  const url = `${originFrom(req)}/share/${token}`;
  return ok({ share: toShareView(share, url) }, setCookie);
}
