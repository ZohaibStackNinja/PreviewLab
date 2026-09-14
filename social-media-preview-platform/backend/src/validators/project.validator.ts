import { z } from "zod";
import { platformIdSchema, trimNonEmpty } from "./common.validator";

export const createProjectSchema = z.object({
  body: z.object({
    title: trimNonEmpty(120, "project name"),
    description: z.string().trim().max(500).optional().default(""),
    lastPlatform: platformIdSchema.optional(),
  }),
});

export const updateProjectSchema = z.object({
  body: z
    .object({
      title: trimNonEmpty(120, "project name").optional(),
      description: z.string().trim().max(500).optional(),
      activeVariantId: z.string().regex(/^[a-f\d]{24}$/i, "must be a valid id").nullable().optional(),
      lastPlatform: platformIdSchema.optional(),
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
    .refine((body) => Object.keys(body).length > 0, { message: "Nothing to update." }),
});
