import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { findAsset, uploadsDir } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: { assetId: string } };

/**
 * Serves the stored image binary. Asset IDs are unguessable UUIDs and are the
 * only reference kept in metadata (Architecture §8: binaries live outside the
 * application store; metadata references a delivery URL).
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const asset = findAsset(ctx.params.assetId);
  if (!asset) return new NextResponse('Not found', { status: 404 });

  const filePath = path.join(uploadsDir(), asset.fileName);
  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(filePath);
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': asset.mimeType,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
