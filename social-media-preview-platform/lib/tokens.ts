import crypto from 'crypto';

// Share / session token design (Architecture §10.1, §12):
// - high-entropy opaque random tokens
// - only a keyed hash is stored server-side; the raw token appears in the URL
//   exactly once (share links) or in an HttpOnly cookie (owner sessions)

const SHARE_SECRET =
  process.env.SHARE_TOKEN_SECRET || process.env.SESSION_SECRET || 'smp-dev-secret-do-not-use-in-production';

const SESSION_SECRET = process.env.SESSION_SECRET || 'smp-dev-secret-do-not-use-in-production';

export function generateToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashShareToken(token: string): string {
  return crypto.createHmac('sha256', SHARE_SECRET).update(token).digest('hex');
}

export function hashSessionToken(token: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
}
