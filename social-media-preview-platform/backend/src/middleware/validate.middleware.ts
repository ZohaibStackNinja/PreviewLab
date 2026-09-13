import { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "./error.middleware";

type AnyZodObject = z.ZodTypeAny;

/**
 * Validates request data at the boundary BEFORE controller/service execution
 * and replaces the request fields with the parsed (transformed) values.
 */
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: (err?: unknown) => void): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      }) as { body?: unknown; params?: unknown; query?: unknown };
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.params !== undefined)
        Object.assign(req.params, parsed.params as Record<string, unknown>);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const first = err.issues[0];
        next(
          new ApiError(
            400,
            "VALIDATION_ERROR",
            first
              ? `${first.path.filter((p) => p !== "body" && p !== "params").join(".") || "input"}: ${first.message}`
              : "Invalid input.",
          ),
        );
        return;
      }
      next(err);
    }
  };
}

/** Wraps async controllers so rejected promises reach the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: (err?: unknown) => void) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}
