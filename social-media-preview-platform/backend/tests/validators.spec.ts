import { describe, expect, it } from "vitest";
import { createShareSchema } from "../src/validators/share.validator";
import { createCommentSchema } from "../src/validators/comment.validator";
import { createProjectSchema, updateProjectSchema } from "../src/validators/project.validator";
import { updateVariantSchema } from "../src/validators/variant.validator";

describe("createProjectSchema", () => {
  it("trims and accepts a valid project", () => {
    const parsed = createProjectSchema.parse({
      body: { title: "  Q4 Brand Launch  ", description: " hero creatives " },
    });
    expect(parsed.body.title).toBe("Q4 Brand Launch");
    expect(parsed.body.description).toBe("hero creatives");
  });

  it("rejects an empty title", () => {
    expect(() =>
      createProjectSchema.parse({ body: { title: "   " } }),
    ).toThrow();
  });
});

describe("createShareSchema", () => {
  const valid = {
    variantId: "5f8d0d55b54764421ba34d0e",
    platform: "linkedin",
    device: "desktop",
  };

  it("accepts a minimal share (defaults 24h + dark theme)", () => {
    const parsed = createShareSchema.parse({ body: valid });
    expect(parsed.body.theme).toBe("dark");
    expect(parsed.body.expiresInHours).toBeUndefined();
  });

  it("rejects an invalid placement context (BR-004)", () => {
    expect(() =>
      createShareSchema.parse({ body: { ...valid, context: "bogus" } }),
    ).toThrow();
  });

  it("accepts a valid placement for the platform", () => {
    expect(() =>
      createShareSchema.parse({
        body: { ...valid, platform: "youtube", context: "channel" },
      }),
    ).not.toThrow();
  });

  it("rejects past expiries only at the service layer (schema shape check)", () => {
    // The schema accepts the ISO shape; the future check is business logic.
    expect(() =>
      createShareSchema.parse({
        body: { ...valid, expiresAt: "not-a-date" },
      }),
    ).toThrow();
  });
});

describe("updateVariantSchema", () => {
  it("accepts name + in-range adjustments", () => {
    const parsed = updateVariantSchema.parse({
      body: {
        name: "Hero",
        adjustments: { youtube: { x: 12, y: -8, scale: 1.3 } },
      },
    });
    expect(parsed.body.name).toBe("Hero");
  });

  it("rejects out-of-range offsets and scale", () => {
    expect(() =>
      updateVariantSchema.parse({
        body: { adjustments: { youtube: { x: 90, y: 0, scale: 1 } } },
      }),
    ).toThrow();
    expect(() =>
      updateVariantSchema.parse({
        body: { adjustments: { youtube: { x: 0, y: 0, scale: 3 } } },
      }),
    ).toThrow();
  });
});

describe("createCommentSchema", () => {
  it("trims display name and body", () => {
    const parsed = createCommentSchema.parse({
      body: { displayName: "  Dana  ", body: " Looks great — approve. " },
    });
    expect(parsed.body.displayName).toBe("Dana");
    expect(parsed.body.body).toBe("Looks great — approve.");
  });

  it("rejects empty comments (COM-003)", () => {
    expect(() =>
      createCommentSchema.parse({ body: { displayName: "Dana", body: "   " } }),
    ).toThrow();
  });
});

describe("project + variant validator modules", () => {
  it("expose the documented schemas", () => {
    expect(updateProjectSchema).toBeDefined();
    expect(updateVariantSchema).toBeDefined();
  });
});
