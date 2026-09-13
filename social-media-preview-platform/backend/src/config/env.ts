import dotenv from "dotenv";
import { z } from "zod";

// Environment configuration (Development Document §3: credentials live in
// environment variables only — never in source or the frontend bundle).
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  /** Allowed frontend origin(s) for CORS, comma separated. */
  ORIGIN: z.string().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  SESSION_SECRET: z.string().min(8).default("preview-lab-dev-session-secret"),
  SHARE_TOKEN_SECRET: z.string().min(8).default("preview-lab-dev-share-secret"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  /** Image storage driver: "cloudinary" (production) or "local" (dev/demo). */
  STORAGE_DRIVER: z.enum(["cloudinary", "local"]).default("cloudinary"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  LOCAL_UPLOAD_DIR: z.string().default("./data/uploads"),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false"),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast with a readable message instead of a confusing runtime error.
  console.error("Invalid backend environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  process.exit(1);
}

function assertCloudinaryEnv(driver: string, env: z.infer<typeof envSchema>): void {
  if (driver !== "cloudinary") return;
  const missing = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].filter(
    (k) => !env[k as keyof typeof env],
  );
  if (missing.length > 0) {
    console.error(
      `STORAGE_DRIVER=cloudinary requires ${missing.join(", ")}. ` +
        `Set them or use STORAGE_DRIVER=local for development.`,
    );
    process.exit(1);
  }
}

assertCloudinaryEnv(parsed.data.STORAGE_DRIVER, parsed.data);

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === "production",
  isTest: parsed.data.NODE_ENV === "test",
  /** Origins allowed by CORS. */
  allowedOrigins: parsed.data.ORIGIN.split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean),
  maxUploadBytes: parsed.data.MAX_UPLOAD_MB * 1024 * 1024,
};
