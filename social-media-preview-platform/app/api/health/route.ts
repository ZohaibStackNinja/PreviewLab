import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = readDb();
  return NextResponse.json({
    status: 'ok',
    service: 'social-media-preview-platform',
    collections: {
      sessions: db.sessions.length,
      projects: db.projects.length,
      variants: db.variants.length,
      assets: db.assets.length,
      shares: db.shares.length,
      comments: db.comments.length,
    },
    time: new Date().toISOString(),
  });
}
