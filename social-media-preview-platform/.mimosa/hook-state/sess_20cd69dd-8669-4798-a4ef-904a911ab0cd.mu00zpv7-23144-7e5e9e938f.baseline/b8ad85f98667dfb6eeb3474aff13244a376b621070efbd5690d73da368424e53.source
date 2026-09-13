import { NextRequest } from 'next/server';
import { resolveSession } from '@/lib/auth';
import { fail, ok } from '@/lib/api-helpers';
import { findProject, findShare, revokeShare } from '@/lib/db';
import { toShareView } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

type Ctx = { params: { shareId: string } };

/** POST /api/shares/:id/revoke — owner revokes an active link (SHR-005, UC-09). */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { session, setCookie } = resolveSession(req);
  const share = findShare(ctx.params.shareId);
  const project = share ? findProject(share.projectId) : null;
  if (!share || !project || project.ownerSessionId !== session.id)
    return fail(404, 'NOT_FOUND', 'This share link could not be found.');
  const revoked = revokeShare(share.id);
  return ok({ share: toShareView(revoked!) }, setCookie);
}
