import { createApp } from "./app";
import { env } from "./config/env";
import { connectDatabase } from "./config/database";
import { configureCloudinary } from "./config/cloudinary";

async function main(): Promise<void> {
  configureCloudinary();
  await connectDatabase();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`[api] Preview Lab API listening on http://localhost:${env.PORT}`);
    console.log(`[api] CORS origins: ${env.allowedOrigins.join(", ")}`);
    console.log(`[api] storage driver: ${env.STORAGE_DRIVER}`);
  });
}

main().catch((err) => {
  console.error("[api] failed to start:", err);
  process.exit(1);
});
