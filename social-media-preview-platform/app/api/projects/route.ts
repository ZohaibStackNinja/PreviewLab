import { NextRequest } from 'next/server';
import { resolveSession } from '@/lib/auth';
import { fail, ok } from '@/lib/api-helpers';
import { insertProject, listProjects } from '@/lib/db';
import { newId } from '@/lib/db';
import { toProjectSummary } from '@/lib/serialize';
import { DEFAULT_PLATFORM, DEFAULT_DEVICE } from '@/lib/platforms';
import { normalize, validateDescription, validateTitle } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { session, setCookie } = resolveSession(req);
  const projects = listProjects(session.id).map(toProjectSummary);
  return ok({ projects }, setCookie);
}

export async function POST(req: NextRequest) {
  const { session, setCookie } = resolveSession(req);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'INVALID_BODY', 'The request body must be valid JSON.');
  }

  const title = normalize(body.title);
  const error = validateTitle(title) || validateDescription(body.description);
  if (error) return fail(400, error.code, error.message);

  const now = new Date().toISOString();
  const project = insertProject({
    id: newId(),
    ownerSessionId: session.id,
    title,
    description: normalize(body.description),
    activeVariantId: null,
    lastPlatform: DEFAULT_PLATFORM,
    lastDevice: DEFAULT_DEVICE,
    createdAt: now,
    updatedAt: now,
  });
  return ok({ project: toProjectSummary(project) }, setCookie);
}
