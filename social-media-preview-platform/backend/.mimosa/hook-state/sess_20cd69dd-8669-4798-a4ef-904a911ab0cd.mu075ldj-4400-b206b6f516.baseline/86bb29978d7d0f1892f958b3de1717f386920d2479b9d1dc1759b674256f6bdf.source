import { Request } from "express";
import multer from "multer";
import { ApiError } from "./error.middleware";
import { env } from "../config/env";
import { SUPPORTED_IMAGE_TYPES } from "../services/cloudinary.service";

/** Server-side format check — never trust the client MIME (Dev Doc §6.2). */
export function sniffImageType(buffer: Buffer): "image/png" | "image/jpeg" | "image/webp" | null {
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(
      new ApiError(
        400,
        "UNSUPPORTED_TYPE",
        "Unsupported file type. Please upload a PNG, JPEG or WebP image.",
      ),
    );
    return;
  }
  cb(null, true);
}

/** Multer memory storage: bytes are validated + uploaded by the services. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter,
});
