import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { resolveSession } from '@/lib/auth';
import { fail, ok } from '@/lib/api-helpers';
import {
  deleteAssetRecord,
  findAsset,
  findProject,
  insertAsset,
  updateProject,
  uploadsDir,
} from '@/lib/db';
import { newId } from '@/lib/db';
import { safeExtension, sniffImageType } from '@/lib/images';
import {
  MAX_UPLOAD_BYTES,
  SUPPORTED_IMAGE_TYPES,
  validateImageSize,
} from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Ctx = { params: { projectId: string; kind: string } };

const KINDS = ['logo', 'banner'] as const;
type Kind = (typeof KINDS)[number];

/**
 * Brand identity assets (logo / banner) for the platform mockups.
 * POST multipart { file } stores the binary, records the asset and points the
 * project's `logoAssetId` / `bannerAssetId` at it. The previous asset (if any)
 * is cleaned up so no orphan binaries remain.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { session, setCookie } = resolveSession(req);
  const project = findProject(ctx.params.projectId);
  if (!project || project.ownerSessionId !== session.id)
    return fail(404, 'NOT_FOUND', 'This project could not be found.');

  const kind = ctx.params.kind as Kind;
  if (!KINDS.includes(kind)) return fail(400, 'INVALID_KIND', 'Unknown brand asset type.');
  const field = kind === 'logo' ? 'logoAssetId' : 'bannerAssetId';

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, 'INVALID_BODY', 'The upload could not be read. Please try again.');
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0)
    return fail(400, 'NO_FILE', 'Please choose an image to upload.');

  const typeOk = (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(file.type);
  const sizeError = validateImageSize(file.size);
  if (!typeOk)
    return fail(400, 'UNSUPPORTED_TYPE', 'Unsupported file type. Please upload a PNG, JPEG or WebP image.');
  if (sizeError) return fail(400, sizeError.code, sizeError.message);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_UPLOAD_BYTES)
    return fail(400, 'FILE_TOO_LARGE', 'That image is larger than 10 MB. Please upload a smaller file.');

  const sniffed = sniffImageType(buffer);
  if (!sniffed)
    return fail(
      400,
      'UNSUPPORTED_TYPE',
      'This file is not a supported image. Please upload a PNG, JPEG or WebP image.',
    );

  const assetId = newId();
  const fileName = `${assetId}${safeExtension(sniffed)}`;
  try {
    fs.writeFileSync(path.join(uploadsDir(), fileName), buffer);
  } catch {
    return fail(502, 'STORAGE_FAILED', 'The image could not be stored. Please try again.');
  }

  insertAsset({
    id: assetId,
    projectId: project.id,
    variantId: null,
    fileName,
    mimeType: sniffed,
    bytes: buffer.length,
    width: Number(form.get('width')) || 0,
    height: Number(form.get('height')) || 0,
    createdAt: new Date().toISOString(),
  });

  const previousId = kind === 'logo' ? project.logoAssetId : project.bannerAssetId;
  updateProject(project.id, { [field]: assetId });
  if (previousId && previousId !== assetId) deleteAssetRecord(previousId);

  return ok({ assetId, kind }, setCookie);
}

/** DELETE clears the brand asset (falls back to the generated identity). */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { session, setCookie } = resolveSession(req);
  const project = findProject(ctx.params.projectId);
  if (!project || project.ownerSessionId !== session.id)
    return fail(404, 'NOT_FOUND', 'This project could not be found.');

  const kind = ctx.params.kind as Kind;
  if (!KINDS.includes(kind)) return fail(400, 'INVALID_KIND', 'Unknown brand asset type.');
  const field = kind === 'logo' ? 'logoAssetId' : 'bannerAssetId';

  const previousId = kind === 'logo' ? project.logoAssetId : project.bannerAssetId;
  updateProject(project.id, { [field]: null });
  if (previousId) deleteAssetRecord(previousId);

  return ok({ cleared: true }, setCookie);
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { session, setCookie } = resolveSession(req);
  const project = findProject(ctx.params.projectId);
  if (!project || project.ownerSessionId !== session.id)
    return fail(404, 'NOT_FOUND', 'This project could not be found.');
  const kind = ctx.params.kind as Kind;
  if (!KINDS.includes(kind)) return fail(400, 'INVALID_KIND', 'Unknown brand asset type.');
  const assetId = kind === 'logo' ? project.logoAssetId : project.bannerAssetId;
  const asset = assetId ? findAsset(assetId) : null;
  return ok({ assetId, asset }, setCookie);
}
