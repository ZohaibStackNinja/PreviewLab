import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";

/**
 * Cloudinary configuration (Architecture §8): image binaries live in
 * Cloudinary; MongoDB stores metadata and the resulting secure URL /
 * public ID. The API secret is read from server-side environment variables
 * only and is never exposed to the frontend.
 */
export function configureCloudinary(): void {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export { cloudinary };
