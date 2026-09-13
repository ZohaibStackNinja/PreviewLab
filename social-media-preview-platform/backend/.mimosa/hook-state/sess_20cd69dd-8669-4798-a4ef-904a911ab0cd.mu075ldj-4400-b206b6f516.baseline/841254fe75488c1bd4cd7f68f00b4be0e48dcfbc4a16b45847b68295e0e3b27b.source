import express, { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { buildApiRouter } from "./routes/index.routes";
import { errorHandler, ApiError } from "./middleware/error.middleware";

/**
 * Express application factory (Architecture §11.2 middleware order):
 * security headers → CORS (frontend origin only, credentials) → cookies →
 * body parsing → API routes → 404 → error handler.
 */
export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin/no-origin (curl, health checks) and the
        // configured frontend origins only.
        if (!origin || env.allowedOrigins.includes(origin.replace(/\/$/, ""))) {
          cb(null, true);
          return;
        }
        cb(new ApiError(403, "FORBIDDEN_ORIGIN", "Origin not allowed by CORS."));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.use("/api", buildApiRouter());

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      data: null,
      error: { code: "NOT_FOUND", message: "Not found." },
    });
  });

  app.use(errorHandler);
  return app;
}
