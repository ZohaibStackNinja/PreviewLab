'use client';

import type { ApiEnvelope } from './types';

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** Thin fetch wrapper that unwraps the API envelope and raises ApiError. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: 'same-origin', ...init });
  } catch {
    throw new ApiError('NETWORK', 'Could not reach the server. Check your connection and try again.');
  }
  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = await res.json();
  } catch {
    // fall through to status handling
  }
  if (payload && payload.success) return payload.data;
  const code = payload?.error?.code ?? `HTTP_${res.status}`;
  const message =
    payload?.error?.message ?? 'Something went wrong. Please try again in a moment.';
  throw new ApiError(code, message);
}

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return api<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Multipart upload — the browser must set the multipart boundary itself. */
export function postForm<T>(path: string, form: FormData): Promise<T> {
  return api<T>(path, { method: 'POST', body: form });
}

/** Multipart upload with progress events and cancellation (XHR-based). */
export function postFormWithProgress<T>(
  path: string,
  form: FormData,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', path);
    xhr.responseType = 'json';
    const abort = () => {
      xhr.abort();
      reject(new ApiError('UPLOAD_CANCELLED', 'Upload cancelled.'));
    };
    if (signal) {
      if (signal.aborted) return abort();
      signal.addEventListener('abort', abort);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      const payload = xhr.response as ApiEnvelope<T> | null;
      if (payload && payload.success) return resolve(payload.data);
      const code = payload?.error?.code ?? `HTTP_${xhr.status}`;
      const message =
        payload?.error?.message ?? 'The upload failed. Please check your connection and try again.';
      reject(new ApiError(code, message));
    };
    xhr.onerror = () =>
      reject(new ApiError('NETWORK', 'The upload failed. Please check your connection and try again.'));
    xhr.onabort = () => reject(new ApiError('UPLOAD_CANCELLED', 'Upload cancelled.'));
    xhr.send(form);
  });
}

export function patchJson<T>(path: string, body: unknown): Promise<T> {
  return api<T>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function del<T>(path: string): Promise<T> {
  return api<T>(path, { method: 'DELETE' });
}
