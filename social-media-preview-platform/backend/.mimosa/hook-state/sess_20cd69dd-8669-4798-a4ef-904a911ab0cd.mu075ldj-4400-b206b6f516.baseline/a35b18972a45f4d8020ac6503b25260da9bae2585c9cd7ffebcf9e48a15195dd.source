import mongoose, { Schema } from "mongoose";

export interface SessionDoc {
  _id: mongoose.Types.ObjectId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
}

const sessionSchema = new Schema<SessionDoc>(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true, default: () => new Date() },
  },
  { versionKey: false },
);

export const Session = mongoose.model<SessionDoc>("Session", sessionSchema);
