import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { resolveSession } from '@/lib/auth';
import { fail, ok } from '@/lib/api-helpers';
import {
  deleteAssetBinary,
  findAsset,
  findProject,
  findVariant,
  insertAsset,
  updateVariant,
  uploadsDir,
} from '@/lib/db';
import { newId } from '@/lib/db';
import { safeExtension, sniffImageType } from '@/lib/images';
import { toVariantView } from '@/lib/serialize';
import {
  MAX_UPLOAD_BYTES,
  SUPPORTED_IMAGE_TYPES,
  validateImageSize,
} from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Ctx = { params: { variantId: string } };

/** POST multipart { file, width?, height? } — replaces the variant's source
 * image while keeping the variant identity (VAR-004). */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { session, setCookie } = resolveSession(req);
  const variant = findVariant(ctx.params.variantId);
  const project = variant ? findProject(variant.projectId) : null;
  if (!variant || !project || project.ownerSessionId !== session.id)
    return fail(404, 'NOT_FOUND', 'This variant could not be found.');

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

  const oldAsset = findAsset(variant.assetId);
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
    variantId: variant.id,
    fileName,
    mimeType: sniffed,
    bytes: buffer.length,
    width: Number(form.get('width')) || 0,
    height: Number(form.get('height')) || 0,
    createdAt: new Date().toISOString(),
  });

  const updated = updateVariant(variant.id, { assetId });
  if (oldAsset) deleteAssetBinary(oldAsset.id);

  return ok({ variant: toVariantView(updated!, findAsset(assetId)) }, setCookie);
}
