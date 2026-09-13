import crypto from "crypto";

/**
 * Token utilities (Architecture §10.1, §12):
 * - share/session tokens are high-entropy opaque random values
 * - only a keyed HMAC hash is persisted; the raw token appears exactly once
 *   in the share URL or inside the HttpOnly owner-session cookie
 */

export function generateToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashWithSecret(secret: string, value: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function hashShareToken(token: string): string {
  return hashWithSecret(process.env.SHARE_TOKEN_SECRET || "preview-lab-dev-share-secret", token);
}

export function hashSessionToken(token: string): string {
  return hashWithSecret(process.env.SESSION_SECRET || "preview-lab-dev-session-secret", token);
}

export type ShareState = "ACTIVE" | "EXPIRED" | "REVOKED";

/** Pure lifecycle rule — request-time authorization, not TTL cleanup. */
export function shareState(
  share: { expiresAt: Date | string; revokedAt: Date | string | null },
  now: Date = new Date(),
): ShareState {
  if (share.revokedAt) return "REVOKED";
  if (new Date(share.expiresAt).getTime() <= now.getTime()) return "EXPIRED";
  return "ACTIVE";
}
