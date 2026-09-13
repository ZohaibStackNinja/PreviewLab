import { NextRequest } from 'next/server';
import { resolveSession } from '@/lib/auth';
import { fail, ok } from '@/lib/api-helpers';
import { findProject, findShare, insertComment, listComments, shareStatus } from '@/lib/db';
import { newId } from '@/lib/db';
import { publicComment } from '@/lib/serialize';
import { normalize, validateCommentBody, validateDisplayName } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Ctx = { params: { shareId: string } };

/**
 * Owner-side comment access (Architecture §3.1: the owner may read and write
 * review comments). The share belongs to the owner's project; comments stay
 * associated with the shared review (COM-004).
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { session, setCookie } = resolveSession(req);
  const share = findShare(ctx.params.shareId);
  const project = share ? findProject(share.projectId) : null;
  if (!share || !project || project.ownerSessionId !== session.id)
    return fail(404, 'NOT_FOUND', 'This share link could not be found.');
  return ok({ comments: listComments(share.id).map(publicComment) });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { session, setCookie } = resolveSession(req);
  const share = findShare(ctx.params.shareId);
  const project = share ? findProject(share.projectId) : null;
  if (!share || !project || project.ownerSessionId !== session.id)
    return fail(404, 'NOT_FOUND', 'This share link could not be found.');
  if (shareStatus(share) !== 'ACTIVE')
    return fail(410, 'SHARE_INACTIVE', 'This preview link is no longer active.');

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
  return ok({ comment: publicComment(comment) }, setCookie);
}
