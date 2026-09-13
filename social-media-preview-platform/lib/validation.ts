// Field validation rules (SRS §9/§10, Development Document §5.3).

export const MAX_TITLE = 120;
export const MAX_DESCRIPTION = 500;
export const MAX_VARIANT_NAME = 80;
export const MAX_COMMENT_BODY = 2000;
export const MAX_DISPLAY_NAME = 80;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export interface FieldError {
  code: string;
  message: string;
}

export function validateTitle(value: unknown): FieldError | null {
  const title = normalize(value);
  if (!title) return { code: 'TITLE_REQUIRED', message: 'Please give the project a name.' };
  if (title.length > MAX_TITLE)
    return { code: 'TITLE_TOO_LONG', message: `Project names are limited to ${MAX_TITLE} characters.` };
  return null;
}

export function validateVariantName(value: unknown): FieldError | null {
  const name = normalize(value);
  if (!name) return { code: 'NAME_REQUIRED', message: 'Please give the variant a name.' };
  if (name.length > MAX_VARIANT_NAME)
    return { code: 'NAME_TOO_LONG', message: `Variant names are limited to ${MAX_VARIANT_NAME} characters.` };
  return null;
}

export function validateDescription(value: unknown): FieldError | null {
  const description = normalize(value);
  if (description.length > MAX_DESCRIPTION)
    return {
      code: 'DESCRIPTION_TOO_LONG',
      message: `Descriptions are limited to ${MAX_DESCRIPTION} characters.`,
    };
  return null;
}

export function validateImageType(mimeType: string): FieldError | null {
  if (!(SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return {
      code: 'UNSUPPORTED_TYPE',
      message: 'Unsupported file type. Please upload a PNG, JPEG or WebP image.',
    };
  }
  return null;
}

export function validateImageSize(bytes: number): FieldError | null {
  if (bytes > MAX_UPLOAD_BYTES) {
    return {
      code: 'FILE_TOO_LARGE',
      message: 'That image is larger than 10 MB. Please upload a smaller file.',
    };
  }
  if (bytes <= 0) return { code: 'EMPTY_FILE', message: 'That file appears to be empty.' };
  return null;
}

export function validateCommentBody(value: unknown): FieldError | null {
  const body = normalize(value);
  if (!body) return { code: 'COMMENT_EMPTY', message: 'Please write a comment before sending.' };
  if (body.length > MAX_COMMENT_BODY)
    return { code: 'COMMENT_TOO_LONG', message: `Comments are limited to ${MAX_COMMENT_BODY} characters.` };
  return null;
}

export function validateDisplayName(value: unknown): FieldError | null {
  const name = normalize(value);
  if (!name) return { code: 'NAME_REQUIRED', message: 'Please add a display name.' };
  if (name.length > MAX_DISPLAY_NAME)
    return { code: 'NAME_TOO_LONG', message: `Display names are limited to ${MAX_DISPLAY_NAME} characters.` };
  return null;
}

/** Expiry must be strictly in the future (SHR-004). Accepts ISO or a duration. */
export function validateExpiry(expiresAt: string): FieldError | null {
  const t = new Date(expiresAt).getTime();
  if (!Number.isFinite(t)) return { code: 'INVALID_EXPIRY', message: 'That expiry date is not valid.' };
  if (t <= Date.now())
    return { code: 'EXPIRY_IN_PAST', message: 'The expiry must be later than the current time.' };
  return null;
}
