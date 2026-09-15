process.env.NODE_ENV = "test";
process.env.PORT = process.env.PORT || "4000";
process.env.ORIGIN = process.env.ORIGIN || "http://localhost:3000";
process.env.STORAGE_DRIVER = "local";
process.env.LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || "./data/e2e-uploads";
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "e2e-session-secret-0123456789";
process.env.SHARE_TOKEN_SECRET = process.env.SHARE_TOKEN_SECRET || "e2e-share-secret-0123456789";
process.env.COOKIE_SECURE = "false";
process.env.COOKIE_SAMESITE = "lax";

async function main(): Promise<void> {
  const dotenv = await import("dotenv");
  dotenv.config();

  let mongod: any = null;
  if (!process.env.MONGODB_URI) {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri("preview-lab-e2e");
  }

  const [{ createApp }, { connectDatabase, disconnectDatabase }] = await Promise.all([
    import("../src/app.js"),
    import("../src/config/database.js"),
  ]);
  const { configureCloudinary } = await import("../src/config/cloudinary.js");

  configureCloudinary();
  await connectDatabase();
  const server = createApp().listen(Number(process.env.PORT), () => {
    console.log(`[e2e-api] listening on http://localhost:${process.env.PORT}`);
  });

  const shutdown = async () => {
    server.close();
    await disconnectDatabase();
    if (mongod) await mongod.stop();
  };
  process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
  process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));
}

main().catch((error) => {
  console.error("[e2e-api] failed to start:", error);
  process.exit(1);
});
