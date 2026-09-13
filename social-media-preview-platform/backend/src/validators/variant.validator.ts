import { z } from "zod";
import { cropAdjustmentSchema, trimNonEmpty } from "./common.validator";

/**
 * Variant update: rename and/or per-platform crop adjustments
 * (offset ±50%, scale 1–2×) keyed by platform id.
 */
export const updateVariantSchema = z.object({
  body: z
    .object({
      name: trimNonEmpty(80, "variant name").optional(),
      adjustments: z
        .record(cropAdjustmentSchema)
        .nullable()
        .optional(),
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, { message: "Nothing to update." }),
});
