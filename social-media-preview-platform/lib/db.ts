import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Asset, Comment, Project, Session, Share, Variant } from './types';

// Local file-backed store implementing the MongoDB data architecture
// (Architecture §9): the same collections/relationships, persisted as a JSON
// document. Image binaries stay out of the store — they live on disk under
// <data>/uploads and are referenced by asset metadata, mirroring the
// "metadata in DB, binaries in the asset store" boundary.
//
// The repository functions below are the only place that touches persistence;
// swapping this module for Mongoose models later does not change the API or
// the UI (Architecture §2 goal: maintainability / extensibility).

interface DbShape {
  sessions: Session[];
  projects: Project[];
  variants: Variant[];
  assets: Asset[];
  shares: Share[];
  comments: Comment[];
}

const DATA_DIR = process.env.SMP_DATA_DIR
  ? path.resolve(process.env.SMP_DATA_DIR)
  : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

const EMPTY: DbShape = { sessions: [], projects: [], variants: [], assets: [], shares: [], comments: [] };

function emptyDb(): DbShape {
  return JSON.parse(JSON.stringify(EMPTY)) as DbShape;
}

let cache: DbShape | null = null;

function ensureDirs(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function readDb(): DbShape {
  if (cache) return cache;
  ensureDirs();
  let loaded: DbShape;
  try {
    loaded = { ...emptyDb(), ...JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) };
  } catch {
    loaded = emptyDb();
  }
  cache = loaded;
  return loaded;
}

function persist(): void {
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf8');
  try {
    fs.renameSync(tmp, DB_PATH);
  } catch {
    // Windows rename-over-existing can race; fall back to a direct write.
    fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2), 'utf8');
    fs.rmSync(tmp, { force: true });
  }
}

// All mutations are synchronous (no awaits), so Node's run-to-completion
// semantics make each operation atomic against concurrent requests.
function mutate<T>(fn: (db: DbShape) => T): T {
  const db = readDb();
  const result = fn(db);
  persist();
  return result;
}

export function newId(): string {
  return crypto.randomUUID();
}

// ---------- Sessions ----------

export function createSession(tokenHash: string, ttlMs: number): Session {
  const now = new Date();
  const session: Session = {
    id: newId(),
    tokenHash,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    lastSeenAt: now.toISOString(),
  };
  mutate((db) => db.sessions.push(session));
  return session;
}

export function findSession(tokenHash: string): Session | null {
  const db = readDb();
  const s = db.sessions.find((x) => x.tokenHash === tokenHash);
  if (!s) return null;
  if (new Date(s.expiresAt).getTime() <= Date.now()) return null;
  return s;
}

// ---------- Projects ----------

export function insertProject(project: Project): Project {
  mutate((db) => db.projects.push(project));
  return project;
}

export function findProject(id: string): Project | null {
  return readDb().projects.find((p) => p.id === id) || null;
}

export function updateProject(id: string, patch: Partial<Project>): Project | null {
  return mutate((db) => {
    const p = db.projects.find((x) => x.id === id);
    if (!p) return null;
    Object.assign(p, patch, { updatedAt: new Date().toISOString() });
    return p;
  });
}

export function deleteProject(id: string): boolean {
  return mutate((db) => {
    const before = db.projects.length;
    const removedShareIds = new Set(db.shares.filter((s) => s.projectId === id).map((s) => s.id));
    db.projects = db.projects.filter((p) => p.id !== id);
    db.variants = db.variants.filter((v) => v.projectId !== id);
    db.assets = db.assets.filter((a) => a.projectId !== id);
    db.shares = db.shares.filter((s) => s.projectId !== id);
    db.comments = db.comments.filter((c) => !removedShareIds.has(c.shareId));
    return db.projects.length < before;
  });
}

export function listProjects(ownerSessionId: string): Project[] {
  return readDb()
    .projects.filter((p) => p.ownerSessionId === ownerSessionId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// ---------- Variants + assets ----------

export function insertVariant(variant: Variant): Variant {
  mutate((db) => db.variants.push(variant));
  return variant;
}

export function findVariant(id: string): Variant | null {
  return readDb().variants.find((v) => v.id === id) || null;
}

export function listVariants(projectId: string): Variant[] {
  return readDb()
    .variants.filter((v) => v.projectId === projectId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function updateVariant(id: string, patch: Partial<Variant>): Variant | null {
  return mutate((db) => {
    const v = db.variants.find((x) => x.id === id);
    if (!v) return null;
    Object.assign(v, patch, { updatedAt: new Date().toISOString() });
    return v;
  });
}

// Returns variant + asset ids so the caller can remove the stored binary.
export function deleteVariant(id: string): { variantId: string; assetId: string | null } | null {
  return mutate((db) => {
    const v = db.variants.find((x) => x.id === id);
    if (!v) return null;
    db.variants = db.variants.filter((x) => x.id !== id);
    const asset = db.assets.find((a) => a.variantId === id) || null;
    db.assets = db.assets.filter((a) => a.variantId !== id);
    // Orphan prevention (NFR-009): any project pointing at the removed variant
    // as active falls back to its first remaining variant.
    for (const p of db.projects) {
      if (p.activeVariantId === id) {
        const first = db.variants
          .filter((x) => x.projectId === p.id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
        p.activeVariantId = first ? first.id : null;
      }
    }
    return { variantId: id, assetId: asset ? asset.id : null };
  });
}

export function insertAsset(asset: Asset): Asset {
  mutate((db) => db.assets.push(asset));
  return asset;
}

export function findAsset(id: string): Asset | null {
  return readDb().assets.find((a) => a.id === id) || null;
}

/** Removes an asset record and its stored binary (brand asset replacement). */
export function deleteAssetRecord(id: string): void {
  mutate((db) => {
    db.assets = db.assets.filter((a) => a.id !== id);
  });
  deleteAssetBinary(id);
}

export function deleteAssetBinary(assetId: string): void {
  const asset = findAsset(assetId);
  if (!asset) return;
  try {
    fs.rmSync(path.join(UPLOADS_DIR, asset.fileName), { force: true });
  } catch {
    // best-effort cleanup
  }
}

export function uploadsDir(): string {
  ensureDirs();
  return UPLOADS_DIR;
}

// ---------- Shares ----------

export function insertShare(share: Share): Share {
  mutate((db) => db.shares.push(share));
  return share;
}

export function findShareByTokenHash(tokenHash: string): Share | null {
  return readDb().shares.find((s) => s.tokenHash === tokenHash) || null;
}

export function findShare(id: string): Share | null {
  return readDb().shares.find((s) => s.id === id) || null;
}

export function listShares(projectId: string): Share[] {
  return readDb()
    .shares.filter((s) => s.projectId === projectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function revokeShare(id: string): Share | null {
  return mutate((db) => {
    const s = db.shares.find((x) => x.id === id);
    if (!s || s.revokedAt) return s || null;
    s.revokedAt = new Date().toISOString();
    return s;
  });
}

export function shareStatus(share: Share): 'ACTIVE' | 'EXPIRED' | 'REVOKED' {
  if (share.revokedAt) return 'REVOKED';
  if (new Date(share.expiresAt).getTime() <= Date.now()) return 'EXPIRED';
  return 'ACTIVE';
}

// ---------- Comments ----------

export function insertComment(comment: Comment): Comment {
  mutate((db) => db.comments.push(comment));
  return comment;
}

export function listComments(shareId: string): Comment[] {
  return readDb()
    .comments.filter((c) => c.shareId === shareId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
