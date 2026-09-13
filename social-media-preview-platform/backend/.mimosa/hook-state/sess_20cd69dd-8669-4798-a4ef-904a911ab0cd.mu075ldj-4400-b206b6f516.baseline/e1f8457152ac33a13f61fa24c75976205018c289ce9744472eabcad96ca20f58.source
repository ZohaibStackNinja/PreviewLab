import crypto from "crypto";
import fs from "fs";
import path from "path";
import { cloudinary } from "../config/cloudinary";
import { env } from "../config/env";
import { ApiError } from "../middleware/error.middleware";

export const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export interface StoredImage {
  provider: "cloudinary" | "local";
  publicId: string;
  url: string;
  fileName: string;
  bytes: number;
}

function localUploadDir(): string {
  const dir = path.resolve(env.LOCAL_UPLOAD_DIR);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Cloudinary-backed image storage service (Architecture §8).
 *
 * Production driver (`STORAGE_DRIVER=cloudinary`): uploads the validated
 * buffer to Cloudinary and returns the secure URL + public id. The API
 * secret is read from server-side environment variables only.
 *
 * The `local` driver keeps the exact same metadata contract for development
 * and demo machines without Cloudinary credentials; binaries stay on disk
 * and are served by the asset route.
 */
export async function storeImage(
  buffer: Buffer,
  mimeType: string,
  folder: "creatives" | "brand",
): Promise<StoredImage> {
  if (buffer.length > env.maxUploadBytes) {
    throw new ApiError(400, "FILE_TOO_LARGE", "That image is larger than the allowed size.");
  }

  if (env.STORAGE_DRIVER === "cloudinary") {
    const publicId = `preview-lab/${folder}/${crypto.randomUUID()}`;
    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { public_id: publicId, resource_type: "image" },
          (error, res) => {
            if (error || !res) {
              reject(
                new ApiError(
                  502,
                  "STORAGE_FAILED",
                  "The image could not be stored. Please try again.",
                ),
              );
              return;
            }
            resolve({ secure_url: res.secure_url, public_id: res.public_id });
          },
        );
        stream.end(buffer);
      },
    );
    return {
      provider: "cloudinary",
      publicId: result.public_id,
      url: result.secure_url,
      fileName: result.public_id,
      bytes: buffer.length,
    };
  }

  // Local driver (development/demo): identical metadata contract.
  const ext = mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg";
  const id = crypto.randomUUID();
  const fileName = `${id}${ext}`;
  fs.writeFileSync(path.join(localUploadDir(), fileName), buffer);
  return {
    provider: "local",
    publicId: fileName,
    url: `/api/assets/${id}`, // served by the asset route
    fileName,
    bytes: buffer.length,
  };
}

/** Deletes a stored binary (Cloudinary destroy / local unlink). Best effort. */
export async function deleteImage(asset: {
  provider: string;
  publicId: string;
  fileName: string;
}): Promise<void> {
  try {
    if (asset.provider === "cloudinary") {
      await cloudinary.uploader.destroy(asset.publicId);
    } else {
      fs.rmSync(path.join(localUploadDir(), asset.fileName), { force: true });
    }
  } catch (err) {
    console.warn("[storage] delete failed (ignored):", err);
  }
}

/** Reads a locally stored image for the asset route (local driver only). */
export function readLocalImage(fileName: string): Buffer | null {
  try {
    return fs.readFileSync(path.join(localUploadDir(), fileName));
  } catch {
    return null;
  }
}
