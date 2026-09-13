import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Consistent response envelope + error contract (Development Document §4.2,
// Architecture §11.3): stable machine-readable codes, safe user-facing
// messages, no stack traces or internal details.

export function ok<T>(data: T, setCookie?: string): NextResponse {
  const res = NextResponse.json({ success: true, data, error: null });
  if (setCookie) res.cookies.set('smp_session', setCookie, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}

export function fail(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

/** Canonical public origin for share links. */
export function originFrom(req: NextRequest): string {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN.replace(/\/$/, '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
