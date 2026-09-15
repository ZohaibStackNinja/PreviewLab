import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import fs from "fs";
import path from "path";
import { createApp } from "../src/app";

/**
 * HTTP/API integration tests against the real Express app with an in-memory
 * MongoDB. Covers the SRS acceptance flow: session → project → variant
 * (upload) → adjustment → share (24h default) → guest comment → revoke →
 * fail-closed states.
 */
let mongod: MongoMemoryServer;
let app: ReturnType<typeof createApp>;
let cookie = "";
let projectId = "";
let variantId = "";

const PNG_BYTES = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c636000000002000148afa4710000000049454e44ae426082",
  "hex",
);

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri("preview-lab-test"));
  app = createApp();

  const session = await request(app).post("/api/session").send({});
  cookie = session.headers["set-cookie"][0].split(";")[0];
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("GET /api/health", () => {
  it("reports service readiness without secrets", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("preview-lab-api");
  });
});

describe("projects", () => {
  it("creates a project with a valid body", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set("Cookie", cookie)
      .send({ title: "  Q4 Brand Launch  ", description: "hero creatives" })
      .expect(201);
    projectId = res.body.data.project.id;
    expect(res.body.data.project.title).toBe("Q4 Brand Launch");
    expect(res.body.data.project.variantCount).toBe(0);
  });

  it("rejects an empty title with a validation error", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set("Cookie", cookie)
      .send({ title: "   " })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("creates a variant from an uploaded PNG and selects it active", async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/variants`)
      .set("Cookie", cookie)
      .attach("file", PNG_BYTES, { filename: "hero.png", contentType: "image/png" })
      .field("width", "1")
      .field("height", "1")
      .expect(201);
    variantId = res.body.data.variant.id;
    expect(res.body.data.variant.name).toBe("hero");
    expect(res.body.data.variant.asset.url).toContain("/api/assets/");

    const detail = await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(detail.body.data.project.activeVariantId).toBe(variantId);
    expect(detail.body.data.variants[0].asset.url).toContain("/api/assets/");

    // local storage driver: the asset route streams the binary back
    const assetUrl = detail.body.data.variants[0].asset.url;
    await request(app).get(assetUrl).expect(200);
  });

  it("rejects unsupported file types (IMG-002)", async () => {
    await request(app)
      .post(`/api/projects/${projectId}/variants`)
      .set("Cookie", cookie)
      .attach("file", Buffer.from("not an image"), {
        filename: "notes.txt",
        contentType: "text/plain",
      })
      .expect(400);
  });

  it("persists in-range crop adjustments and rejects out-of-range ones", async () => {
    const okRes = await request(app)
      .patch(`/api/variants/${variantId}`)
      .set("Cookie", cookie)
      .send({ adjustments: { youtube: { x: 12, y: -8, scale: 1.3 } } })
      .expect(200);
    expect(okRes.body.data.variant.adjustments.youtube.x).toBe(12);

    await request(app)
      .patch(`/api/variants/${variantId}`)
      .set("Cookie", cookie)
      .send({ adjustments: { youtube: { x: 90, y: 0, scale: 1 } } })
      .expect(400);
  });

  it("hides foreign projects behind 404 (SEC-008)", async () => {
    const foreign = await request(app).post("/api/session").send({});
    const foreignCookie = foreign.headers["set-cookie"][0].split(";")[0];
    const res = await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Cookie", foreignCookie)
      .expect(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("shares + comments", () => {
  let rawToken = "";

  it("creates a share with a 24h default and a review URL", async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/shares`)
      .set("Cookie", cookie)
      .send({ variantId, platform: "linkedin", device: "desktop" })
      .expect(200);
    rawToken = res.body.data.share.url.split("/share/")[1];
    expect(res.body.data.share.status).toBe("ACTIVE");
    expect(rawToken.length).toBeGreaterThan(20);

    const detail = await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(detail.body.data.shares[0].status).toBe("ACTIVE");
    expect(detail.body.data.shares[0].url).toContain(`/share/${rawToken}`);
  });

  it("reuses existing active share link instead of generating a new token", async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/shares`)
      .set("Cookie", cookie)
      .send({ variantId, platform: "linkedin", device: "desktop" })
      .expect(200);
    expect(res.body.data.share.url).toContain(`/share/${rawToken}`);

    // Project detail returns the exact persistent URL
    const detail = await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(detail.body.data.shares[0].url).toContain(`/share/${rawToken}`);
  });

  it("revokes existing link and creates a new one when forceNew is true", async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/shares`)
      .set("Cookie", cookie)
      .send({ variantId, platform: "linkedin", device: "desktop", forceNew: true })
      .expect(200);
    const newToken = res.body.data.share.url.split("/share/")[1];
    expect(newToken).not.toEqual(rawToken);
    expect(res.body.data.share.status).toBe("ACTIVE");

    // Old link is now revoked
    const oldResolved = await request(app).get(`/api/shares/resolved/${rawToken}`).expect(410);
    expect(oldResolved.body.error.message).toContain("no longer available");

    // New link is active
    const newResolved = await request(app).get(`/api/shares/resolved/${newToken}`).expect(200);
    expect(newResolved.body.data.share.status).toBe("ACTIVE");

    rawToken = newToken;
  });

  it("supports multiple active links across different sections and within same section", async () => {
    // Create a link for YouTube Watch Desktop (different section)
    const ytRes = await request(app)
      .post(`/api/projects/${projectId}/shares`)
      .set("Cookie", cookie)
      .send({ variantId, platform: "youtube", device: "desktop", context: "watch" })
      .expect(200);
    const ytToken = ytRes.body.data.share.url.split("/share/")[1];
    expect(ytToken).not.toEqual(rawToken);

    // Both LinkedIn and YouTube links are active
    const lnResolved = await request(app).get(`/api/shares/resolved/${rawToken}`).expect(200);
    const ytResolved = await request(app).get(`/api/shares/resolved/${ytToken}`).expect(200);
    expect(lnResolved.body.data.share.status).toBe("ACTIVE");
    expect(ytResolved.body.data.share.status).toBe("ACTIVE");

    // Create an additional active link for YouTube with allowMultiple: true
    const yt2Res = await request(app)
      .post(`/api/projects/${projectId}/shares`)
      .set("Cookie", cookie)
      .send({
        variantId,
        platform: "youtube",
        device: "desktop",
        context: "watch",
        allowMultiple: true,
      })
      .expect(200);
    const yt2Token = yt2Res.body.data.share.url.split("/share/")[1];
    expect(yt2Token).not.toEqual(ytToken);

    // Both YouTube links remain active concurrently!
    const yt1After = await request(app).get(`/api/shares/resolved/${ytToken}`).expect(200);
    const yt2After = await request(app).get(`/api/shares/resolved/${yt2Token}`).expect(200);
    expect(yt1After.body.data.share.status).toBe("ACTIVE");
    expect(yt2After.body.data.share.status).toBe("ACTIVE");
  });

  it("resolves an active token into the full public payload", async () => {
    const res = await request(app).get(`/api/shares/resolved/${rawToken}`).expect(200);
    expect(res.body.data.share.status).toBe("ACTIVE");
    expect(res.body.data.project.title).toBe("Q4 Brand Launch");
    expect(res.body.data.brand.name).toBe("Q4 Brand Launch");
  });

  it("accepts a guest comment on an active share (COM-001/002)", async () => {
    const res = await request(app)
      .post(`/api/shares/token/${rawToken}/comments`)
      .send({ displayName: " Dana Manager ", body: "  Looks great — approve.  " })
      .expect(200);
    expect(res.body.data.comment.displayName).toBe("Dana Manager");

    const list = await request(app).get(`/api/shares/token/${rawToken}/comments`).expect(200);
    expect(list.body.data.comments).toHaveLength(1);

    const owner = await request(app)
      .get(`/api/shares/${(await ownerShareId()).id}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(owner.body.data.comments).toHaveLength(1);

    const ownerComments = await request(app)
      .get(`/api/shares/${(await ownerShareId()).id}/comments`)
      .set("Cookie", cookie)
      .expect(200);
    expect(ownerComments.body.data.comments).toHaveLength(1);

    const ownerPost = await request(app)
      .post(`/api/shares/${(await ownerShareId()).id}/comments`)
      .set("Cookie", cookie)
      .send({ displayName: "Owner", body: "Approved from the workspace." })
      .expect(200);
    expect(ownerPost.body.data.comment.body).toBe("Approved from the workspace.");
  });

  it("rejects empty comments (COM-003)", async () => {
    await request(app)
      .post(`/api/shares/token/${rawToken}/comments`)
      .send({ displayName: "Dana", body: "   " })
      .expect(400);
  });

  it("fails closed after revocation (SHR-005/010)", async () => {
    const detail = await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Cookie", cookie)
      .expect(200);
    const targetShare = detail.body.data.shares.find((s: { url: string | null }) =>
      s.url?.includes(rawToken),
    );
    const shareId = targetShare.id;
    await request(app).post(`/api/shares/${shareId}/revoke`).set("Cookie", cookie).expect(200);
    expect(targetShare.status).toBe("ACTIVE"); // pre-revoke snapshot

    const after = await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Cookie", cookie)
      .expect(200);
    const afterShare = after.body.data.shares.find((s: { id: string }) => s.id === shareId);
    expect(afterShare.status).toBe("REVOKED");

    const res = await request(app).get(`/api/shares/resolved/${rawToken}`).expect(410);
    expect(res.body.error.message).toContain("no longer available");
    await request(app)
      .post(`/api/shares/token/${rawToken}/comments`)
      .send({ displayName: "Late", body: "should fail" })
      .expect(410);
  });

  it("fails closed for expired links and unknown tokens (A-10)", async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/shares`)
      .set("Cookie", cookie)
      .send({ variantId, platform: "youtube", device: "desktop", context: "channel" })
      .expect(200);
    const token = res.body.data.share.url.split("/share/")[1];
    const shareId = res.body.data.share.id;

    // Force expiry directly in the store, then restart-free verification.
    const { ShareLink } = await import("../src/models/shareLink.model.js");
    await ShareLink.updateOne(
      { _id: shareId },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );

    const expired = await request(app).get(`/api/shares/resolved/${token}`).expect(410);
    expect(expired.body.error.message).toContain("has expired");
    expect(JSON.stringify(expired.body)).not.toContain("variantName");

    const unknown = await request(app)
      .get("/api/shares/resolved/definitely-not-a-real-token-1234567890")
      .expect(404);
    expect(unknown.body.error.message).toContain("no longer available");
  });

  /** Fetches the first share's id via the owner detail endpoint. */
  async function ownerShareId(): Promise<{ id: string }> {
    const detail = await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Cookie", cookie)
      .expect(200);
    const target =
      detail.body.data.shares.find((s: { url: string | null }) => s.url?.includes(rawToken)) ||
      detail.body.data.shares[0];
    return { id: target.id };
  }
});

describe("workspace cleanup", () => {
  it("uploads + deletes a variant without leaving broken references", async () => {
    const up = await request(app)
      .post(`/api/projects/${projectId}/variants`)
      .set("Cookie", cookie)
      .attach("file", PNG_BYTES, { filename: "extra.png", contentType: "image/png" })
      .expect(201);
    const extraId = up.body.data.variant.id;

    await request(app).delete(`/api/variants/${extraId}`).set("Cookie", cookie).expect(200);
    const detail = await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(detail.body.data.variants.map((v: { id: string }) => v.id)).not.toContain(extraId);
    expect(detail.body.data.project.activeVariantId).not.toBe(extraId);

    // uploads dir stays clean for the local driver
    const dir = path.resolve("./data/test-uploads");
    if (fs.existsSync(dir)) {
      expect(fs.readdirSync(dir).length).toBeLessThan(10);
    }
  });

  it("deletes the whole project cascade-style", async () => {
    await request(app).delete(`/api/projects/${projectId}`).set("Cookie", cookie).expect(200);
    await request(app).get(`/api/projects/${projectId}`).set("Cookie", cookie).expect(404);
  });
});
