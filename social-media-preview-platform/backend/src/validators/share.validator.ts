import { z } from "zod";
import { isValidContext } from "../utils/platforms";
import { platformIdSchema, objectIdSchema } from "./common.validator";

/**
 * Share creation (SHR-001..004): a share snapshots the exact preview state
 * (variant + platform + context + device/theme) and expires after 24 hours
 * by default, or at an owner-chosen future date. The placement context must
 * be valid for the platform (BR-004).
 */
export const createShareSchema = z
  .object({
    body: z.object({
      variantId: objectIdSchema,
      platform: platformIdSchema,
      context: z.string().max(40).optional(),
      device: z.enum(["desktop", "mobile"]),
      theme: z.enum(["dark", "light"]).optional().default("dark"),
      expiresAt: z.string().datetime({ offset: true }).optional(),
      expiresInHours: z.coerce.number().positive().max(365 * 24).optional(),
    }),
  })
  .refine(
    (data) => {
      const context = data.body.context;
      return context === undefined || isValidContext(data.body.platform, context);
    },
    { message: "That placement is not available for this platform.", path: ["body", "context"] },
  )
  .refine(
    (data) => !(data.body.expiresAt !== undefined && data.body.expiresInHours !== undefined),
    {
      message: "Provide either expiresAt or expiresInHours, not both.",
      path: ["body", "expiresAt"],
    },
  );
