import { z } from "zod";
import { PLATFORM_IDS } from "../utils/platforms";

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

export const platformIdSchema = z
  .string()
  .refine((v) => PLATFORM_IDS.includes(v), "That preview destination is not supported.");

export const cropAdjustmentSchema = z.object({
  x: z.coerce.number().int().min(-50).max(50),
  y: z.coerce.number().int().min(-50).max(50),
  scale: z.coerce.number().min(1).max(2),
});

export const projectIdParam = z.object({
  params: z.object({ projectId: objectIdSchema }),
});

export const projectParamsWithKind = z.object({
  params: z.object({
    projectId: objectIdSchema,
    kind: z.enum(["logo", "banner"]),
  }),
});

export const variantIdParam = z.object({
  params: z.object({ variantId: objectIdSchema }),
});

export const shareIdParam = z.object({
  params: z.object({ shareId: objectIdSchema }),
});

export const shareTokenParam = z.object({
  params: z.object({ token: z.string().min(10).max(200) }),
});
