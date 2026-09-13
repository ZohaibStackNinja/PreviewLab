import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api-helpers';
import { findShareByTokenHash, insertComment, listComments, shareStatus } from '@/lib/db';
import { newId } from '@/lib/db';
import { publicComment } from '@/lib/serialize';
import { hashShareToken } from '@/lib/tokens';
import { normalize, validateCommentBody, validateDisplayName } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Ctx = { params: { token: string } };

// Light in-memory throttle on the public endpoint (Architecture §10.3).
const recentPosts = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (recentPosts.get(key) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recentPosts.set(key, hits);
  return hits.length > MAX_PER_WINDOW;
}

/**
 * Public, token-authenticated comment access (Architecture §10.3).
 * GET lists comments on an ACTIVE share; POST adds one as a guest.
 * Expired/revoked/invalid tokens fail closed (SEC-004) without revealing
 * whether any other token exists (SEC-008).
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const share = findShareByTokenHash(hashShareToken(ctx.params.token));
  if (!share) return fail(404, 'SHARE_UNAVAILABLE', 'This preview link is no longer available.');
  const status = shareStatus(share);
  if (status !== 'ACTIVE') return fail(410, status, 'This preview link is no longer available.');
  return ok({ comments: listComments(share.id).map(publicComment) });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const share = findShareByTokenHash(hashShareToken(ctx.params.token));
  if (!share) return fail(404, 'SHARE_UNAVAILABLE', 'This preview link is no longer available.');
  const status = shareStatus(share);
  if (status !== 'ACTIVE') return fail(410, status, 'This preview link is no longer available.');
  if (rateLimited(share.id))
    return fail(429, 'RATE_LIMITED', 'Too many comments were sent in a short time. Please wait a moment and try again.');

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'INVALID_BODY', 'The request body must be valid JSON.');
  }

  const displayName = normalize(body.displayName);
  const messageBody = normalize(body.body);
  const err = validateDisplayName(displayName) || validateCommentBody(messageBody);
  if (err) return fail(400, err.code, err.message);

  const comment = insertComment({
    id: newId(),
    shareId: share.id,
    displayName,
    body: messageBody,
    createdAt: new Date().toISOString(),
  });
  return ok({ comment: publicComment(comment) });
}
