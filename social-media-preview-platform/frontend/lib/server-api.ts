import type { ApiEnvelope } from './types';

const API_URL = process.env.API_URL || 'http://localhost:4000';

export class ServerApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(path: string, cookie?: string): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    headers: cookie ? { cookie } : undefined,
    cache: 'no-store',
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // Fall through to the HTTP status when the backend did not return JSON.
  }

  if (payload?.success) return payload.data;

  throw new ServerApiError(
    response.status,
    payload?.error?.code || `HTTP_${response.status}`,
    payload?.error?.message || 'The API request failed.',
  );
}
