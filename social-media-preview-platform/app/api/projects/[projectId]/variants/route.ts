import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { resolveSession } from '@/lib/auth';
import { fail, ok } from '@/lib/api-helpers';
import {
  findAsset,
  findProject,
  findVariant,
  insertAsset,
  insertVariant,
  updateProject,
  uploadsDir,
} from '@/lib/db';
import { newId } from '@/lib/db';
import { safeExtension, sniffImageType } from '@/lib/images';
import { toVariantView } from '@/lib/serialize';
import {
  MAX_UPLOAD_BYTES,
  SUPPORTED_IMAGE_TYPES,
  normalize,
  validateImageSize,
  validateVariantName,
} from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Ctx = { params: { projectId: string } };

/** POST multipart/form-data { file, name?, width?, height? } → new variant. */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { session, setCookie } = resolveSession(req);
  const project = findProject(ctx.params.projectId);
  if (!project || project.ownerSessionId !== session.id)
    return fail(404, 'NOT_FOUND', 'This project could not be found.');

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, 'INVALID_BODY', 'The upload could not be read. Please try again.');
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0)
    return fail(400, 'NO_FILE', 'Please choose an image to upload.');

  // 1) Declared type + size checks (fast rejection before any work).
  const typeOk = (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(file.type);
  const sizeError = validateImageSize(file.size);
  if (!typeOk)
    return fail(400, 'UNSUPPORTED_TYPE', 'Unsupported file type. Please upload a PNG, JPEG or WebP image.');
  if (sizeError) return fail(400, sizeError.code, sizeError.message);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_UPLOAD_BYTES)
    return fail(400, 'FILE_TOO_LARGE', 'That image is larger than 10 MB. Please upload a smaller file.');

  // 2) Content check — never trust the client MIME (Development Document §6.2).
  const sniffed = sniffImageType(buffer);
  if (!sniffed)
    return fail(
      400,
      'UNSUPPORTED_TYPE',
      'This file is not a supported image. Please upload a PNG, JPEG or WebP image.',
    );

  // 3) Default variant name from the original filename (IMG-008).
  const fallbackName =
    (file.name || 'Creative').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Creative';
  const requestedName = normalize(form.get('name'));
  const name = (requestedName || fallbackName).slice(0, 80);
  const nameError = validateVariantName(name);
  if (nameError) return fail(400, nameError.code, nameError.message);

  // 4) Store the binary first; metadata is only written once the binary is
  //    safely on disk so no broken variant can exist (Development Document §11.1).
  const variantId = newId();
  const assetId = newId();
  const fileName = `${assetId}${safeExtension(sniffed)}`;
  try {
    fs.writeFileSync(path.join(uploadsDir(), fileName), buffer);
  } catch {
    return fail(502, 'STORAGE_FAILED', 'The image could not be stored. Please try again.');
  }

  const now = new Date().toISOString();
  insertAsset({
    id: assetId,
    projectId: project.id,
    variantId,
    fileName,
    mimeType: sniffed,
    bytes: buffer.length,
    width: Number(form.get('width')) || 0,
    height: Number(form.get('height')) || 0,
    createdAt: now,
  });

  insertVariant({
    id: variantId,
    projectId: project.id,
    name,
    assetId,
    createdAt: now,
    updatedAt: now,
  });

  // New upload becomes the active variant (UI/UX Flow A).
  updateProject(project.id, { activeVariantId: variantId });

  return ok({ variant: toVariantView(findVariant(variantId)!, findAsset(assetId)) }, setCookie);
}
