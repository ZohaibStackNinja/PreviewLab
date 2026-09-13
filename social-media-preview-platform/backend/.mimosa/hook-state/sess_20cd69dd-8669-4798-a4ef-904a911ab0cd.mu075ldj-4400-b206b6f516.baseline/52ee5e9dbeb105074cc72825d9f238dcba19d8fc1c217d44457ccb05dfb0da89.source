import mongoose from "mongoose";
import { env } from "./env";

/**
 * MongoDB (Atlas or local) connection. The connection is established once at
 * startup; services use Mongoose models only — never raw connections.
 */
export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  if (!env.isTest) {
    console.log(`[db] connected to ${uri.replace(/:\/\/[^@]*@/, "://***@")}`);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
