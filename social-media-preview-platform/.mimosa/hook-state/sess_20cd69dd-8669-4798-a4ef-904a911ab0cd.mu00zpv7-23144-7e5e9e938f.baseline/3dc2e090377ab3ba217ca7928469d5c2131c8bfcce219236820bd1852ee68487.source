import { NextRequest } from 'next/server';
import { resolveSession } from '@/lib/auth';
import { fail, ok } from '@/lib/api-helpers';
import { findProject, findShare, listComments } from '@/lib/db';
import { publicComment, toShareView } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

type Ctx = { params: { shareId: string } };

/** GET /api/shares/:id — owner view of one share link + its comments. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { session, setCookie } = resolveSession(req);
  const share = findShare(ctx.params.shareId);
  const project = share ? findProject(share.projectId) : null;
  if (!share || !project || project.ownerSessionId !== session.id)
    return fail(404, 'NOT_FOUND', 'This share link could not be found.');
  return ok(
    {
      share: toShareView(share),
      comments: listComments(share.id).map(publicComment),
    },
    setCookie,
  );
}
