import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

/** Typed application error carrying a stable machine code + safe message. */
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notFound = (code = "NOT_FOUND", message = "Not found.") =>
  new ApiError(404, code, message);

/** Response envelope (Development Document §4.2). */
export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data, error: null });
}

/**
 * Central error middleware: every thrown error becomes the stable envelope
 * `{ success, data, error: { code, message } }`. Internal details (stack
 * traces, driver errors) never reach the client.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      success: false,
      data: null,
      error: { code: err.code, message: err.message },
    });
    return;
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    res.status(400).json({
      success: false,
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input.",
      },
    });
    return;
  }
  if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "LIMIT_FILE_SIZE") {
    res.status(400).json({
      success: false,
      data: null,
      error: { code: "FILE_TOO_LARGE", message: "That image is larger than the allowed size." },
    });
    return;
  }
  console.error("[api] unhandled error:", err);
  res.status(500).json({
    success: false,
    data: null,
    error: { code: "INTERNAL", message: "Something went wrong. Please try again in a moment." },
  });
}
