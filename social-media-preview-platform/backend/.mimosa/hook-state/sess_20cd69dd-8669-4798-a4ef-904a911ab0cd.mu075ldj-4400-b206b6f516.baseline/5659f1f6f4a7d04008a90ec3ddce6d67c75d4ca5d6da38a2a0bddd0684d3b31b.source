import { z } from "zod";
import { isValidContext, PLATFORM_IDS } from "../utils/platforms";

/** Mongoose ObjectId params. */
export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "must be a valid id");

export const trimNonEmpty = (max: number, label: string) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(1, `Please provide a ${label}.`)
    .max(max, `${label} is limited to ${max} characters.`);

export const createProjectSchema = z.object({
  body: z.object({
    title: trimNonEmpty(120, "project name"),
    description: z.string().trim().max(500).optional().default(""),
  }),
});

export const updateProjectSchema = z
  .object({
    body: z
      .object({
        title: trimNonEmpty(120, "project name").optional(),
        description: z.string().trim().max(500).optional(),
        activeVariantId: objectIdSchema.nullable().optional(),
        lastPlatform: z
          .string()
          .refine((v) => PLATFORM_IDS.includes(v), "That preview destination is not supported.")
          .optional(),
        lastDevice: z.enum(["desktop", "mobile"]).optional(),
        lastContext: z.string().max(40).optional(),
        brandName: z.string().trim().max(80).nullable().optional(),
        brandHandle: z
          .string()
          .trim()
          .max(40)
          .transform((v) => v.replace(/^@+/, "").replace(/[^a-zA-Z0-9._]/g, "").toLowerCase())
          .nullable()
          .optional(),
        brandTagline: z.string().trim().max(160).nullable().optional(),
      })
      .partial()
      .refine((body) => Object.keys(body).length > 0, {
        message: "Nothing to update.",
      }),
  });

export const brandKindParam = z.object({
  params: z.object({
    projectId: objectIdSchema,
    kind: z.enum(["logo", "banner"]),
  }),
});

export const projectIdParam = z.object({
  params: z.object({ projectId: objectIdSchema }),
});

/** Placement context must be valid for the selected platform (BR-004). */
export const createShareSchema = z
  .object({
    body: z.object({
      variantId: objectIdSchema,
      platform: z
        .string()
        .refine((v) => PLATFORM_IDS.includes(v), "That preview destination is not supported."),
      context: z.string().optional(),
      device: z.enum(["desktop", "mobile"]),
      theme: z.enum(["dark", "light"]).optional().default("dark"),
      expiresAt: z.string().datetime({ offset: true }).optional(),
      expiresInHours: z.coerce.number().positive().max(365 * 24).optional(),
    }),
  })
  .refine(
    (data) => {
      const platform = data.body.platform;
      const context = data.body.context;
      return context === undefined || isValidContext(platform, context);
    },
    { message: "That placement is not available for this platform.", path: ["body", "context"] },
  );

export const cropAdjustmentSchema = z.object({
  x: z.coerce.number().int().min(-50).max(50),
  y: z.coerce.number().int().min(-50).max(50),
  scale: z.coerce.number().min(1).max(2),
});

export const updateVariantSchema = z
  .object({
    body: z
      .object({
        name: trimNonEmpty(80, "variant name").optional(),
        adjustments: z
          .record(
            z.string().refine((v) => PLATFORM_IDS.includes(v), "unsupported platform"),
            cropAdjustmentSchema,
          )
          .nullable()
          .optional(),
      })
      .partial()
      .refine((body) => Object.keys(body).length > 0, { message: "Nothing to update." }),
  });

export const createCommentSchema = z.object({
  body: z.object({
    displayName: trimNonEmpty(80, "display name"),
    body: trimNonEmpty(2000, "comment"),
  }),
});
