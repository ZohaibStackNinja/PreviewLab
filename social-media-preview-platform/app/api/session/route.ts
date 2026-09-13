import { NextRequest, NextResponse } from 'next/server';
import { resolveSession } from '@/lib/auth';
import { ok } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/** Creates or refreshes the anonymous owner session (ADR-006: no accounts). */
export async function POST(_req: NextRequest) {
  const { session, setCookie } = resolveSession(_req);
  return ok(
    { sessionId: session.id, expiresAt: session.expiresAt },
    setCookie,
  );
}

export async function GET(req: NextRequest) {
  const { session } = resolveSession(req);
  return NextResponse.json({ authenticated: true, sessionId: session.id });
}
