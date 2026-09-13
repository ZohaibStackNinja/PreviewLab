import { z } from "zod";
import { trimNonEmpty } from "./common.validator";

/** Guest comment (COM-001..003): display name + body, no account. */
export const createCommentSchema = z.object({
  body: z.object({
    displayName: trimNonEmpty(80, "display name"),
    body: trimNonEmpty(2000, "comment"),
  }),
});
