import { Request, Response } from "express";
import { env } from "../config/env";
import { generateToken, hashSessionToken } from "../utils/token";
import { Session } from "../models/session.model";

export const SESSION_COOKIE = "smp_session";
export const SESSION_TTL_MS = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: process.env.COOKIE_SAMESITE === "none" ? ("none" as const) : ("lax" as const),
    secure: env.COOKIE_SECURE === "true" || env.isProd,
    path: "/",
    maxAge: SESSION_TTL_MS,
  };
}

/**
 * Anonymous owner session (ADR-006): no accounts in the MVP. The raw token
 * lives only in an HttpOnly cookie; MongoDB stores a keyed hash. The first
 * API call creates the session so the owner never signs in.
 */
export async function ensureSession(req: Request, res: Response): Promise<{ sessionId: string }> {
  const raw = req.cookies?.[SESSION_COOKIE];
  if (raw) {
    const session = await Session.findOne({
      tokenHash: hashSessionToken(raw),
      expiresAt: { $gt: new Date() },
    })
      .lean()
      .exec();
    if (session) {
      return { sessionId: (session as { _id: { toString(): string } })._id.toString() };
    }
  }
  const token = generateToken(32);
  const created = await Session.create({
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    lastSeenAt: new Date(),
  });
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
  return { sessionId: created._id.toString() };
}
