import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import type { Session } from './types';
import { createSession, findSession } from './db';
import { generateToken, hashSessionToken } from './tokens';

// Owner session model (ADR-006): no accounts in the MVP. An anonymous owner
// session in an HttpOnly cookie provides private-workspace continuity; public
// reviewers never use sessions, only share tokens.

export const SESSION_COOKIE = 'smp_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

/**
 * Route-handler helper: resolves the owner session from the request cookie.
 * If absent or expired, creates a fresh session; the caller must attach
 * `setCookie` to its response so the browser keeps the new token.
 */
export function resolveSession(req: NextRequest): { session: Session; setCookie?: string } {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (raw) {
    const existing = findSession(hashSessionToken(raw));
    if (existing) return { session: existing };
  }
  const token = generateToken(32);
  const session = createSession(hashSessionToken(token), SESSION_TTL_MS);
  return { session, setCookie: token };
}

/** Server-component helper (read-only; cannot create a session). */
export function getServerSession(): Session | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return findSession(hashSessionToken(raw));
}

export function sessionOwns(session: Session, ownerSessionId: string): boolean {
  return session.id === ownerSessionId;
}
